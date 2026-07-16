"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithPopup, signInWithCustomToken } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { authErrorMessage, EMAIL_RE, maskEmail, sendGoogleWelcome } from "@/lib/authHelpers";
import { AuthShell, GoogleButton, AuthInput, PasswordInput, AuthDivider, AuthSubmit } from "@/components/auth/AuthShell";
import { Captcha, CaptchaHandle } from "@/components/auth/Captcha";
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile";

export default function SignupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [step, setStep] = useState<"details" | "code">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<CaptchaHandle>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // already logged in → go to dashboard
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  // resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return;
    timerRef.current = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resendIn]);

  // ── Step 1: send code ──
  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setNotice("");
    if (!name.trim()) return setError("Please enter your name.");
    if (!EMAIL_RE.test(email)) return setError("Please enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (TURNSTILE_SITE_KEY && !captchaToken) return setError("Please complete the captcha.");

    setBusy(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, turnstileToken: captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't send the code. Please try again.");
        captchaRef.current?.reset(); setCaptchaToken("");
      } else {
        setStep("code");
        setNotice(`We sent a 6-digit code to ${maskEmail(email)}.`);
        setResendIn(60);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  };

  // ── Step 2: verify code → sign in ──
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code from your email.");

    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed. Please try again.");
        setBusy(false);
        return;
      }
      if (data.token) {
        await signInWithCustomToken(auth, data.token);
      }
      router.replace("/onboarding");
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      void sendGoogleWelcome(() => cred.user.getIdToken());
      router.replace("/onboarding");
    } catch (err) {
      setError(authErrorMessage((err as { code?: string })?.code ?? ""));
      setBusy(false);
    }
  };

  // ── Step 2 UI ──
  if (step === "code") {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`Enter the 6-digit code we sent to ${maskEmail(email)}.`}
        footer={
          <button
            onClick={() => {
              setStep("details");
              setCode("");
              setError("");
              setNotice("");
            }}
            className="font-semibold text-[#4fc3f7] hover:underline"
          >
            ← Use a different email
          </button>
        }
      >
        <form onSubmit={verifyCode} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13.5px] font-medium text-[#C9C8CE]">Verification code</span>
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              autoFocus
              className="h-14 rounded-md border border-[#2B2A30] bg-[#1A191D] text-center text-[26px] font-bold tracking-[12px] text-[#EDEDEF] outline-none transition-colors placeholder:text-[#66656D]/60 focus:border-[#0FA5E9] focus:ring-2 focus:ring-[#0FA5E9]/20"
            />
          </label>

          {error && (
            <p className="flex items-center gap-1.5 text-[14px] font-medium text-[#ff6b6b]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
            </p>
          )}
          {notice && !error && <p className="text-[14px] font-medium text-[#4fc3f7]">{notice}</p>}

          <AuthSubmit disabled={busy}>{busy ? "Verifying…" : "Verify & create account"}</AuthSubmit>

          <button
            type="button"
            disabled={resendIn > 0 || busy}
            onClick={() => sendCode()}
            className="text-center text-[13px] font-medium text-[#4fc3f7] hover:underline disabled:cursor-not-allowed disabled:text-[#66656D] disabled:no-underline"
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </button>
        </form>
      </AuthShell>
    );
  }

  // ── Step 1 UI ──
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start spying on your competitors in 60 seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#4fc3f7] hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <GoogleButton label="Sign up with Google" onClick={handleGoogle} disabled={busy} />

      <AuthDivider />

      <form onSubmit={sendCode} className="flex flex-col gap-3.5">
        <AuthInput label="Name" type="text" value={name} onChange={setName} placeholder="Your name" autoComplete="name" />
        <AuthInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" autoComplete="email" />
        <PasswordInput label="Password" value={password} onChange={setPassword} placeholder="At least 6 characters" autoComplete="new-password" showStrength />

        {error && (
          <p className="flex items-center gap-1.5 text-[14px] font-medium text-[#ff6b6b]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {error}
          </p>
        )}

        <Captcha ref={captchaRef} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} />

        <AuthSubmit disabled={busy}>{busy ? "Sending code…" : "Continue"}</AuthSubmit>
      </form>

      <p className="mt-4 text-center text-[12px] text-[#66656D]">
        By signing up you agree to our{" "}
        <Link href="/terms" className="underline hover:text-[#4fc3f7]">Terms</Link> and{" "}
        <Link href="/privacy" className="underline hover:text-[#4fc3f7]">Privacy Policy</Link>.
      </p>
    </AuthShell>
  );
}
