import { services } from "@/server/container";
import { handle, query } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => handle(() => services().bands.list(query(req).country));
