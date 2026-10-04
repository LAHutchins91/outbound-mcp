const KNOWN = [
  "Library not found",
  "Wording not found",
  "Suggestion not found",
  "Revision conflict",
  "Wording is retired",
  "Suggestion is closed",
  "This record is approved. Suggest a change instead of replacing the saved wording.",
  "Refusing to open another product's data file",
  "Outbound data file is damaged"
] as const;

export function publicError(error: unknown): { status: number; error: string } {
  const message = error instanceof Error ? error.message : "";
  const safe = KNOWN.find((item) => message.includes(item));
  if (safe === "Library not found" || safe === "Wording not found" || safe === "Suggestion not found") {
    return { status: 404, error: safe };
  }
  if (safe === "Revision conflict") return { status: 409, error: safe };
  if (safe === "Refusing to open another product's data file" || safe === "Outbound data file is damaged") {
    return { status: 500, error: safe };
  }
  if (safe) return { status: 400, error: safe };
  return { status: 500, error: "Outbound could not complete this request. Your changes may not have been saved." };
}
