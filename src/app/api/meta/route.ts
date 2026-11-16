import { services } from "@/server/container";
import { COUNTRIES } from "@/server/domain/countries";
import { CHANGE_REASONS, GENDERS } from "@/server/domain/schemas";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

// Options for filters and forms.
export const GET = () =>
  handle(() => ({
    countries: Object.entries(COUNTRIES).map(([code, c]) => ({ code, name: c.name, currency: c.currency })),
    genders: GENDERS,
    reasons: CHANGE_REASONS,
    ...services().employees.options(),
  }));
