import { DeterministicDetector } from '../backend/services/detector.service.ts';
import { DeterministicMasker } from '../backend/services/masker.service.ts';

interface TestCase {
  name: string;
  input: string;
  strategy?: 'CATEGORY_TAG' | 'REDACT' | 'PARTIAL_MASK';
  shouldContain?: string[];
  shouldNotContain?: string[];
  expectedCategories?: string[];
  minDetected?: number;
  maxDetected?: number;
}

const testCases: TestCase[] = [
  // 1. The original problematic user test case
  {
    name: 'Full Clinical Record with 9xx SSN & 16-digit card',
    input: 'Patient Intake: Jonathan Davis, DOB: 04/18/1979, SSN: 921-48-2910, Phone: (415) 555-8921, Email: j.davis79@medical-archive.org, Card: 4532 8920 1928 4242',
    strategy: 'CATEGORY_TAG',
    shouldNotContain: [
      'Jonathan Davis',
      '04/18/1979',
      '921-48-2910',
      '(415) 555-8921',
      'j.davis79@medical-archive.org',
      '4532 8920 1928 4242',
      '4242', // No trailing digits leaked!
    ],
    shouldContain: [
      '<PERSON_NAME>',
      '<DATE_OF_BIRTH>',
      '<SSN_NATIONAL_ID>',
      '<PHONE>',
      '<EMAIL>',
      '<CREDIT_CARD>',
    ],
    expectedCategories: ['PERSON_NAME', 'DATE_OF_BIRTH', 'SSN_NATIONAL_ID', 'PHONE', 'EMAIL', 'CREDIT_CARD'],
  },

  // 2. SSN Formats
  {
    name: 'Formatted Standard SSN',
    input: 'SSN: 123-45-6789 is verified.',
    strategy: 'CATEGORY_TAG',
    shouldNotContain: ['123-45-6789', '6789'],
    shouldContain: ['<SSN_NATIONAL_ID>'],
  },
  {
    name: 'Formatted SSN with Spaces',
    input: 'Number is 987 65 4321 on file.',
    strategy: 'CATEGORY_TAG',
    shouldNotContain: ['987 65 4321', '4321'],
    shouldContain: ['<SSN_NATIONAL_ID>'],
  },
  {
    name: 'Unformatted Labeled SSN',
    input: 'Social Security Number: 921482910 for tax filing.',
    strategy: 'CATEGORY_TAG',
    shouldNotContain: ['921482910'],
    shouldContain: ['<SSN_NATIONAL_ID>'],
  },

  // 3. Payment Card Formats & Overlapping Protection
  {
    name: '16-digit Card (No Aadhaar Truncation)',
    input: 'Charged to Card: 4532 8920 1928 4242 successfully.',
    strategy: 'CATEGORY_TAG',
    shouldNotContain: ['4532 8920 1928 4242', '4242'],
    shouldContain: ['<CREDIT_CARD>'],
    expectedCategories: ['CREDIT_CARD'],
  },
  {
    name: 'Amex 15-digit Card Formatted',
    input: 'Amex card 3782 822463 10005 on file.',
    strategy: 'CATEGORY_TAG',
    shouldNotContain: ['3782 822463 10005', '10005'],
    shouldContain: ['<CREDIT_CARD>'],
  },
  {
    name: 'Indian Aadhaar 12-digit Number',
    input: 'Resident ID: 2345 6789 0123 provided.',
    strategy: 'CATEGORY_TAG',
    shouldNotContain: ['2345 6789 0123'],
    shouldContain: ['<SSN_NATIONAL_ID>'],
  },

  // 4. Contact Info: Emails & Phones
  {
    name: 'Multiple Phone Formats',
    input: 'Call +1 (415) 555-8921 or office +1-512-555-0144.',
    strategy: 'CATEGORY_TAG',
    shouldNotContain: ['(415) 555-8921', '+1-512-555-0144'],
    shouldContain: ['<PHONE>'],
  },
  {
    name: 'Email with Subdomain and Plus Addressing',
    input: 'Send report to alex.mercer+audit@security.enterprise.org today.',
    strategy: 'CATEGORY_TAG',
    shouldNotContain: ['alex.mercer+audit@security.enterprise.org'],
    shouldContain: ['<EMAIL>'],
  },

  // 5. Punctuation & Adjacent Entities
  {
    name: 'Punctuation and Adjacent Separators',
    input: 'Contact: alex@example.com,(415) 555-0199;SSN: 921-48-2910.',
    strategy: 'CATEGORY_TAG',
    shouldNotContain: ['alex@example.com', '(415) 555-0199', '921-48-2910'],
    shouldContain: ['<EMAIL>', '<PHONE>', '<SSN_NATIONAL_ID>'],
  },

  // 6. Solid Redaction & Partial Masking
  {
    name: 'Solid Redaction Strategy',
    input: 'Token: AKIAIOSFODNN7EXAMPLE and SSN: 123-45-6789',
    strategy: 'REDACT',
    shouldNotContain: ['AKIAIOSFODNN7EXAMPLE', '123-45-6789'],
    shouldContain: ['[REDACTED]'],
  },
  {
    name: 'Format-Preserving Partial Mask',
    input: 'Card: 4000 1234 5678 9010, Email: contact@privyshield.io',
    strategy: 'PARTIAL_MASK',
    shouldNotContain: ['contact@privyshield.io', '4000 1234 5678 9010'],
    shouldContain: ['•••• •••• •••• 9010', 'c*****t@privyshield.io'],
  },

  // 7. Negative Test Cases (Non-sensitive data MUST NOT be falsely redacted)
  {
    name: 'Negative: Standard Non-Sensitive Numbers',
    input: 'Invoice #1042 was billed for 5 items totaling $150.00 on page 12 of section 3.',
    strategy: 'CATEGORY_TAG',
    shouldContain: ['Invoice #1042', '$150.00', 'page 12', 'section 3'],
    maxDetected: 0,
  },
  {
    name: 'Negative: Normal English Text without PII',
    input: 'The system operated at ninety-nine percent availability with zero downtime.',
    strategy: 'CATEGORY_TAG',
    shouldContain: ['The system operated at ninety-nine percent availability with zero downtime.'],
    maxDetected: 0,
  },
  {
    name: 'Customer Name false-positive check',
    input: 'Customer Name: Alex Johnson, Email: alex@example.com',
    strategy: 'CATEGORY_TAG',
    shouldContain: ['<PERSON_NAME>', '<EMAIL>'],
    shouldNotContain: ['Alex Johnson'],
    expectedCategories: ['PERSON_NAME', 'EMAIL'],
    minDetected: 2,
    maxDetected: 2,
  },
  {
    name: 'Normal heading false-positive check',
    input: 'Support Record\nClassification',
    strategy: 'CATEGORY_TAG',
    shouldContain: ['Support Record', 'Classification'],
    shouldNotContain: ['<PERSON_NAME>'],
    expectedCategories: [],
    minDetected: 0,
    maxDetected: 0,
  },
];

