/** Outbound has no product domain. Connect copy uses the configured base URL. */
export function canonicalPublicOrigin(appBaseUrl: string): string {
  return appBaseUrl.replace(/\/$/, "");
}
