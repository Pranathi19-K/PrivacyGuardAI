import { randomUUID } from "node:crypto";

export type FindingType =
  | "email"
  | "phone"
  | "id_number"
  | "credit_card"
  | "name"
  | "custom";

export type MaskStyle = "redact" | "category" | "partial";

export interface RuleInput {
  id: string;
  label: string;
  pattern: string;
  maskWith: string;
}

export interface Finding {
  id: string;
  type: FindingType;
  label: string;
  value: string;
  preview: string;
  start: number;
  end: number;
  confidence: number;
  selected: boolean;
  maskWith: string | null;
}

interface Candidate {
  type: FindingType;
  label: string;
  start: number;
  end: number;
  confidence: number;
  priority: number;
  maskWith?: string;
}

const DEFAULT_PATTERNS: Array<{
  type: FindingType;
  label: string;
  pattern: RegExp;
  confidence: number;
  priority: number;
}> = [
  {
    type: "credit_card",
    label: "Payment card",
    pattern: /\b(?:\d[ -]?){13,19}\b/g,
    confidence: 0.92,
    priority: 1,
  },
  {
    type: "id_number",
    label: "U.S. Social Security number",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    confidence: 0.98,
    priority: 2,
  },
  {
    type: "id_number",
    label: "Aadhaar number",
    pattern: /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g,
    confidence: 0.86,
    priority: 2,
  },
  {
    type: "id_number",
    label: "PAN number",
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/gi,
    confidence: 0.96,
    priority: 2,
  },
  {
    type: "email",
    label: "Email address",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    confidence: 0.99,
    priority: 3,
  },
  {
    type: "phone",
    label: "Phone number",
    pattern: /(?<!\w)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}(?!\w)/g,
    confidence: 0.72,
    priority: 4,
  },
];

const RISK_WEIGHTS: Record<FindingType, number> = {
  email: 12,
  phone: 14,
  id_number: 32,
  credit_card: 38,
  name: 8,
  custom: 18,
};

function isLuhnValid(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function previewAround(text: string, start: number, end: number): string {
  const contextStart = Math.max(0, start - 26);
  const contextEnd = Math.min(text.length, end + 26);
  const before = text.slice(contextStart, start);
  const after = text.slice(end, contextEnd);
  return `${contextStart > 0 ? "…" : ""}${before}[MATCH]${after}${contextEnd < text.length ? "…" : ""}`;
}

function addPatternMatches(
  text: string,
  pattern: RegExp,
  type: FindingType,
  label: string,
  confidence: number,
  priority: number,
  target: Candidate[],
  maskWith?: string,
): void {
  pattern.lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const value = match[0];
    if (type === "credit_card" && !isLuhnValid(value)) continue;
    if (type === "phone") {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) continue;
    }
    target.push({
      type,
      label,
      start: match.index,
      end: match.index + value.length,
      confidence,
      priority,
      ...(maskWith ? { maskWith } : {}),
    });
  }
}

