import type { ZodError } from "zod";

export class ValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super("Please fix the highlighted fields");
  }

  static fromZod(error: ZodError): ValidationError {
    const out: Record<string, string> = {};
    for (const issue of error.issues) out[issue.path.join(".") || "form"] ??= issue.message;
    return new ValidationError(out);
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
  }
}

/** The request is valid but clashes with the current state (stale edit, inactive employee). */
export class ConflictError extends Error {}
