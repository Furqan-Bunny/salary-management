import { isCountryCode } from "../domain/countries";
import { bandSchema } from "../domain/schemas";
import type { BandRepository, SalaryBand } from "../repositories/bandRepository";
import { NotFoundError, ValidationError } from "./errors";

export class BandService {
  constructor(private readonly repo: BandRepository) {}

  list(country?: string): SalaryBand[] {
    return this.repo.list(isCountryCode(country) ? country : undefined);
  }

  update(id: number, raw: unknown): SalaryBand {
    const result = bandSchema.safeParse(raw);
    if (!result.success) throw ValidationError.fromZod(result.error);
    const band = this.repo.update(id, result.data);
    if (!band) throw new NotFoundError("Band");
    return band;
  }
}