console.log('================================================================');
console.log('PrivyShield AI – Deterministic Masking Engine Verification Suite');
console.log('================================================================\n');

let passedCount = 0;
let failedCount = 0;

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  const strategy = tc.strategy || 'CATEGORY_TAG';

  const entities = DeterministicDetector.detect(tc.input);
  const { maskedText } = DeterministicMasker.mask(tc.input, entities, {
    globalStrategy: strategy,
  });

  const failures: string[] = [];

  // Check shouldContain
  if (tc.shouldContain) {
    for (const term of tc.shouldContain) {
      if (!maskedText.includes(term)) {
        failures.push(`Expected masked text to contain "${term}", but got: "${maskedText}"`);
      }
    }
  }

  // Check shouldNotContain
  if (tc.shouldNotContain) {
    for (const term of tc.shouldNotContain) {
      if (maskedText.includes(term)) {
        failures.push(`Expected masked text NOT to contain "${term}", but raw data leaked! Masked text: "${maskedText}"`);
      }
    }
  }

  // Check maxDetected
  if (tc.maxDetected !== undefined && entities.length > tc.maxDetected) {
    failures.push(`Expected at most ${tc.maxDetected} detections, but got ${entities.length}: ${JSON.stringify(entities.map(e => ({ cat: e.category, val: e.originalValue })))}`);
  }

  // Check expectedCategories
  if (tc.expectedCategories) {
    const detectedCategories = entities.map((e) => e.category);
    for (const expCat of tc.expectedCategories) {
      if (!detectedCategories.includes(expCat as any)) {
        failures.push(`Expected category "${expCat}" was not detected. Detected: [${detectedCategories.join(', ')}]`);
      }
    }
  }

  if (failures.length === 0) {
    console.log(`[PASS] Test ${i + 1}: ${tc.name}`);
    console.log(`       Input:  "${tc.input.length > 80 ? tc.input.substring(0, 77) + '...' : tc.input}"`);
    console.log(`       Output: "${maskedText.length > 80 ? maskedText.substring(0, 77) + '...' : maskedText}"\n`);
    passedCount++;
  } else {
    console.error(`[FAIL] Test ${i + 1}: ${tc.name}`);
    console.error(`       Input:  "${tc.input}"`);
    console.error(`       Output: "${maskedText}"`);
    for (const f of failures) {
      console.error(`       -> ${f}`);
    }
    console.error('');
    failedCount++;
  }
}

console.log('----------------------------------------------------------------');
console.log(`Test Execution Summary: ${passedCount} PASSED, ${failedCount} FAILED out of ${testCases.length} total tests.`);
console.log('----------------------------------------------------------------');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
