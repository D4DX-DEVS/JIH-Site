import { splitLocale } from "@/lib/i18n/config";

/** Whether a menu link points at the page being read (or a page below it). */
export function isActive(pathname: string, url: string): boolean {
  if (!url || isExternal(url)) return false;
  const { path } = splitLocale(pathname);
  return url === "/" ? path === "/" : decodeURI(path).startsWith(decodeURI(url));
}

/** Links that leave the app: other sites and uploaded files (PDF forms). */
export const isExternal = (url: string): boolean => /^https?:|^\/media\//.test(url);
