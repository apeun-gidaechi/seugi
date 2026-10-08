type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const route = <M extends HttpMethod, P extends string>(method: M, path: P) => ({
  method,
  path,
});
export const path = <
  M extends HttpMethod,
  P extends string,
  F extends (...parts: string[]) => string,
>(
  method: M,
  value: P,
  pathFor: F,
) => ({ method, path: value, pathFor });
export const query = <
  M extends HttpMethod,
  P extends string,
  F extends (...parts: never[]) => string,
>(
  method: M,
  value: P,
  pathFor: F,
) => ({ method, path: value, pathFor });

export const segment = (value: string) => encodeURIComponent(value);
