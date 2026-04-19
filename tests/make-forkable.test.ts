import { describe, expect, it } from "vitest";
import { makeForkableTool } from "../src/tools/make-forkable.js";
import { fakeOctokit } from "./_helpers/octokit.js";
import { openState } from "../src/lib/state.js";
import { Operations } from "../src/lib/operations.js";

function ctx(octokit: ReturnType<typeof fakeOctokit>) {
  const db = openState(":memory:");
  return { octokit, db, operations: new Operations(db) };
}

describe("forkable_make_forkable", () => {
  it("plan mode produces patch steps for missing license/README/env", async () => {
    const oct = fakeOctokit({ readme: undefined, files: [], license: null });
    const result = await makeForkableTool.handler(
      { repo: "octocat/bare", mode: "plan", branch: "forkable/adoption-fixes" },
      ctx(oct),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const codes = result.data.steps.map((s) => s.blockerCode);
    expect(codes).toContain("NO_LICENSE");
    expect(codes).toContain("NO_README");
    expect(codes).toContain("NO_ENV_EXAMPLE");
    expect(result.data.prUrl).toBeUndefined();
  });

  it("plan mode produces no steps for a healthy repo", async () => {
    const oct = fakeOctokit({
      readme: "# title\n".repeat(300),
      files: [".env.example", "CONTRIBUTING.md", "SECURITY.md", "Dockerfile"],
      license: { spdx_id: "MIT", name: "MIT" },
    });
    const result = await makeForkableTool.handler(
      { repo: "octocat/healthy", mode: "plan", branch: "forkable/adoption-fixes" },
      ctx(oct),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.steps).toHaveLength(0);
  });

  it("plan steps include valid file content", async () => {
    const oct = fakeOctokit({ readme: undefined, files: [], license: null });
    const result = await makeForkableTool.handler(
      { repo: "octocat/bare", mode: "plan", branch: "forkable/adoption-fixes" },
      ctx(oct),
    );
    if (!result.ok) throw new Error("expected ok");
    const license = result.data.steps.find((s) => s.blockerCode === "NO_LICENSE");
    expect(license?.content).toMatch(/MIT License/);
    expect(license?.content).toMatch(/octocat/);
  });

  it("default mode is plan when input omits mode", async () => {
    // Schema has .default('plan') — handler should still receive it as 'plan'
    const oct = fakeOctokit({ readme: undefined, files: [], license: null });
    const parsed = (await import("../src/schemas/assess.js")).MakeForkableInputSchema.parse({
      repo: "octocat/bare",
    });
    expect(parsed.mode).toBe("plan");
    const result = await makeForkableTool.handler(parsed, ctx(oct));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mode).toBe("plan");
    expect(result.data.prUrl).toBeUndefined();
  });
});
