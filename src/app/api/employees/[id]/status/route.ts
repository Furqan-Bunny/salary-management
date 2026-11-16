import { services } from "@/server/container";
import { body, handle, idFrom, type IdContext } from "@/server/http";
import { ValidationError } from "@/server/services/errors";

export const PUT = (req: Request, ctx: IdContext) =>
  handle(async () => {
    const id = await idFrom(ctx);
    const { status } = ((await body(req)) ?? {}) as { status?: unknown };
    if (status !== "active" && status !== "inactive") throw new ValidationError({ status: "Status must be active or inactive" });
    return services().employees.setStatus(id, status);
  });
