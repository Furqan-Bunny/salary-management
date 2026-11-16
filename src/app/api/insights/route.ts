import { services } from "@/server/container";
import { isCountryCode } from "@/server/domain/countries";
import { handle, query } from "@/server/http";

export const dynamic = "force-dynamic";

// Org-wide view plus the breakdowns for one country (?country=DE, defaults to the largest).
export const GET = (req: Request) =>
  handle(() => {
    const { insights } = services();
    const byCountry = insights.byCountry();
    const requested = query(req).country;
    const country = isCountryCode(requested) ? requested : (byCountry[0]?.country ?? "US");
    return {
      overview: insights.overview(),
      byCountry,
      bandHealth: insights.bandHealth(),
      country,
      byJobTitle: insights.byJobTitle(country),
      payEquity: insights.payEquity(country),
      compression: insights.compression(country),
      byDepartment: insights.byDepartment(country),
    };
  });
