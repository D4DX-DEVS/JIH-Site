import type { Instrumentation } from "next";

// Server render and route errors go to the Workers log (observability is enabled in wrangler.jsonc),
// so a failing page leaves a stack trace instead of only a generic 500.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error(`[${context.routeType}] ${request.method} ${request.path} (${context.routePath}): ${error.stack ?? error.message}`);
};
