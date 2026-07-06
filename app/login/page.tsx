"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { authErrorMessage, EMAIL_RE, sendGoogleWelcome } from "@/lib/authHelpers";
import { AuthShell, GoogleButton, AuthInput, PasswordInput, AuthDivider, AuthSubmit } from "@/components/auth/AuthShell";
import { Captcha, CaptchaHandle } from "@/components/auth/Captcha";
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile";
import { useRef } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<CaptchaHandle>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setNotice("");
    if (!EMAIL_RE.test(email)) return setError("Please enter a valid email address.");
    if (!password) return setError("Please enter your password.");
    if (TURNSTILE_SITE_KEY && !captchaToken) return setError("Please complete the captcha.");

    setBusy(true);
    try {
      // Verify the captcha token server-side before signing in.
      if (captchaToken) {
        const v = await fetch("/api/verify-turnstile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: captchaToken }),
        });
        if (!v.ok) {
          setError("Captcha check failed. Please try again.");
          captchaRef.current?.reset(); setCaptchaToken("");
          setBusy(false); return;
        }
      }
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(authErrorMessage((err as { code?: string })?.code ?? ""));
      captchaRef.current?.reset(); setCaptchaToken("");
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(""); setNotice("");
    setBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      // First-time Google users get a welcome email (server dedupes repeat logins).
      void sendGoogleWelcome(() => cred.user.getIdToken());
      router.replace("/dashboard");
    } catch (err) {
      setError(authErrorMessage((err as { code?: string })?.code ?? ""));
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setError(""); setNotice("");
    if (!EMAIL_RE.test(email)) return setError("Enter your email above first, then click reset.");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(authErrorMessage((err as { code?: string })?.code ?? ""));
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your NicheSpy dashboard."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-[#4fc3f7] hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <GoogleButton label="Continue with Google" onClick={handleGoogle} disabled={busy} />

      <AuthDivider />

      <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
        <AuthInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" autoComplete="email" />
        <PasswordInput label="Password" value={password} onChange={setPassword} placeholder="Your password" autoComplete="current-password" />

        <button type="button" onClick={handleReset} className="self-end text-[13px] font-medium text-[#4fc3f7] hover:underline">
          Forgot password?
        </button>

        {error && (
          <p className="flex items-center gap-1.5 text-[14px] font-medium text-[#ff6b6b]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {error}
          </p>
        )}
        {notice && <p className="text-[14px] font-medium text-[#4fc3f7]">{notice}</p>}

        <Captcha ref={captchaRef} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} />

        <AuthSubmit disabled={busy}>{busy ? "Logging in…" : "Log in"}</AuthSubmit>
      </form>
    </AuthShell>
  );
}
