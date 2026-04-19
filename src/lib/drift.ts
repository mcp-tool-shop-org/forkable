/**
 * Drift detection. Pure-ish: takes raw file contents (not Octokit) and produces
 * structured findings. The fetch layer (snapshot or scan tool) decides which
 * files to read.
 */

export type DriftSeverity = "high" | "medium" | "low";

export interface DriftFinding {
  code: string;
  severity: DriftSeverity;
  message: string;
  path: string;
  /** Optional excerpt — never includes secret values. */
  evidence?: string;
}

const ABSOLUTE_PATH_PATTERNS = [
  /[A-Z]:\\Users\\[A-Za-z0-9._-]+/g,
  /\/Users\/[A-Za-z0-9._-]+/g,
  /\/home\/[A-Za-z0-9._-]+/g,
];

const SECRET_PATTERNS = [
  { code: "GITHUB_PAT", regex: /\b(ghp|ghu|gho|ghs|ghr|github_pat)_[A-Za-z0-9_]{16,}\b/g },
  { code: "AWS_ACCESS_KEY", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { code: "OPENAI_KEY", regex: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { code: "GOOGLE_API_KEY", regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
];

export function scanFile(path: string, content: string, sourceOwner?: string): DriftFinding[] {
  const findings: DriftFinding[] = [];

  for (const pat of ABSOLUTE_PATH_PATTERNS) {
    const matches = content.match(pat);
    if (matches && matches.length > 0) {
      findings.push({
        code: "HARDCODED_LOCAL_PATH",
        severity: "medium",
        message: `Hardcoded local filesystem path detected.`,
        path,
        evidence: matches[0],
      });
      break;
    }
  }

  for (const { code, regex } of SECRET_PATTERNS) {
    const m = content.match(regex);
    if (m && m.length > 0) {
      findings.push({
        code: `LEAKED_${code}`,
        severity: "high",
        message: `Possible ${code} secret leaked in committed file.`,
        path,
        // Never include the value itself.
        evidence: "<redacted>",
      });
    }
  }

  if (sourceOwner) {
    const stale = new RegExp(`\\b${escapeRe(sourceOwner)}/[A-Za-z0-9._-]+`, "g");
    const matches = content.match(stale);
    if (matches && matches.length > 0) {
      findings.push({
        code: "STALE_SOURCE_REFERENCE",
        severity: "low",
        message: `References to the original source owner remain — may need to be rewritten for the new home.`,
        path,
        evidence: matches[0],
      });
    }
  }

  return findings;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
