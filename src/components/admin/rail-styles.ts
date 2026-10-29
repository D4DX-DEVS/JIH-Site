// Shared by the client nav and the server layout's sign-out button. Kept out of the "use client" file:
// a server component importing a plain value from one gets a client reference, not the string.
export const RAIL_ITEM = "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors lg:min-h-9";
export const RAIL_IDLE = "text-white/70 hover:bg-sidebar-accent hover:text-white";
