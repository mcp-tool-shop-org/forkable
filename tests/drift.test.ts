import { describe, expect, it } from "vitest";
import { scanFile } from "../src/lib/drift.js";

describe("scanFile", () => {
  it("flags a hardcoded Windows local path", () => {
    const findings = scanFile("README.md", "Run `node C:\\Users\\mike\\repo\\index.js`");
    expect(findings.map((f) => f.code)).toContain("HARDCODED_LOCAL_PATH");
  });

  it("flags a hardcoded macOS path", () => {
    const findings = scanFile("Makefile", "/Users/alex/work/foo");
    expect(findings.map((f) => f.code)).toContain("HARDCODED_LOCAL_PATH");
  });

  it("flags a leaked GitHub PAT", () => {
    const findings = scanFile(
      ".env",
      "GITHUB_TOKEN=ghp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    const pat = findings.find((f) => f.code === "LEAKED_GITHUB_PAT")!;
    expect(pat).toBeDefined();
    expect(pat.severity).toBe("high");
    expect(pat.evidence).toBe("<redacted>");
  });

  it("flags a leaked AWS access key", () => {
    const findings = scanFile(".env", "AWS_KEY=AKIAABCDEFGHIJKLMNOP");
    expect(findings.map((f) => f.code)).toContain("LEAKED_AWS_ACCESS_KEY");
  });

  it("flags stale source-owner reference when sourceOwner is provided", () => {
    const findings = scanFile(
      "README.md",
      "originally from octocat/hello-world",
      "octocat",
    );
    expect(findings.map((f) => f.code)).toContain("STALE_SOURCE_REFERENCE");
  });

  it("returns empty for clean content", () => {
    expect(scanFile("README.md", "# A clean repo\nNothing to see here.")).toEqual([]);
  });
});
