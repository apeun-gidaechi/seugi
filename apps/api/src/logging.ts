const sensitiveQueryParameters = new Set([
  "access_token",
  "authorization",
  "code",
  "email",
  "password",
  "refresh_token",
  "secret",
  "token",
]);

/** Keep credentials and personal identifiers out of request URLs written to logs. */
export function redactRequestUrl(url: string): string {
  const separator = url.indexOf("?");
  if (separator < 0) return url;

  const pathname = url.slice(0, separator);
  const parameters = new URLSearchParams(url.slice(separator + 1));
  for (const key of parameters.keys()) {
    if (sensitiveQueryParameters.has(key.toLowerCase())) {
      parameters.set(key, "[REDACTED]");
    }
  }

  const query = parameters.toString();
  return query ? `${pathname}?${query}` : pathname;
}
