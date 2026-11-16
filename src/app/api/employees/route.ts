import { services } from "@/server/container";
import { body, handle, query } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => handle(() => services().employees.list(query(req)));

export const POST = (req: Request) => handle(async () => services().employees.create(await body(req)), 201);
