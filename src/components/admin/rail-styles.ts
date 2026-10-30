// Shared by the client nav and any server component that renders a rail-style row. Kept out of the
// "use client" file: a server component importing a plain value from one gets a client reference, not the string.
// 40px rows, icon in a soft tile; the active item takes the navy tint with a navy icon tile.
export const RAIL_ITEM = "group flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-sm font-medium transition-colors lg:min-h-10";
export const RAIL_IDLE = "text-foreground/80 hover:bg-sidebar-accent hover:text-foreground";
export const RAIL_ACTIVE = "bg-sidebar-primary text-sidebar-primary-foreground";
export const RAIL_ICON = "flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70 transition-colors group-hover:bg-[var(--admin-sky)] group-hover:text-[var(--admin-navy)]";
export const RAIL_ICON_ACTIVE = "bg-[var(--admin-navy)] text-white group-hover:bg-[var(--admin-navy)] group-hover:text-white";
