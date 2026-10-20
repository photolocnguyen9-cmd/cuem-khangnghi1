import { NextResponse, type NextRequest } from "next/server";
import { callingCodeFromCountryCode, extractClientIp } from "@/lib/geoip";
import { LOCALE_COOKIE_NAME, resolveLocaleFromCountryCode } from "@/lib/i18n";

function getEdgeCountryCode(request: NextRequest): string | null {
  return (
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-country-code")
  );
}

export async function proxy(request: NextRequest) {
  const currentLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  const netlifyGeoHeader = request.headers.get("x-nf-geo");
  let netlifyGeo: { city?: string; region?: string; country?: string } | null = null;
  if (netlifyGeoHeader) {
    try {
      netlifyGeo = JSON.parse(netlifyGeoHeader);
    } catch {
      netlifyGeo = null;
    }
  }

  const countryCode = netlifyGeo?.country ?? getEdgeCountryCode(request);
  const locale = resolveLocaleFromCountryCode(countryCode);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-detected-locale", locale);
  if (countryCode) {
    requestHeaders.set("x-detected-country", countryCode);
  }
  const callingCode = callingCodeFromCountryCode(countryCode);
  if (callingCode) {
    requestHeaders.set("x-detected-calling-code", callingCode);
  }
  const detectedIp = extractClientIp(request.headers);
  if (detectedIp) {
    requestHeaders.set("x-detected-ip", detectedIp);
  }
  let locationSegments: string[] = [];
  if (netlifyGeo) {
    locationSegments = [netlifyGeo.region, netlifyGeo.city, netlifyGeo.country]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));
  }

  if (locationSegments.length === 0) {
    locationSegments = [
      request.headers.get("x-vercel-ip-country-region"),
      request.headers.get("x-vercel-ip-city"),
      countryCode ?? request.headers.get("x-vercel-ip-country"),
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));
  }
  if (locationSegments.length > 0) {
    requestHeaders.set("x-detected-location", locationSegments.join(" / "));
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (currentLocale !== locale) {
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  if (process.env.NODE_ENV !== "production") {
    response.headers.set("x-debug-detected-locale", locale);
    response.headers.set("x-debug-detected-country", countryCode ?? "unknown");
    response.headers.set("x-debug-detected-calling-code", callingCode ?? "unknown");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
