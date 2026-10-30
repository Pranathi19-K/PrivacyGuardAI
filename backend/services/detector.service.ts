export type EntityCategory =
  | 'EMAIL'
  | 'PHONE'
  | 'SSN_NATIONAL_ID'
  | 'CREDIT_CARD'
  | 'IP_ADDRESS'
  | 'API_KEY_SECRET'
  | 'DATE_OF_BIRTH'
  | 'PERSON_NAME'
  | 'PHYSICAL_ADDRESS';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DetectedEntity {
  id: string;
  category: EntityCategory;
  categoryLabel: string;
  originalValue: string;
  startIndex: number;
  endIndex: number;
  confidence: number; // 0.0 - 1.0
  severity: SeverityLevel;
  ruleTriggered: string;
}

export interface DetectorOptions {
  enabledCategories?: EntityCategory[];
  minConfidence?: number;
}

// Luhn algorithm for credit card checksum verification
export function isValidLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export const CATEGORY_METADATA: Record<
  EntityCategory,
  { label: string; severity: SeverityLevel; defaultStrategy: string; description: string }
> = {
  EMAIL: {
    label: 'Email Address',
    severity: 'medium',
    defaultStrategy: 'CATEGORY_TAG',
    description: 'Personal or organizational email identifiers.',
  },
  PHONE: {
    label: 'Phone Number',
    severity: 'medium',
    defaultStrategy: 'CATEGORY_TAG',
    description: 'International, mobile, and landline telephone numbers.',
  },
  SSN_NATIONAL_ID: {
    label: 'SSN / National ID',
    severity: 'critical',
    defaultStrategy: 'CATEGORY_TAG',
    description: 'Government-issued identification numbers (SSN, Aadhaar, NIN, SIN).',
  },
  CREDIT_CARD: {
    label: 'Payment Card / IBAN',
    severity: 'critical',
    defaultStrategy: 'CATEGORY_TAG',
    description: 'Credit/debit card numbers verified via Luhn check or standard format.',
  },
  IP_ADDRESS: {
    label: 'IP Address',
    severity: 'low',
    defaultStrategy: 'CATEGORY_TAG',
    description: 'IPv4 and IPv6 network identifiers.',
  },
  API_KEY_SECRET: {
    label: 'API Key / Secret Token',
    severity: 'critical',
    defaultStrategy: 'REDACT',
    description: 'Bearer tokens, AWS keys, JWTs, private keys, and high-entropy credentials.',
  },
  DATE_OF_BIRTH: {
    label: 'Date of Birth',
    severity: 'high',
    defaultStrategy: 'CATEGORY_TAG',
    description: 'Birth dates associated with sensitive personal or medical records.',
  },
  PERSON_NAME: {
    label: 'Person Name',
    severity: 'medium',
    defaultStrategy: 'SYNTHETIC',
    description: 'Full human names identified via prefixes, markers, and syntactic heuristics.',
  },
  PHYSICAL_ADDRESS: {
    label: 'Physical Address',
    severity: 'medium',
    defaultStrategy: 'CATEGORY_TAG',
    description: 'Street numbers, avenues, cities, and postal ZIP codes.',
  },
};

