import { services } from "@/server/container";
import { body, handle, idFrom, type IdContext } from "@/server/http";

export const GET = (_req: Request, ctx: IdContext) => handle(async () => services().employees.history(await idFrom(ctx)));

export const POST = (req: Request, ctx: IdContext) =>
  handle(async () => services().employees.changeSalary(await idFrom(ctx), await body(req)), 201);
