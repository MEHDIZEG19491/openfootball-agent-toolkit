export class ApiError extends Error {
  constructor(
    public code: string,
    public issues: { path: string; message: string }[] = [],
  ) {
    super(code);
  }
}
export async function api(url: string, data?: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    credentials: "same-origin",
  });
  const result = await response.json();
  if (!response.ok) throw new ApiError(result.error || "serverError", result.issues);
  return result;
}
