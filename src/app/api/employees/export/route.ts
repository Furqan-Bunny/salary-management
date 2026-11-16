import { services } from "@/server/container";
import { handle, query } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  handle(
    () =>
      new Response(services().employees.exportCsv(query(req)), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="employees-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      }),
  );
