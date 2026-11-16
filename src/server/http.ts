import { NextResponse } from "next/server";
import { ConflictError, NotFoundError, ValidationError } from "./services/errors";

export type IdContext = { params: Promise<{ id: string }> };

// Maps service errors to HTTP so every route handler stays a one-liner.
export async function handle(fn: () => unknown, status = 200): Promise<Response> {
  try {
    const result = await fn();
    if (result instanceof Response) return result;
    return NextResponse.json(result, { status });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, fieldErrors: error.fieldErrors }, { status: 400 });
    }
    if (error instanceof NotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof ConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function idFrom(ctx: IdContext): Promise<number> {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1) throw new NotFoundError("Record");
  return id;
}

export async function body(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError({ form: "Request body must be valid JSON" });
  }
}

export const query = (req: Request) => Object.fromEntries(new URL(req.url).searchParams);
