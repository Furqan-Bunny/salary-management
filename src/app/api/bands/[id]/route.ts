import { services } from "@/server/container";
import { body, handle, idFrom, type IdContext } from "@/server/http";

export const PUT = (req: Request, ctx: IdContext) =>
  handle(async () => services().bands.update(await idFrom(ctx), await body(req)));
