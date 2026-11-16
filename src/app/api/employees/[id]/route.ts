import { services } from "@/server/container";
import { body, handle, idFrom, type IdContext } from "@/server/http";

export const GET = (_req: Request, ctx: IdContext) => handle(async () => services().employees.get(await idFrom(ctx)));

export const PATCH = (req: Request, ctx: IdContext) =>
  handle(async () => services().employees.updateProfile(await idFrom(ctx), await body(req)));
