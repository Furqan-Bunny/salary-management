"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select } from "./ui";

// Keeps the chosen country in the URL so the view can be bookmarked or shared.
export function CountryPicker({ value, options }: { value: string; options: { code: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Select className="w-60" value={value} onChange={(e) => router.push(`${pathname}?country=${e.target.value}`, { scroll: false })} aria-label="Country">
      {options.map((o) => (
        <option key={o.code} value={o.code}>{o.name}</option>
      ))}
    </Select>
  );
}
