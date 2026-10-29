import { afterEach, describe, expect, it, vi } from "vitest";

const CONTEXT_KEY = Symbol.for("__cloudflare-context__");
const store = globalThis as unknown as Record<symbol, { env: { DB: object } } | undefined>;

const freshDb = { prepare: () => "fresh" };
// Stands in for OpenNext: reuse the global context, or build one when it is missing.
const getCloudflareContext = vi.fn(async () => (store[CONTEXT_KEY] ??= { env: { DB: freshDb } }));

vi.mock("server-only", () => ({}));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }));

const poisonedDb = new Proxy({}, {
  get() {
    throw new Error("Attempted to use poisoned stub.");
  },
});

afterEach(() => {
  delete store[CONTEXT_KEY];
  getCloudflareContext.mockClear();
});

describe("getEnv", () => {
  it("returns the cached bindings when they are healthy", async () => {
    const healthy = { env: { DB: { prepare: () => "cached" } } };
    store[CONTEXT_KEY] = healthy;
    const { getEnv } = await import("@/db/client");

    expect(await getEnv()).toBe(healthy.env);
    expect(getCloudflareContext).toHaveBeenCalledTimes(1);
  });

  it("rebuilds the bindings after Miniflare poisons the cached stubs", async () => {
    store[CONTEXT_KEY] = { env: { DB: poisonedDb } };
    const { getEnv } = await import("@/db/client");

    const env = await getEnv();
    expect(env.DB).toBe(freshDb);
    expect(store[CONTEXT_KEY]?.env.DB).toBe(freshDb);
  });
});
