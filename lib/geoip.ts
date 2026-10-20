const DEFAULT_GEOIP_API_URL = "https://ipwho.is";

export type GeoIpDetection = {
  countryCode: string | null;
  callingCode: string | null;
};

const COUNTRY_CALLING_CODE_MAP: Record<string, string> = {
  VN: "+84",
  SG: "+65",
  US: "+1",
  GB: "+44",
  ID: "+62",
  TH: "+66",
  PH: "+63",
  MY: "+60",
  KR: "+82",
  JP: "+81",
  CN: "+86",
  HK: "+852",
  TW: "+886",
  IN: "+91",
  FR: "+33",
  DE: "+49",
  IT: "+39",
  ES: "+34",
  PT: "+351",
  RU: "+7",
  BR: "+55",
  AR: "+54",
  MX: "+52",
  CO: "+57",
  AE: "+971",
  SA: "+966",
  EG: "+20",
  BD: "+880",
  PK: "+92",
  NG: "+234",
  TR: "+90",
  IR: "+98",
};

export function callingCodeFromCountryCode(countryCode: string | null | undefined): string | null {
  if (!countryCode) {
    return null;
  }
  return COUNTRY_CALLING_CODE_MAP[countryCode.toUpperCase()] ?? null;
}

function sanitizeIp(ip: string): string {
  let value = ip.trim();

  if (value.startsWith("::ffff:")) {
    value = value.slice(7);
  }

  // Handle IPv4 with an appended port, e.g. 1.2.3.4:12345
  if (value.includes(".") && value.includes(":")) {
    const parts = value.split(":");
    if (parts.length === 2 && /^\d+$/.test(parts[1])) {
      value = parts[0];
    }
  }

  return value;
}

function isPrivateIp(ip: string): boolean {
  const value = ip.toLowerCase();

  if (value === "::1" || value === "localhost") {
    return true;
  }

  return (
    value.startsWith("10.") ||
    value.startsWith("127.") ||
    value.startsWith("192.168.") ||
    value.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80:")
  );
}

export function extractClientIp(headerStore: Headers): string | null {
  const candidates = [
    headerStore.get("x-nf-client-connection-ip"),
    headerStore.get("x-forwarded-for"),
    headerStore.get("x-real-ip"),
    headerStore.get("cf-connecting-ip"),
    headerStore.get("x-client-ip"),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const first = candidate.split(",")[0]?.trim();
    if (!first) {
      continue;
    }

    const ip = sanitizeIp(first);
    if (ip) {
      return ip;
    }
  }

  return null;
}

export async function detectCountryCodeByIp(ip: string): Promise<string | null> {
  const detection = await detectGeoDataByIp(ip);
  return detection.countryCode;
}

export async function detectGeoDataByIp(ip: string): Promise<GeoIpDetection> {
  if (!ip || isPrivateIp(ip)) {
    return { countryCode: null, callingCode: null };
  }

  const baseUrl = process.env.GEOIP_API_URL?.trim() || DEFAULT_GEOIP_API_URL;
  const url = `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(ip)}`;
  return detectGeoDataFromUrl(url);
}

async function detectGeoDataFromCurrentNetwork(): Promise<GeoIpDetection> {
  const baseUrl = process.env.GEOIP_API_URL?.trim() || DEFAULT_GEOIP_API_URL;
  const url = baseUrl.replace(/\/+$/, "");
  return detectGeoDataFromUrl(url);
}

function normalizeCountryCode(rawCountryCode: string | undefined): string | null {
  if (!rawCountryCode) {
    return null;
  }

  const countryCode = rawCountryCode.toUpperCase();
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : null;
}

function normalizeCallingCode(rawCallingCode: string | undefined): string | null {
  if (!rawCallingCode) {
    return null;
  }

  const digits = rawCallingCode.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }

  return `+${digits}`;
}

async function detectGeoDataFromUrl(url: string): Promise<GeoIpDetection> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { countryCode: null, callingCode: null };
    }

    const data = (await response.json()) as {
      success?: boolean;
      country_code?: string;
      countryCode?: string;
      calling_code?: string;
      callingCode?: string;
    };

    if (data.success === false) {
      return { countryCode: null, callingCode: null };
    }

    return {
      countryCode: normalizeCountryCode(data.country_code ?? data.countryCode),
      callingCode: normalizeCallingCode(data.calling_code ?? data.callingCode),
    };
  } catch {
    return { countryCode: null, callingCode: null };
  }
}

export async function detectCountryCodeFromHeaders(headerStore: Headers): Promise<string | null> {
  const detection = await detectGeoDataFromHeaders(headerStore);
  return detection.countryCode;
}

export async function detectGeoDataFromHeaders(headerStore: Headers): Promise<GeoIpDetection> {
  const ip = extractClientIp(headerStore);
  if (ip) {
    const detection = await detectGeoDataByIp(ip);
    if (detection.countryCode || detection.callingCode) {
      return detection;
    }
  }

  // In local development, Next dev often only exposes loopback IPs.
  // Fallback to GeoIP auto-detect so developers can test language switching.
  if (process.env.NODE_ENV !== "production") {
    return detectGeoDataFromCurrentNetwork();
  }

  return { countryCode: null, callingCode: null };
}
