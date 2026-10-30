"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { localizePath } from "@/lib/i18n/config";
import { useI18n } from "./i18n-provider";

/**
 * next/link that keeps the reader in their language: internal addresses are written without a
 * language (routes.page(slug), "/news/") and get the /en/ prefix on the English site.
 */
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { locale } = useI18n();
  return <NextLink href={typeof href === "string" ? localizePath(href, locale) : href} {...props} />;
}
