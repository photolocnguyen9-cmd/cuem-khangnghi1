import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, Locale } from "@/lib/i18n";
import TwoFactorClient from "./two-factor-client";

export default async function TwoFactorPage() {
  const store = await cookies();
  const locale = (store.get(LOCALE_COOKIE_NAME)?.value as Locale) || DEFAULT_LOCALE;
  return <TwoFactorClient locale={locale} />;
}
