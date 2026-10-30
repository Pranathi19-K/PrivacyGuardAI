import crypto from 'crypto';
import { DetectedEntity, EntityCategory } from './detector.service.ts';

export type MaskingStrategy =
  | 'REDACT'
  | 'CATEGORY_TAG'
  | 'PARTIAL_MASK'
  | 'SYNTHETIC'
  | 'CRYPTOGRAPHIC_HASH';

export interface MaskingConfig {
  globalStrategy: MaskingStrategy;
  categoryOverrides?: Partial<Record<EntityCategory, MaskingStrategy>>;
  customSalt?: string;
  redactionSymbol?: string; // Default: 'REDACTED'
  preserveFormatting?: boolean;
}

const SYNTHETIC_NAMES = ['Alex Mercer', 'Jordan Vance', 'Taylor Morgan', 'Casey Bennett', 'Morgan Reed'];
const SYNTHETIC_EMAILS = ['user.protected@privacy-domain.org', 'compliance.secure@example.net', 'anonymized.actor@safe-data.io'];
const SYNTHETIC_PHONES = ['+1 (555) 019-8234', '+1 (555) 014-9921', '+1 (555) 018-7742'];
const SYNTHETIC_ADDRESSES = ['100 Privacy Way, Suite 400, Austin, TX 78701', '404 Encrypted Blvd, Seattle, WA 98101'];

export class DeterministicMasker {
  /**
   * Masks text according to detected entities and chosen strategy configuration
   */
  public static mask(
    originalText: string,
    entities: DetectedEntity[],
    config: MaskingConfig
  ): {
    maskedText: string;
    transformationMap: Array<{
      id: string;
      category: EntityCategory;
      originalSnippet: string;
      maskedSnippet: string;
      strategyApplied: MaskingStrategy;
    }>;
  } {
    if (!originalText) {
      return { maskedText: '', transformationMap: [] };
    }

    if (!entities || entities.length === 0) {
      return { maskedText: originalText, transformationMap: [] };
    }

    // Sort entities from end of text to beginning so indices remain stable during substring replacement
    const sortedEntities = [...entities].sort((a, b) => b.startIndex - a.startIndex);
    let result = originalText;
    const transformationMap: Array<{
      id: string;
      category: EntityCategory;
      originalSnippet: string;
      maskedSnippet: string;
      strategyApplied: MaskingStrategy;
    }> = [];

    const salt = config.customSalt || 'PRIVYSHIELD_STABLE_SALT_2026';

    for (const entity of sortedEntities) {
      const strategy: MaskingStrategy =
        config.categoryOverrides?.[entity.category] || config.globalStrategy || 'CATEGORY_TAG';

      const actualSnippet = originalText.substring(entity.startIndex, entity.endIndex);

      const maskedReplacement = this.generateReplacement(
        actualSnippet,
        entity.category,
        strategy,
        salt,
        config.redactionSymbol
      );

      // Splice replacement into string
      result =
        result.substring(0, entity.startIndex) +
        maskedReplacement +
        result.substring(entity.endIndex);

      transformationMap.unshift({
        id: entity.id,
        category: entity.category,
        originalSnippet: actualSnippet,
        maskedSnippet: maskedReplacement,
        strategyApplied: strategy,
      });
    }

    return {
      maskedText: result,
      transformationMap,
    };
  }

  private static generateReplacement(
    val: string,
    category: EntityCategory,
    strategy: MaskingStrategy,
    salt: string,
    redactionSymbol: string = 'REDACTED'
  ): string {
    switch (strategy) {
      case 'REDACT':
        return `[${redactionSymbol}]`;

      case 'CATEGORY_TAG':
        return `<${category}>`;

      case 'PARTIAL_MASK':
        return this.partialMask(val, category);

      case 'SYNTHETIC':
        return this.syntheticReplace(val, category);

      case 'CRYPTOGRAPHIC_HASH': {
        const hash = crypto
          .createHmac('sha256', salt)
          .update(val)
          .digest('hex')
          .substring(0, 10);
        return `[HASH:${hash}]`;
      }

      default:
        return `<${category}>`;
    }
  }

  private static partialMask(val: string, category: EntityCategory): string {
    switch (category) {
      case 'EMAIL': {
        const parts = val.split('@');
        if (parts.length === 2) {
          const name = parts[0];
          const domain = parts[1];
          const maskedName =
            name.length <= 2
              ? `${name[0]}*`
              : `${name[0]}${'*'.repeat(Math.max(name.length - 2, 2))}${name[name.length - 1]}`;
          return `${maskedName}@${domain}`;
        }
        return `${val.substring(0, 2)}****`;
      }

      case 'PHONE': {
        const clean = val.replace(/\D/g, '');
        if (clean.length >= 4) {
          const last4 = clean.slice(-4);
          return `(***) ***-${last4}`;
        }
        return '***-***-****';
      }

      case 'CREDIT_CARD': {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) {
          const last4 = digits.slice(-4);
          return `•••• •••• •••• ${last4}`;
        }
        return '•••• •••• •••• ••••';
      }

      case 'SSN_NATIONAL_ID': {
        const clean = val.replace(/\D/g, '');
        if (clean.length >= 4) {
          return `***-**-${clean.slice(-4)}`;
        }
        return '***-**-****';
      }

      case 'IP_ADDRESS': {
        const octets = val.split('.');
        if (octets.length === 4) {
          return `${octets[0]}.${octets[1]}.***.***`;
        }
        return '***.***.***.***';
      }

      case 'API_KEY_SECRET': {
        if (val.length > 8) {
          return `${val.substring(0, 4)}••••••••${val.slice(-4)}`;
        }
        return '••••••••••••';
      }

      case 'PERSON_NAME': {
        const words = val.split(/\s+/);
        return words
          .map((w) => (w.length > 1 ? `${w[0]}${'*'.repeat(w.length - 1)}` : '*'))
          .join(' ');
      }

      case 'DATE_OF_BIRTH':
        return '**/**/****';

      case 'PHYSICAL_ADDRESS': {
        return '[PROTECTED_LOCATION]';
      }

      default:
        return '••••••••';
    }
  }

  private static syntheticReplace(val: string, category: EntityCategory): string {
    // Generate deterministic index based on value
    const hashNum = val
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    switch (category) {
      case 'PERSON_NAME':
        return SYNTHETIC_NAMES[hashNum % SYNTHETIC_NAMES.length];
      case 'EMAIL':
        return SYNTHETIC_EMAILS[hashNum % SYNTHETIC_EMAILS.length];
      case 'PHONE':
        return SYNTHETIC_PHONES[hashNum % SYNTHETIC_PHONES.length];
      case 'CREDIT_CARD':
        return '4000 1234 5678 9010';
      case 'PHYSICAL_ADDRESS':
        return SYNTHETIC_ADDRESSES[hashNum % SYNTHETIC_ADDRESSES.length];
      case 'SSN_NATIONAL_ID':
        return '999-00-1234';
      case 'IP_ADDRESS':
        return '198.51.100.42'; // RFC 5737 TEST-NET-2 documentation IP
      case 'DATE_OF_BIRTH':
        return '01/01/1990';
      case 'API_KEY_SECRET':
        return 'sk_synthetic_test_token_not_real_key_000000000';
      default:
        return `<SYNTHETIC_${category}>`;
    }
  }
}
