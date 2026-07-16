export const pathWithParams = (path: string, params: Record<string, string | number>) =>
  Object.entries(params).reduce(
    (resolvedPath, [key, value]) => resolvedPath.replace(`:${key}`, encodeURIComponent(String(value))),
    path
  );
