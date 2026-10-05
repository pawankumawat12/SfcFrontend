"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useRegisterMutation,
  useLazyGetMeQuery,
  useSendOtpMutation,
  useVerifyOtpMutation,
} from "../redux/services/authApi";
import { setCredentials } from "../redux/features/authSlice";
import {
  registerSchema,
  verifyOtpSchema,
} from "../schemas/authSchema";
import { useMergeCartMutation } from "../redux/services/cartApi";
import { getGuestCart, clearGuestCart } from "../lib/guestCart";
import { syncGuestDeliveryLocationToAccount } from "../lib/deliveryLocation";
import GoogleSignInButton from "./GoogleSignInButton";

type ApiError = {
  data?: { message?: string; errors?: Record<string, string> };
};
type RegistrationValues = z.infer<typeof registerSchema>;
type VerificationValues = z.infer<typeof verifyOtpSchema>;
const RESEND_COOLDOWN_SECONDS = 30;
const RESEND_LIMIT = 4;
const messageFor = (error: unknown) => {
  const apiError = error as ApiError;
  return (
    apiError.data?.message ||
    Object.values(apiError.data?.errors || {})[0] ||
    "Something went wrong. Please try again."
  );
};

export default function RegisterForm({
  onComplete,
  onOpenLogin,
}: {
  onComplete?: () => void;
  onOpenLogin?: () => void;
}) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"register" | "verify">("register");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [registerAccount, { isLoading: isRegistering }] = useRegisterMutation();
  const [getMe] = useLazyGetMeQuery();
  const [sendOtp, { isLoading: isSending }] = useSendOtpMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [mergeCart] = useMergeCartMutation();

  const syncGuestCart = async () => {
    const guestItems = getGuestCart();
    if (guestItems.length === 0) return;
    try {
      const mergeRes = await mergeCart({
        items: guestItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }).unwrap();
      clearGuestCart();
      const report = mergeRes?.data?.mergeReport;
      if (report?.adjustedItems?.length) {
        toast("Some cart items were adjusted to available stock.");
      }
      if (report?.outOfStockItems?.length || report?.skippedInactiveItems?.length) {
        toast("Unavailable items were removed from your cart.");
      }
    } catch {
      // keep guest cart if merge fails
    }
  };

  const registration = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
    },
  });
  const verification = useForm({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setInterval(() => {
      setResendTimer((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendTimer]);

  const startVerification = async (values: RegistrationValues) => {
    const account = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone || undefined,
      password: values.password,
    };
    try {
      const res = (await registerAccount(account).unwrap()) as {
        success?: boolean;
        accessToken?: string;
        token?: string;
        user?: unknown;
        requiresVerification?: boolean;
        data?: {
          requiresVerification?: boolean;
          accessToken?: string;
          token?: string;
        };
      };
      if (
        res?.data?.requiresVerification === false ||
        res?.requiresVerification === false ||
        (!res?.data?.requiresVerification && (res?.accessToken || res?.token || res?.user))
      ) {
        dispatch(setCredentials(res));
        try {
          const me = await getMe().unwrap();
          dispatch(setCredentials(me));
        } catch {}
        await syncGuestCart();
        await syncGuestDeliveryLocationToAccount(
          dispatch,
          (res as any)?.user || (res as any)?.data?.user
        );
        toast.success("Account created successfully! Welcome to SFC Cafe.");
        if (onComplete) {
          onComplete();
        } else {
          router.replace("/");
        }
        return;
      }

      setEmail(account.email);
      setOtpDigits(["", "", "", "", "", ""]);
      verification.reset({ otp: "" });
      setStep("verify");
      setResendCount(0);
      setResendTimer(RESEND_COOLDOWN_SECONDS);
      toast.success("A verification code has been sent to your email.");
    } catch (error) {
      toast.error(messageFor(error));
    }
  };

  const completeRegistration = async ({ otp }: VerificationValues) => {
    try {
      const res = await verifyOtp({ email, otp }).unwrap();

      // Access token is held in Redux memory (no localStorage)
      dispatch(setCredentials(res));

      try {
        const me = await getMe().unwrap();
        dispatch(setCredentials(me));
      } catch {}

      await syncGuestCart();
      await syncGuestDeliveryLocationToAccount(
        dispatch,
        (res as any)?.user || (res as any)?.data?.user
      );

      toast.success("Your account is verified. Welcome!");
      if (onComplete) {
        onComplete();
      } else {
        router.replace("/");
      }
    } catch (error) {
      toast.error(messageFor(error));
    }
  };

  const resend = async () => {
    if (resendTimer > 0 || resendCount >= RESEND_LIMIT) return;
    try {
      const response = await sendOtp({ email }).unwrap();
      setOtpDigits(["", "", "", "", "", ""]);
      verification.reset({ otp: "" });
      otpRefs.current[0]?.focus();
      setResendCount(response.data?.resendCount ?? resendCount + 1);
      setResendTimer(response.data?.retryAfter ?? RESEND_COOLDOWN_SECONDS);
      toast.success("A new verification code has been sent.");
    } catch (error) {
      const apiError = error as ApiError & { data?: { retryAfter?: number } };
      if (apiError.data?.retryAfter) setResendTimer(apiError.data.retryAfter);
      toast.error(messageFor(error));
    }
  };

  const setOtp = (digits: string[]) => {
    setOtpDigits(digits);
    verification.setValue("otp", digits.join(""), { shouldValidate: true });
  };

  const changeOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtp(next);
    if (digit && index < next.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const pasteOtp = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;

    const next = Array.from({ length: 6 }, (_, index) => digits[index] || "");
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 6) - 1]?.focus();
  };

  const input =
    "mt-1 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20";
  return (
    <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-white p-4 shadow-xl sm:p-8">
      <header className="mb-7 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary)]">
          {step === "register" ? <UserPlus /> : <KeyRound />}
        </div>
        <h1 className="text-2xl font-bold">
          {step === "register" ? "Create Your Account" : "Verify Your Email"}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {step === "register" ? (
            "Register to save favourites and order faster."
          ) : (
            <>
              Enter the code sent to <strong>{email}</strong>.
            </>
          )}
        </p>
      </header>
      {step === "register" ? (
        <form
          className="space-y-4"
          onSubmit={registration.handleSubmit(startVerification)}
          noValidate
        >
          <Input
            label="Full name"
            error={registration.formState.errors.name?.message}
          >
            <input
              className={input}
              autoComplete="name"
              {...registration.register("name")}
            />
          </Input>
          <Input
            label="Email address"
            error={registration.formState.errors.email?.message}
          >
            <input
              className={input}
              type="email"
              autoComplete="email"
              {...registration.register("email")}
            />
          </Input>
          <Input
            label="Mobile number *"
            error={registration.formState.errors.phone?.message}
          >
            <input
              className={input}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10-digit mobile number"
              maxLength={10}
              {...registration.register("phone")}
            />
          </Input>
          <Input
            label="Password"
            error={registration.formState.errors.password?.message}
          >
            <div className="relative">
              <input
                className={`${input} pr-10`}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...registration.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Input>
          <Input
            label="Confirm password"
            error={registration.formState.errors.confirmPassword?.message}
          >
            <div className="relative">
              <input
                className={`${input} pr-10`}
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                {...registration.register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Input>

          <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--color-text-secondary)]">
            <input
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
              type="checkbox"
              {...registration.register("termsAccepted")}
            />
            <span className="text-xs leading-5">
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                className="font-semibold text-[var(--color-primary)] underline hover:text-[var(--color-primary-dark)]"
              >
                Terms & Conditions
              </Link>
              ,{" "}
              <Link
                href="/privacy-policy"
                target="_blank"
                className="font-semibold text-[var(--color-primary)] underline hover:text-[var(--color-primary-dark)]"
              >
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/refund-policy"
                target="_blank"
                className="font-semibold text-[var(--color-primary)] underline hover:text-[var(--color-primary-dark)]"
              >
                Refund Policy
              </Link>
              .
            </span>
          </label>

          {registration.formState.errors.termsAccepted?.message && (
            <span className="-mt-2 block text-xs font-normal text-red-600">
              {registration.formState.errors.termsAccepted.message}
            </span>
          )}
          <Submit busy={isRegistering || isSending} text="Create account" />

          <div className="relative my-3 flex items-center justify-center">
            <div className="w-full border-t border-[var(--color-border)]" />
            <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              or
            </span>
          </div>

          <GoogleSignInButton
            mode="signup"
            onSuccess={() => {
              if (onComplete) {
                onComplete();
              } else {
                router.replace("/");
              }
            }}
          />

          <p className="pt-2 text-center text-sm text-[var(--color-text-secondary)]">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onOpenLogin}
              className="font-semibold text-[var(--color-primary)] hover:underline"
            >
              Sign in
            </button>
          </p>
        </form>
      ) : (
        <form
          className="space-y-5"
          onSubmit={verification.handleSubmit(completeRegistration)}
          noValidate
        >
          <div>
            <p className="text-sm font-medium">6-digit verification code</p>
            <div className="mt-2 flex justify-center gap-2 sm:gap-3">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    otpRefs.current[index] = element;
                  }}
                  aria-label={`Verification code digit ${index + 1}`}
                  className="h-11 w-10 sm:h-12 sm:w-12 rounded-xl border border-[var(--color-border)] bg-white text-center text-lg sm:text-xl font-semibold outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digit}
                  onChange={(event) => changeOtpDigit(index, event.target.value)}
                  onPaste={pasteOtp}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
                      otpRefs.current[index - 1]?.focus();
                    }
                  }}
                />
              ))}
            </div>
            {verification.formState.errors.otp?.message && (
              <span className="mt-1 block text-xs font-normal text-red-600">
                {verification.formState.errors.otp.message}
              </span>
            )}
          </div>
          <Submit busy={isVerifying} text="Verify and continue" verified />
          <p className="text-center text-xs text-[var(--color-text-secondary)]">
            {resendCount >= RESEND_LIMIT
              ? "All 4 resend attempts used. Please try again in 10 minutes."
              : `${RESEND_LIMIT - resendCount} resend attempt${RESEND_LIMIT - resendCount === 1 ? "" : "s"} remaining`}
          </p>
          <button
            className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-[var(--color-primary)] disabled:opacity-50"
            type="button"
            disabled={isSending || resendTimer > 0 || resendCount >= RESEND_LIMIT}
            onClick={resend}
          >
            <Mail size={16} /> {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
          </button>
          <button
            className="w-full text-sm text-[var(--color-text-secondary)]"
            type="button"
            onClick={() => {
              verification.reset({ otp: "" });
              setOtpDigits(["", "", "", "", "", ""]);
              setResendTimer(0);
              setResendCount(0);
              setStep("register");
            }}
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}

function Input({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
      {error && (
        <span className="mt-1 block text-xs font-normal text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}
function Submit({
  busy,
  text,
  verified,
}: {
  busy: boolean;
  text: string;
  verified?: boolean;
}) {
  return (
    <button
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      disabled={busy}
    >
      {busy ? (
        <LoaderCircle className="animate-spin" size={18} />
      ) : verified ? (
        <CheckCircle2 size={18} />
      ) : null}
      {text}
    </button>
  );
}
