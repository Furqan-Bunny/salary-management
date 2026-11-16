// Typed client for the app's own API, used by client components.
export interface Band {
  min: number;
  mid: number;
  max: number;
}

export interface Employee {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: string;
  currency: string;
  gender: string;
  hireDate: string;
  status: "active" | "inactive";
  salary: number;
  version: number;
  band: Band | null;
  compaRatio: number | null;
  bandPosition: "below" | "within" | "above" | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Meta {
  countries: { code: string; name: string; currency: string }[];
  genders: string[];
  reasons: string[];
  jobTitles: string[];
  departments: string[];
}

export interface SalaryBand extends Band {
  id: number;
  country: string;
  currency: string;
  jobTitle: string;
  updatedAt: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Request failed", res.status, data.fieldErrors);
  return data as T;
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });

export const api = {
  listEmployees: (params: URLSearchParams) => request<Page<Employee>>(`/api/employees?${params}`),
  createEmployee: (data: unknown) => request<Employee>("/api/employees", json("POST", data)),
  updateEmployee: (id: number, data: unknown) => request<Employee>(`/api/employees/${id}`, json("PATCH", data)),
  changeSalary: (id: number, data: unknown) =>
    request<{ employee: Employee; changePercent: number }>(`/api/employees/${id}/salary`, json("POST", data)),
  setStatus: (id: number, status: "active" | "inactive") => request<Employee>(`/api/employees/${id}/status`, json("PUT", { status })),
  listBands: (country: string) => request<SalaryBand[]>(`/api/bands?country=${country}`),
  updateBand: (id: number, data: unknown) => request<SalaryBand>(`/api/bands/${id}`, json("PUT", data)),
  meta: () => request<Meta>("/api/meta"),
};
