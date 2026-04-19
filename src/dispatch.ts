import { ZodError } from "zod";
import { AuditLog } from "./lib/audit.js";
import { ForkableError } from "./lib/errors.js";
import { fail, type ToolResult } from "./lib/result.js";
import type { ToolContext, ToolDescriptor } from "./tools/types.js";

/**
 * Single dispatch boundary for all tools.
 *
 * 1. Validate the raw input against the tool's Zod schema.
 * 2. Invoke the handler (which never throws — always returns a ToolResult).
 * 3. Record an audit entry for the call (ok or fail).
 * 4. Return the ToolResult to the caller (MCP server, CLI, or test).
 *
 * This is the ONE place audit logging lives. Handlers stay pure.
 */
export async function dispatch<I, O>(
  tool: ToolDescriptor<I, O>,
  rawInput: unknown,
  ctx: ToolContext,
): Promise<ToolResult<O>> {
  const parsed = tool.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const err = new ForkableError("INVALID_INPUT", "Invalid tool input", {
      hint: formatZodIssues(parsed.error),
      details: { issues: parsed.error.issues },
    });
    recordAudit(ctx, tool.name, rawInput, false, err.toUserPayload());
    return fail(err);
  }
  const result = await tool.handler(parsed.data as I, ctx);
  const operationId = extractOperationId(result);
  recordAudit(ctx, tool.name, parsed.data, result.ok, result.ok ? result.data : result.error, operationId);
  return result;
}

function recordAudit(
  ctx: ToolContext,
  tool: string,
  input: unknown,
  ok: boolean,
  result: unknown,
  operationId?: string,
): void {
  try {
    const log = new AuditLog(ctx.db);
    const entry: Parameters<AuditLog["record"]>[0] = { tool, input, ok, result };
    if (operationId !== undefined) entry.operationId = operationId;
    log.record(entry);
  } catch {
    // Audit writes must never break tool calls.
  }
}

function extractOperationId(result: ToolResult<unknown>): string | undefined {
  if (!result.ok) return undefined;
  const data = result.data as { operationId?: unknown; operation?: { id?: unknown } } | null;
  if (!data) return undefined;
  if (typeof data.operationId === "string") return data.operationId;
  if (data.operation && typeof data.operation.id === "string") return data.operation.id;
  return undefined;
}

function formatZodIssues(err: ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}
