import { cookies, headers } from "next/headers";
import HomePageLoader from "./home-page-loader";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/i18n";

function normalizeCountryCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const countryCode = value.toUpperCase();
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : null;
}

function normalizeCallingCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const digits = value.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : null;
}

export default async function Page() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const locale =
    normalizeLocale(headerStore.get("x-detected-locale")) ??
    normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value) ??
    DEFAULT_LOCALE;
  const detectedCountryCode = normalizeCountryCode(headerStore.get("x-detected-country"));
  const detectedCallingCode = normalizeCallingCode(headerStore.get("x-detected-calling-code"));
  const detectedIp = headerStore.get("x-detected-ip") ?? null;
  const detectedLocation = headerStore.get("x-detected-location") ?? null;

  return (
    <HomePageLoader
      locale={locale}
      detectedCountryCode={detectedCountryCode}
      detectedCallingCode={detectedCallingCode}
      detectedIp={detectedIp}
      detectedLocation={detectedLocation}
    />
  );
}