export function validateSafePattern(pattern: string): string | null {
  if (pattern.length < 1 || pattern.length > 200) {
    return "Pattern must be between 1 and 200 characters.";
  }
  if (/[()*+|]/.test(pattern) || /\\[1-9]|\\k<|\(\?/.test(pattern)) {
    return "Use a simple pattern without groups, alternation, or unbounded repetition.";
  }
  const boundedRepeats = [...pattern.matchAll(/\{(\d+)(?:,(\d*))?\}/g)];
  if (boundedRepeats.length > 8) {
    return "A pattern can contain at most 8 bounded repetitions.";
  }
  for (const repeat of boundedRepeats) {
    const minimum = Number(repeat[1]);
    const maximum = repeat[2] ? Number(repeat[2]) : minimum;
    if (maximum > 100 || maximum < minimum) {
      return "Bounded repetitions must stay between 0 and 100.";
    }
  }
  if ([...pattern.matchAll(/\?/g)].length > 8) {
    return "A pattern can contain at most 8 optional characters.";
  }
  try {
    new RegExp(pattern, "g");
  } catch {
    return "Pattern is not a valid regular expression.";
  }
  return null;
}

function addNameMatches(text: string, target: Candidate[]): void {
  const nameFieldPattern =
    /\b(?:name|patient|customer|contact|attn)[ \t]*[:\-][ \t]*([A-Z][a-z]{1,30}(?:[ \t]+[A-Z][a-z]{1,30}){1,2})\b/gi;
  for (const match of text.matchAll(nameFieldPattern)) {
    const name = match[1];
    const relativeStart = match[0].lastIndexOf(name);
    target.push({
      type: "name",
      label: "Name in labeled field",
      start: match.index + relativeStart,
      end: match.index + relativeStart + name.length,
      confidence: 0.64,
      priority: 5,
    });
  }
}

export function detectSensitiveData(
  text: string,
  options: { detectNames?: boolean; rules?: RuleInput[] } = {},
): Finding[] {
  const candidates: Candidate[] = [];
  for (const definition of DEFAULT_PATTERNS) {
    addPatternMatches(
      text,
      definition.pattern,
      definition.type,
      definition.label,
      definition.confidence,
      definition.priority,
      candidates,
    );
  }

  if (options.detectNames) addNameMatches(text, candidates);

  for (const rule of options.rules ?? []) {
    if (validateSafePattern(rule.pattern)) continue;
    const pattern = new RegExp(rule.pattern, "g");
    addPatternMatches(
      text,
      pattern,
      "custom",
      rule.label,
      0.76,
      6,
      candidates,
      rule.maskWith,
    );
  }

  candidates.sort(
    (left, right) =>
      left.start - right.start ||
      left.priority - right.priority ||
      right.end - left.end,
  );

  const nonOverlapping: Candidate[] = [];
  let occupiedUntil = -1;
  for (const candidate of candidates) {
    if (candidate.start < occupiedUntil || candidate.end <= candidate.start) continue;
    nonOverlapping.push(candidate);
    occupiedUntil = candidate.end;
  }

  return nonOverlapping.map((candidate) => {
    const value = text.slice(candidate.start, candidate.end);
    return {
      id: randomUUID(),
      type: candidate.type,
      label: candidate.label,
      value,
      preview: previewAround(text, candidate.start, candidate.end),
      start: candidate.start,
      end: candidate.end,
      confidence: candidate.confidence,
      selected: true,
      maskWith: candidate.maskWith ?? null,
    };
  });
}

export function maskedTextForFindings(
  text: string,
  findings: Finding[],
  selectedIds: Set<string>,
  maskStyle: MaskStyle,
): string {
  const selected = findings
    .filter((finding) => selectedIds.has(finding.id))
    .sort((left, right) => right.start - left.start);

  let output = text;
  for (const finding of selected) {
    let replacement = "[REDACTED]";
    if (maskStyle === "category") {
      replacement =
        finding.type === "custom"
          ? finding.maskWith ?? "[CUSTOM REDACTED]"
          : `[${finding.label.toUpperCase()} REDACTED]`;
    } else if (maskStyle === "partial") {
      replacement = "•".repeat(Math.min(finding.value.length, 64));
    }
    if (replacement.toLocaleLowerCase().includes(finding.value.toLocaleLowerCase())) {
      replacement = "[REDACTED]";
    }
    output =
      output.slice(0, finding.start) + replacement + output.slice(finding.end);
  }
  return output;
}

export function summarizeFindings(findings: Finding[]) {
  const grouped = new Map<string, { type: FindingType; label: string; count: number }>();
  for (const finding of findings) {
    const key = `${finding.type}:${finding.label}`;
    const existing = grouped.get(key);
    if (existing) existing.count += 1;
    else grouped.set(key, { type: finding.type, label: finding.label, count: 1 });
  }
  return [...grouped.values()].sort((left, right) => right.count - left.count);
}

export function calculateRisk(findings: Finding[]) {
  const score = Math.min(
    100,
    findings.reduce((total, finding) => total + RISK_WEIGHTS[finding.type], 0),
  );
  const level: "low" | "medium" | "high" =
    score >= 60 ? "high" : score >= 25 ? "medium" : "low";
  const counts = summarizeFindings(findings);
  const description =
    counts.length === 0
      ? "No supported sensitive-data patterns were detected. This does not prove the document is free of sensitive information."
      : `Detected ${findings.length} possible sensitive item${findings.length === 1 ? "" : "s"} across ${counts.length} categor${counts.length === 1 ? "y" : "ies"}. The score reflects the number and type of matches. Review each item before sharing.`;
  return {
    score,
    level,
    explanation: `${level[0].toUpperCase()}${level.slice(1)} risk. ${description} Detection and masking are not guarantees of privacy or legal compliance.`,
  };
}