export class DeterministicDetector {
  /**
   * Scans raw text and identifies sensitive entities with exact character offsets
   */
  public static detect(text: string, options: DetectorOptions = {}): DetectedEntity[] {
    if (!text || typeof text !== 'string') return [];

    const enabled = options.enabledCategories || (Object.keys(CATEGORY_METADATA) as EntityCategory[]);
    const rawEntities: DetectedEntity[] = [];
    let counter = 0;

    // =========================================================================
    // 1. API Keys & Secrets (High Priority)
    // =========================================================================
    if (enabled.includes('API_KEY_SECRET')) {
      // AWS Access Key ID
      const awsRegex = /\b(AKIA[0-9A-Z]{16})\b/g;
      let match: RegExpExecArray | null;
      while ((match = awsRegex.exec(text)) !== null) {
        rawEntities.push({
          id: `ent-${++counter}`,
          category: 'API_KEY_SECRET',
          categoryLabel: CATEGORY_METADATA.API_KEY_SECRET.label,
          originalValue: match[1],
          startIndex: match.index,
          endIndex: match.index + match[1].length,
          confidence: 0.99,
          severity: 'critical',
          ruleTriggered: 'AWS_ACCESS_KEY',
        });
      }

      // JWT Bearer Token
      const jwtRegex = /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g;
      while ((match = jwtRegex.exec(text)) !== null) {
        rawEntities.push({
          id: `ent-${++counter}`,
          category: 'API_KEY_SECRET',
          categoryLabel: CATEGORY_METADATA.API_KEY_SECRET.label,
          originalValue: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.98,
          severity: 'critical',
          ruleTriggered: 'JWT_BEARER_TOKEN',
        });
      }

      // Key-Value Secret Headers containing sensitive credentials
      const keyRegex = /\b(?:api[_-]?key|secret|token|auth_token|access_token|password)[\s:=]+["']?([a-zA-Z0-9_.~-]{16,64})["']?/gi;
      while ((match = keyRegex.exec(text)) !== null) {
        if (match[1]) {
          const valStart = match.index + match[0].indexOf(match[1]);
          rawEntities.push({
            id: `ent-${++counter}`,
            category: 'API_KEY_SECRET',
            categoryLabel: CATEGORY_METADATA.API_KEY_SECRET.label,
            originalValue: match[1],
            startIndex: valStart,
            endIndex: valStart + match[1].length,
            confidence: 0.95,
            severity: 'critical',
            ruleTriggered: 'KEY_VALUE_SECRET',
          });
        }
      }
    }

    // =========================================================================
    // 2. Payment Cards (Detected BEFORE Aadhaar to prevent 16-digit card truncation!)
    // =========================================================================
    if (enabled.includes('CREDIT_CARD')) {
      // Formatted 16-digit cards (Visa, Mastercard, Discover): 4 groups of 4 digits
      const cc16Regex = /\b(\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4})\b(?![ -]?\d)/g;
      let match: RegExpExecArray | null;
      while ((match = cc16Regex.exec(text)) !== null) {
        const val = match[1];
        rawEntities.push({
          id: `ent-${++counter}`,
          category: 'CREDIT_CARD',
          categoryLabel: CATEGORY_METADATA.CREDIT_CARD.label,
          originalValue: val,
          startIndex: match.index,
          endIndex: match.index + val.length,
          confidence: 0.96,
          severity: 'critical',
          ruleTriggered: 'FORMATTED_16DIGIT_CARD',
        });
      }

      // Amex 15-digit card formatted (4-6-5): e.g. 3782 822463 10005
      const amexRegex = /\b(3[47]\d{2}[ -]\d{6}[ -]\d{5})\b(?![ -]?\d)/g;
      while ((match = amexRegex.exec(text)) !== null) {
        const val = match[1];
        rawEntities.push({
          id: `ent-${++counter}`,
          category: 'CREDIT_CARD',
          categoryLabel: CATEGORY_METADATA.CREDIT_CARD.label,
          originalValue: val,
          startIndex: match.index,
          endIndex: match.index + val.length,
          confidence: 0.96,
          severity: 'critical',
          ruleTriggered: 'FORMATTED_AMEX_CARD',
        });
      }

      // Labeled card patterns e.g. Card: 4532892019284242 or Card Number: 4000 1234 5678 9010
      const labeledCardRegex = /\b(?:Card(?:\s+(?:Number|No\.?|#))?|Credit\s+Card|Debit(?:\s+Card)?|Payment\s+Card|CC)[:\s#-]*((?:\d[ -]*?){13,19})\b(?![ -]?\d)/gi;
      while ((match = labeledCardRegex.exec(text)) !== null) {
        if (match[1]) {
          const cardVal = match[1].trim();
          const digitsOnly = cardVal.replace(/\D/g, '');
          if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
            const valStart = match.index + match[0].indexOf(cardVal);
            rawEntities.push({
              id: `ent-${++counter}`,
              category: 'CREDIT_CARD',
              categoryLabel: CATEGORY_METADATA.CREDIT_CARD.label,
              originalValue: cardVal,
              startIndex: valStart,
              endIndex: valStart + cardVal.length,
              confidence: 0.98,
              severity: 'critical',
              ruleTriggered: 'LABELED_PAYMENT_CARD',
            });
          }
        }
      }

      // Unlabeled continuous 13-19 digits that pass Luhn check
      const luhnRegex = /\b\d{13,19}\b/g;
      while ((match = luhnRegex.exec(text)) !== null) {
        const digits = match[0];
        if (isValidLuhn(digits)) {
          rawEntities.push({
            id: `ent-${++counter}`,
            category: 'CREDIT_CARD',
            categoryLabel: CATEGORY_METADATA.CREDIT_CARD.label,
            originalValue: digits,
            startIndex: match.index,
            endIndex: match.index + digits.length,
            confidence: 0.99,
            severity: 'critical',
            ruleTriggered: 'LUHN_VALIDATED_CARD',
          });
        }
      }
    }

    // =========================================================================
    // 3. SSN and National Identifiers
    // =========================================================================
    if (enabled.includes('SSN_NATIONAL_ID')) {
      // US SSN: formatted with hyphens or spaces (e.g. 123-45-6789 or test 921-48-2910)
      // Captures all 9-digit formatted SSNs without excluding 9xx so test cases and all PII are fully masked
      const ssnFormattedRegex = /\b(\d{3}[- ]\d{2}[- ]\d{4})\b(?![ -]?\d)/g;
      let match: RegExpExecArray | null;
      while ((match = ssnFormattedRegex.exec(text)) !== null) {
        const val = match[1];
        rawEntities.push({
          id: `ent-${++counter}`,
          category: 'SSN_NATIONAL_ID',
          categoryLabel: CATEGORY_METADATA.SSN_NATIONAL_ID.label,
          originalValue: val,
          startIndex: match.index,
          endIndex: match.index + val.length,
          confidence: 0.96,
          severity: 'critical',
          ruleTriggered: 'FORMATTED_US_SSN',
        });
      }

      // Labeled SSN / National ID (with or without hyphens, e.g. SSN: 921482910 or Social Security: 123456789)
      const labeledSsnRegex = /\b(?:SSN|Social\s+Security(?:\s+(?:Number|No\.?))?|National\s+ID)[:\s#-]*(\d{3}[- ]?\d{2}[- ]?\d{4}|\d{9})\b(?![ -]?\d)/gi;
      while ((match = labeledSsnRegex.exec(text)) !== null) {
        if (match[1]) {
          const ssnVal = match[1].trim();
          const valStart = match.index + match[0].indexOf(ssnVal);
          rawEntities.push({
            id: `ent-${++counter}`,
            category: 'SSN_NATIONAL_ID',
            categoryLabel: CATEGORY_METADATA.SSN_NATIONAL_ID.label,
            originalValue: ssnVal,
            startIndex: valStart,
            endIndex: valStart + ssnVal.length,
            confidence: 0.98,
            severity: 'critical',
            ruleTriggered: 'LABELED_US_SSN',
          });
        }
      }

      // Indian Aadhaar: strictly 12 digits (3 blocks of 4).
      // CRITICAL: Must NOT be followed by a 4th block of digits (which would be a 16-digit credit card!)
      const aadhaarRegex = /\b([2-9]\d{3}[ -]\d{4}[ -]\d{4})\b(?![ -]?\d)/g;
      while ((match = aadhaarRegex.exec(text)) !== null) {
        const val = match[1];
        rawEntities.push({
          id: `ent-${++counter}`,
          category: 'SSN_NATIONAL_ID',
          categoryLabel: CATEGORY_METADATA.SSN_NATIONAL_ID.label,
          originalValue: val,
          startIndex: match.index,
          endIndex: match.index + val.length,
          confidence: 0.90,
          severity: 'critical',
          ruleTriggered: 'AADHAAR_ID_PATTERN',
        });
      }

      // Canadian Social Insurance Number (SIN): 3 groups of 3 digits
      const sinRegex = /\b(\d{3}[- ]\d{3}[- ]\d{3})\b(?![ -]?\d)/g;
      while ((match = sinRegex.exec(text)) !== null) {
        const val = match[1];
        rawEntities.push({
          id: `ent-${++counter}`,
          category: 'SSN_NATIONAL_ID',
          categoryLabel: CATEGORY_METADATA.SSN_NATIONAL_ID.label,
          originalValue: val,
          startIndex: match.index,
          endIndex: match.index + val.length,
          confidence: 0.92,
          severity: 'critical',
          ruleTriggered: 'CANADIAN_SIN_PATTERN',
        });
      }

      // UK National Insurance Number (NINO)
      const ukNinoRegex = /\b([A-CEGHJ-PR-TW-Z]{2}\s*\d{2}\s*\d{2}\s*\d{2}\s*[A-D])\b/gi;
      while ((match = ukNinoRegex.exec(text)) !== null) {
        const val = match[1];
        rawEntities.push({
          id: `ent-${++counter}`,
          category: 'SSN_NATIONAL_ID',
          categoryLabel: CATEGORY_METADATA.SSN_NATIONAL_ID.label,
          originalValue: val,
          startIndex: match.index,
          endIndex: match.index + val.length,
          confidence: 0.94,
          severity: 'critical',
          ruleTriggered: 'UK_NINO_PATTERN',
        });
      }
    }

    // =========================================================================
    // 4. Email Addresses
    // =========================================================================
    if (enabled.includes('EMAIL')) {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
      let match: RegExpExecArray | null;
      while ((match = emailRegex.exec(text)) !== null) {
        rawEntities.push({
          id: `ent-${++counter}`,
          category: 'EMAIL',
          categoryLabel: CATEGORY_METADATA.EMAIL.label,
          originalValue: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.99,
          severity: 'medium',
          ruleTriggered: 'RFC5322_EMAIL_PATTERN',
        });
      }
    }

    // =========================================================================
    // 5. Phone Numbers
    // =========================================================================
    if (enabled.includes('PHONE')) {
      // Standard telephone formats: e.g. (415) 555-8921, +1-512-555-0144, 415-555-8921
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;
      let match: RegExpExecArray | null;
      while ((match = phoneRegex.exec(text)) !== null) {
        const val = match[0].trim();
        const digitCount = val.replace(/\D/g, '').length;
        // Limit digit count between 10 and 15 so we don't accidentally match 16-digit credit cards or short IDs
        if (digitCount >= 10 && digitCount <= 15) {
          rawEntities.push({
            id: `ent-${++counter}`,
            category: 'PHONE',
            categoryLabel: CATEGORY_METADATA.PHONE.label,
            originalValue: val,
            startIndex: match.index,
            endIndex: match.index + val.length,
            confidence: 0.92,
            severity: 'medium',
            ruleTriggered: 'TELEPHONE_PATTERN',
          });
        }
      }

      // Labeled phone: Phone: +1 415 555 8921
      const labeledPhoneRegex = /\b(?:Phone|Tel|Telephone|Mobile|Cell|Direct\s+Line|Contact(?:\s+Number|\s+Phone)?)[:\s#-]*(\+?\d{1,3}[-.\s]?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4})\b/gi;
      while ((match = labeledPhoneRegex.exec(text)) !== null) {
        if (match[1]) {
          const phoneVal = match[1].trim();
          const digitCount = phoneVal.replace(/\D/g, '').length;
          if (digitCount >= 7 && digitCount <= 15) {
            const valStart = match.index + match[0].indexOf(phoneVal);
            rawEntities.push({
              id: `ent-${++counter}`,
              category: 'PHONE',
              categoryLabel: CATEGORY_METADATA.PHONE.label,
              originalValue: phoneVal,
              startIndex: valStart,
              endIndex: valStart + phoneVal.length,
              confidence: 0.95,
              severity: 'medium',
              ruleTriggered: 'LABELED_TELEPHONE',
            });
          }
        }
      }
    }

    // =========================================================================
    // 6. Dates of Birth (DOB)
    // =========================================================================
    if (enabled.includes('DATE_OF_BIRTH')) {
      // Labeled DOB: DOB: 04/18/1979, Date of Birth: 1979-04-18, Born: 4/18/1979
      const dobRegex = /\b(?:DOB|Date\s+of\s+Birth|Birth\s+Date|Born|Birthdate)[:\s]+((?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])[-/.](?:19|20)\d{2}|(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])|(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:19|20)\d{2})\b/gi;
      let match: RegExpExecArray | null;
      while ((match = dobRegex.exec(text)) !== null) {
        if (match[1]) {
          const valStart = match.index + match[0].indexOf(match[1]);
          rawEntities.push({
            id: `ent-${++counter}`,
            category: 'DATE_OF_BIRTH',
            categoryLabel: CATEGORY_METADATA.DATE_OF_BIRTH.label,
            originalValue: match[1],
            startIndex: valStart,
            endIndex: valStart + match[1].length,
            confidence: 0.96,
            severity: 'high',
            ruleTriggered: 'DOB_PREFIX_CONTEXT',
          });
        }
      }
    }

    // =========================================================================
    // 7. Person Names (Contextual + Honorifics)
    // =========================================================================
    if (enabled.includes('PERSON_NAME')) {
      // Honorifics: Dr./Mr./Mrs./Ms./Prof. Firstname Lastname
      const titleNameRegex = /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Judge|Hon\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g;
      let match: RegExpExecArray | null;
      while ((match = titleNameRegex.exec(text)) !== null) {
        const full = match[0];
        rawEntities.push({
          id: `ent-${++counter}`,
          category: 'PERSON_NAME',
          categoryLabel: CATEGORY_METADATA.PERSON_NAME.label,
          originalValue: full,
          startIndex: match.index,
          endIndex: match.index + full.length,
          confidence: 0.92,
          severity: 'medium',
          ruleTriggered: 'HONORIFIC_PERSON_NAME',
        });
      }

      // Labeled Person Names: e.g. Patient Intake: Jonathan Davis, Patient: Jane Doe, Customer: Robert Taylor
      const labelNameRegex = /\b(?:Patient(?:\s+Intake|\s+Name)?|Customer(?:\s+Name)?|Client(?:\s+Name)?|User(?:\s+Name)?|Employee(?:\s+Name)?|Physician|Doctor|Cardholder(?:\s+Name)?|Name|Full\s+Name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;
      while ((match = labelNameRegex.exec(text)) !== null) {
        if (match[1]) {
          const val = match[1].trim();
          const valStart = match.index + match[0].indexOf(val);
          rawEntities.push({
            id: `ent-${++counter}`,
            category: 'PERSON_NAME',
            categoryLabel: CATEGORY_METADATA.PERSON_NAME.label,
            originalValue: val,
            startIndex: valStart,
            endIndex: valStart + val.length,
            confidence: 0.90,
            severity: 'medium',
            ruleTriggered: 'LABELED_PERSON_NAME',
          });
        }
      }
    }

    // =========================================================================
    // 8. IP Addresses (IPv4 and IPv6)
    // =========================================================================
    if (enabled.includes('IP_ADDRESS')) {
      const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
      let match: RegExpExecArray | null;
      while ((match = ipv4Regex.exec(text)) !== null) {
        rawEntities.push({
          id: `ent-${++counter}`,
          category: 'IP_ADDRESS',
          categoryLabel: CATEGORY_METADATA.IP_ADDRESS.label,
          originalValue: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.95,
          severity: 'low',
          ruleTriggered: 'IPV4_ADDRESS',
        });
      }
    }

    // =========================================================================
    // 9. Physical Street Addresses
    // =========================================================================
    if (enabled.includes('PHYSICAL_ADDRESS')) {
      const addressRegex = /\b\d{1,5}\s+[A-Z][a-z0-9\s.,]{3,35}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Way|Terrace|Ter|Parkway|Pkwy|Circle|Cir|Place|Pl|Suite|Ste|Apt|Apartment)\b(?:\s*,?\s*[A-Z][a-z]+)?(?:\s*,?\s*[A-Z]{2}\s+\d{5})?/gi;
      let match: RegExpExecArray | null;
      while ((match = addressRegex.exec(text)) !== null) {
        rawEntities.push({
          id: `ent-${++counter}`,
          category: 'PHYSICAL_ADDRESS',
          categoryLabel: CATEGORY_METADATA.PHYSICAL_ADDRESS.label,
          originalValue: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.88,
          severity: 'medium',
          ruleTriggered: 'STREET_ADDRESS_SYNTAX',
        });
      }
    }

    // =========================================================================
    // Resolve Overlapping and Adjacent Entity Spans
    // =========================================================================
    return this.resolveOverlaps(rawEntities);
  }

  /**
   * Sorts entities and deterministically eliminates overlapping collisions,
   * prioritizing longer spans, critical severity, and preventing orphan digits.
   */
  public static resolveOverlaps(entities: DetectedEntity[]): DetectedEntity[] {
    if (entities.length <= 1) return entities;

    const severityRank: Record<SeverityLevel, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    // Sort:
    // 1. Start index ascending
    // 2. Length descending (longer match takes precedence)
    // 3. Severity rank descending (critical takes precedence)
    // 4. Confidence descending
    entities.sort((a, b) => {
      if (a.startIndex !== b.startIndex) {
        return a.startIndex - b.startIndex;
      }
      const lenA = a.endIndex - a.startIndex;
      const lenB = b.endIndex - b.startIndex;
      if (lenA !== lenB) {
        return lenB - lenA; // longer first
      }
      const sevA = severityRank[a.severity] || 0;
      const sevB = severityRank[b.severity] || 0;
      if (sevA !== sevB) {
        return sevB - sevA; // higher severity first
      }
      return b.confidence - a.confidence;
    });

    const nonOverlapping: DetectedEntity[] = [];

    for (const ent of entities) {
      if (nonOverlapping.length === 0) {
        nonOverlapping.push(ent);
        continue;
      }

      const prev = nonOverlapping[nonOverlapping.length - 1];

      // Case 1: No overlap at all (strictly after previous entity)
      if (ent.startIndex >= prev.endIndex) {
        nonOverlapping.push(ent);
        continue;
      }

      // Case 2: Complete enclosure (ent is completely inside prev)
      if (ent.startIndex >= prev.startIndex && ent.endIndex <= prev.endIndex) {
        // prev already covers this entire region!
        // If ent is critical and prev is not, upgrade prev's category and label
        if (severityRank[ent.severity] > severityRank[prev.severity]) {
          prev.category = ent.category;
          prev.categoryLabel = ent.categoryLabel;
          prev.severity = ent.severity;
          prev.ruleTriggered = ent.ruleTriggered;
        }
        continue;
      }

      // Case 3: prev is completely inside ent (ent is strictly larger than prev)
      if (ent.startIndex <= prev.startIndex && ent.endIndex >= prev.endIndex) {
        // ent strictly covers all of prev plus more!
        nonOverlapping[nonOverlapping.length - 1] = ent;
        continue;
      }

      // Case 4: Partial overlap (ent.startIndex < prev.endIndex && ent.endIndex > prev.endIndex)
      // Both entities contain sensitive data that crosses a boundary.
      // If either is critical or high, merge the spans to prevent digit leakage!
      if (
        prev.severity === 'critical' ||
        ent.severity === 'critical' ||
        prev.category === ent.category
      ) {
        // Merge into a single overarching entity
        const dominant =
          severityRank[prev.severity] >= severityRank[ent.severity] ? prev : ent;
        prev.startIndex = Math.min(prev.startIndex, ent.startIndex);
        prev.endIndex = Math.max(prev.endIndex, ent.endIndex);
        prev.category = dominant.category;
        prev.categoryLabel = dominant.categoryLabel;
        prev.severity = dominant.severity;
        prev.ruleTriggered = `${prev.ruleTriggered}_MERGED`;
      } else {
        // Keep the one with higher severity or longer span
        const spanPrev = prev.endIndex - prev.startIndex;
        const spanEnt = ent.endIndex - ent.startIndex;
        if (
          severityRank[ent.severity] > severityRank[prev.severity] ||
          (severityRank[ent.severity] === severityRank[prev.severity] && spanEnt > spanPrev)
        ) {
          nonOverlapping[nonOverlapping.length - 1] = ent;
        }
      }
    }

    return nonOverlapping;
  }
}
