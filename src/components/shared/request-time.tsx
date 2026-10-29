import { connection } from "next/server";
import type { ReactNode } from "react";

/**
 * Defers its children to request time. Everything that reads D1 sits under one of these
 * (inside a Suspense boundary), so `next build` never queries the database: build machines
 * have no access to production D1, and baking local data into the shell would be wrong.
 */
export async function RequestTime({ children }: { children: ReactNode }) {
  await connection();
  return <>{children}</>;
}
