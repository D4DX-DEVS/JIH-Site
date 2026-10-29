// Worker entry (wrangler.jsonc "main"). Legacy redirects, signed-out admin requests and missing pages
// get real status codes here; everything else goes to the OpenNext build. See src/lib/edge-routing.ts.
// The bundle exists only after `opennextjs-cloudflare build`, so @ts-expect-error would fail once it does.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as nextHandler } from "./.open-next/worker.js";
import { asNotFound, routeAtEdge } from "./src/lib/edge-routing";

// OpenNext's Durable Objects, needed once the shared cache in docs/DEPLOYMENT.md uses them; unused until bound.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";

export default {
  async fetch(request, env, ctx) {
    const decision = await routeAtEdge(request, env.DB);
    if (decision.kind === "respond") return decision.response;
    const response: Response = await nextHandler.fetch(request, env, ctx);
    return decision.notFound ? asNotFound(response) : response;
  },
} satisfies ExportedHandler<CloudflareEnv>;
