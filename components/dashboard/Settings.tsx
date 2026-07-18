"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { useCredits, CreditIcon } from "@/components/dashboard/CreditsContext";

type Tab = "account" | "security" | "billing" | "notifications" | "danger";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "account", label: "Account", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { id: "security", label: "Security", icon: "M12 2l8 4v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-4z" },
  { id: "billing", label: "Billing", icon: "M2 7h20v12H2zM2 11h20M6 15h4" },
  { id: "notifications", label: "Notifications", icon: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" },
  { id: "danger", label: "Danger Zone", icon: "M12 2 2 20h20L12 2zM12 9v5M12 17h.01" },
];

const NOTIFS: { key: string; label: string; desc: string }[] = [
  { key: "email_product_updates", label: "Product updates", desc: "New tools and features when they ship." },
  { key: "email_weekly_digest", label: "Weekly digest", desc: "What's blowing up in your niches each week." },
  { key: "email_marketing", label: "Offers & tips", desc: "Occasional deals and growth tips." },
];

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// Section wrapper: a hard-bordered Bauhaus card.
function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-none border-2 border-black bg-white p-6 shadow-[5px_5px_0px_0px_#121212]">
      <h3 className="text-[17px] font-black uppercase tracking-tight text-black">{title}</h3>
      {desc && <p className="mt-1 text-[13.5px] font-medium text-black/60">{desc}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full rounded-none border-2 border-black bg-white px-3.5 py-2.5 text-[14px] font-medium text-black outline-none transition-shadow focus:shadow-[3px_3px_0px_0px_#1040C0] placeholder:text-black/35";
const btnCls =
  "inline-flex items-center justify-center gap-2 rounded-none border-2 border-black bg-[#D02020] px-5 py-2.5 text-[13px] font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-none border-2 border-black bg-white px-5 py-2.5 text-[13px] font-black uppercase tracking-wider text-black shadow-[3px_3px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";

// Small inline status line.
function Note({ kind, children }: { kind: "ok" | "err"; children: React.ReactNode }) {
  return (
    <p className={`mt-3 text-[13px] font-bold ${kind === "ok" ? "text-[#118A3E]" : "text-[#D02020]"}`}>{children}</p>
  );
}

export function Settings() {
  const { user, signOut } = useAuth();
  const { balance, plan } = useCredits();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("account");

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  // Is this a password account, or Google-only? Determines which re-auth to use.
  const providers = user?.providerData.map((p) => p.providerId) ?? [];
  const hasPassword = providers.includes("password");
  const hasGoogle = providers.includes("google.com");

  // Re-authenticate before a sensitive change. Firebase requires this and it's
  // the spec's core rule, no password/email change without proving identity.
  const reauth = async (password?: string) => {
    if (!user?.email) throw new Error("No account email.");
    if (hasPassword) {
      if (!password) throw new Error("Enter your current password.");
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    } else {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
    }
  };

  return (
    <div className="dash-fade-up w-full">
      <p className="mb-5 text-[14px] text-on-surface-variant">Manage your account, billing, and preferences.</p>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Tabs */}
        <nav className="flex shrink-0 flex-row gap-2 overflow-x-auto lg:w-[210px] lg:flex-col lg:overflow-visible">
          {TABS.map((t) => {
            const on = tab === t.id;
            const danger = t.id === "danger";
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2.5 rounded-none border-2 border-black px-4 py-2.5 text-[13px] font-black uppercase tracking-wide transition-all ${
                  on
                    ? `${danger ? "bg-[#D02020]" : "bg-[#121212]"} text-white shadow-[3px_3px_0px_0px_#121212]`
                    : `bg-white ${danger ? "text-[#D02020]" : "text-black"} hover:-translate-y-0.5`
                }`}
              >
                <Icon d={t.icon} size={16} /> {t.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 space-y-5">
          {tab === "account" && <AccountSection user={user} reauth={reauth} hasPassword={hasPassword} />}
          {tab === "security" && (
            <SecuritySection
              reauth={reauth}
              hasPassword={hasPassword}
              hasGoogle={hasGoogle}
              email={user?.email ?? null}
              authHeader={authHeader}
              onSignedOutEverywhere={async () => { await signOut(); router.replace("/login"); }}
            />
          )}
          {tab === "billing" && <BillingSection authHeader={authHeader} plan={plan} balance={balance} />}
          {tab === "notifications" && <NotificationsSection authHeader={authHeader} />}
          {tab === "danger" && (
            <DangerSection
              authHeader={authHeader}
              reauth={reauth}
              hasPassword={hasPassword}
              onDeleted={async () => { await signOut(); router.replace("/"); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── ACCOUNT ──────────────────────────────────────────────────────────────── */
function AccountSection({
  user,
  reauth,
  hasPassword,
}: {
  user: ReturnType<typeof useAuth>["user"];
  reauth: (pw?: string) => Promise<void>;
  hasPassword: boolean;
}) {
  const [name, setName] = useState(user?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ k: "ok" | "err"; m: string } | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ k: "ok" | "err"; m: string } | null>(null);

  useEffect(() => { setName(user?.displayName ?? ""); }, [user]);

  const saveName = async () => {
    if (!user) return;
    setSavingName(true); setNameMsg(null);
    try {
      await updateProfile(user, { displayName: name.trim() });
      setNameMsg({ k: "ok", m: "Saved." });
    } catch {
      setNameMsg({ k: "err", m: "Couldn't save your name." });
    }
    setSavingName(false);
  };

  // Email changes never apply immediately: Firebase emails the NEW address and
  // only switches once that link is clicked (the spec's rule, handled natively).
  const changeEmail = async () => {
    if (!user || !newEmail.trim()) return;
    setSavingEmail(true); setEmailMsg(null);
    try {
      await reauth(emailPw);
      await verifyBeforeUpdateEmail(user, newEmail.trim());
      setEmailMsg({ k: "ok", m: `Check ${newEmail.trim()} for a confirmation link. Your email changes once you click it.` });
      setNewEmail(""); setEmailPw("");
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setEmailMsg({
        k: "err",
        m: code.includes("wrong-password") || code.includes("invalid-credential")
          ? "That password is incorrect."
          : code.includes("email-already-in-use")
          ? "That email is already in use."
          : code.includes("requires-recent-login")
          ? "Please sign in again, then retry."
          : "Couldn't change your email.",
      });
    }
    setSavingEmail(false);
  };

  return (
    <>
      <Card title="Profile" desc="This name shows up around the app.">
        <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-black/50">Display name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Your name" className={inputCls} />
        <div className="mt-4">
          <button onClick={saveName} disabled={savingName} className={btnCls}>
            {savingName ? "Saving…" : "Save name"}
          </button>
        </div>
        {nameMsg && <Note kind={nameMsg.k}>{nameMsg.m}</Note>}
      </Card>

      <Card title="Email address" desc="We'll send a confirmation link to the new address before anything changes.">
        <div className="mb-4 flex items-center gap-2.5 border-2 border-black bg-[#F0F0F0] px-3.5 py-2.5">
          <Icon d="M4 4h16v16H4zM22 6l-10 7L2 6" size={16} />
          <span className="text-[14px] font-bold text-black">{user?.email}</span>
          {user?.emailVerified ? (
            <span className="ml-auto border-2 border-black bg-[#118A3E] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">Verified</span>
          ) : (
            <span className="ml-auto border-2 border-black bg-[#F0C020] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">Unverified</span>
          )}
        </div>

        <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-black/50">New email</label>
        <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="you@example.com" className={inputCls} />

        {hasPassword && (
          <>
            <label className="mb-1.5 mt-4 block text-[12px] font-bold uppercase tracking-wider text-black/50">Current password</label>
            <input value={emailPw} onChange={(e) => setEmailPw(e.target.value)} type="password" placeholder="••••••••" className={inputCls} />
          </>
        )}

        <div className="mt-4">
          <button onClick={changeEmail} disabled={savingEmail || !newEmail.trim()} className={btnCls}>
            {savingEmail ? "Sending…" : "Send confirmation"}
          </button>
        </div>
        {emailMsg && <Note kind={emailMsg.k}>{emailMsg.m}</Note>}
      </Card>
    </>
  );
}

/* ── SECURITY ─────────────────────────────────────────────────────────────── */
function SecuritySection({
  reauth,
  hasPassword,
  hasGoogle,
  email,
  authHeader,
  onSignedOutEverywhere,
}: {
  reauth: (pw?: string) => Promise<void>;
  hasPassword: boolean;
  hasGoogle: boolean;
  email: string | null;
  authHeader: () => Promise<Record<string, string>>;
  onSignedOutEverywhere: () => Promise<void>;
}) {
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ k: "ok" | "err"; m: string } | null>(null);
  const [outBusy, setOutBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<string>("");

  const changePassword = async () => {
    setBusy(true); setMsg(null);
    try {
      if (newPw.length < 8) throw new Error("short");
      await reauth(curPw);
      await updatePassword(auth.currentUser!, newPw);
      setMsg({ k: "ok", m: "Password changed. Other devices will need to sign in again." });
      setCurPw(""); setNewPw("");
      // Changing a password should end other sessions (spec section 3).
      await fetch("/api/settings/sessions", { method: "POST", headers: await authHeader() }).catch(() => {});
    } catch (e) {
      const code = (e as { code?: string; message?: string }).code ?? (e as Error).message ?? "";
      setMsg({
        k: "err",
        m: code === "short"
          ? "Use at least 8 characters."
          : code.includes("wrong-password") || code.includes("invalid-credential")
          ? "That current password is incorrect."
          : code.includes("weak-password")
          ? "That password is too weak."
          : "Couldn't change your password.",
      });
    }
    setBusy(false);
  };

  const signOutEverywhere = async () => {
    setOutBusy(true);
    try {
      await fetch("/api/settings/sessions", { method: "POST", headers: await authHeader() });
      await onSignedOutEverywhere();
    } catch { setOutBusy(false); }
  };

  return (
    <>
      {hasPassword ? (
        <Card title="Change password" desc="You'll need your current password. Other devices get signed out.">
          <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-black/50">Current password</label>
          <input value={curPw} onChange={(e) => setCurPw(e.target.value)} type="password" placeholder="••••••••" className={inputCls} />
          <label className="mb-1.5 mt-4 block text-[12px] font-bold uppercase tracking-wider text-black/50">New password</label>
          <input value={newPw} onChange={(e) => setNewPw(e.target.value)} type="password" placeholder="At least 8 characters" className={inputCls} />
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={changePassword} disabled={busy || !curPw || !newPw} className={btnCls}>
              {busy ? "Saving…" : "Change password"}
            </button>
            <button
              onClick={async () => {
                if (!email) return;
                try { await sendPasswordResetEmail(auth, email); setResetMsg("Reset link sent."); }
                catch { setResetMsg("Couldn't send the reset link."); }
              }}
              className={btnGhost}
            >
              Email me a reset link
            </button>
          </div>
          {msg && <Note kind={msg.k}>{msg.m}</Note>}
          {resetMsg && <Note kind="ok">{resetMsg}</Note>}
        </Card>
      ) : (
        <Card title="Password" desc="You sign in with Google, so there's no password on this account.">
          <button
            onClick={async () => {
              if (!email) return;
              try { await sendPasswordResetEmail(auth, email); setResetMsg("Check your inbox to set a password."); }
              catch { setResetMsg("Couldn't send the email."); }
            }}
            className={btnGhost}
          >
            Set a password
          </button>
          {resetMsg && <Note kind="ok">{resetMsg}</Note>}
        </Card>
      )}

      <Card title="Connected accounts" desc="How you sign in.">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 border-2 border-black bg-[#F0F0F0] px-3.5 py-3">
            <Icon d="M4 4h16v16H4zM22 6l-10 7L2 6" size={16} />
            <span className="text-[13.5px] font-bold text-black">Email &amp; password</span>
            <span className={`ml-auto border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${hasPassword ? "bg-[#118A3E] text-white" : "bg-white text-black/50"}`}>
              {hasPassword ? "Connected" : "Not set"}
            </span>
          </div>
          <div className="flex items-center gap-3 border-2 border-black bg-[#F0F0F0] px-3.5 py-3">
            <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v8M8 12h8" size={16} />
            <span className="text-[13.5px] font-bold text-black">Google</span>
            <span className={`ml-auto border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${hasGoogle ? "bg-[#118A3E] text-white" : "bg-white text-black/50"}`}>
              {hasGoogle ? "Connected" : "Not linked"}
            </span>
          </div>
        </div>
        <p className="mt-4 text-[12.5px] font-medium text-black/50">
          We keep at least one sign-in method on every account, so the last one can&apos;t be removed.
        </p>
      </Card>

      <Card title="Active sessions" desc="Signed in somewhere you don't recognise? End every session and sign in again.">
        <button onClick={signOutEverywhere} disabled={outBusy} className={btnGhost}>
          {outBusy ? "Signing out…" : "Sign out everywhere"}
        </button>
      </Card>
    </>
  );
}

/* ── BILLING ──────────────────────────────────────────────────────────────── */
interface Tx { amount: number; type: string; reference_id: string | null; balance_after: number; created_at: string }

const TX_LABEL: Record<string, string> = {
  signup: "Welcome credits",
  weekly_free: "Weekly free credits",
  purchase: "Credit purchase",
  subscription_renewal: "Plan renewal",
  usage: "Tool usage",
  refund: "Refund",
  bonus: "Bonus",
};

function BillingSection({
  authHeader,
  plan,
  balance,
}: {
  authHeader: () => Promise<Record<string, string>>;
  plan: string;
  balance: number | null;
}) {
  const [data, setData] = useState<{ plan: string; balance: number; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; transactions: Tx[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/billing", { headers: await authHeader() });
        if (res.ok) setData(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [authHeader]);

  const shownPlan = data?.plan ?? plan;
  const shownBalance = data?.balance ?? balance;
  const paid = shownPlan !== "free";

  return (
    <>
      <Card title="Your plan" desc="Payments are currently unavailable. Stay tuned for updates.">
        <div className="flex flex-wrap items-center gap-4">
          <span className="border-2 border-black bg-[#D02020] px-4 py-2 text-[15px] font-black uppercase tracking-wide text-white shadow-[3px_3px_0px_0px_#121212]">
            {shownPlan}
          </span>
          <span className="inline-flex items-center gap-2 border-2 border-black bg-white px-3.5 py-2 text-[14px] font-black tabular-nums text-black">
            <CreditIcon size={16} /> {shownBalance != null && shownBalance >= 0 ? shownBalance.toLocaleString() : "–"} credits
          </span>
          {data?.cancelAtPeriodEnd && (
            <span className="border-2 border-black bg-[#F0C020] px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-black">
              Cancels at period end
            </span>
          )}
        </div>

        {data?.currentPeriodEnd && (
          <p className="mt-4 text-[13px] font-medium text-black/60">
            {data.cancelAtPeriodEnd ? "Access ends" : "Renews"} on{" "}
            {new Date(data.currentPeriodEnd).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/dashboard/plans" className={btnCls}>
            View plans
          </Link>
          {paid && (
            <button disabled className={`${btnGhost} cursor-not-allowed opacity-60`}>
              Manage subscription
            </button>
          )}
        </div>
        <p className="mt-4 text-[12.5px] font-medium text-black/50">
          Payments are currently unavailable. Stay tuned for updates.
        </p>
      </Card>

      <Card title="Credit history" desc="Your most recent credit activity.">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse bg-[#F0F0F0]" />)}
          </div>
        ) : !data?.transactions.length ? (
          <p className="text-[13.5px] font-medium text-black/50">No credit activity yet.</p>
        ) : (
          <div className="divide-y-2 divide-black/10">
            {data.transactions.map((t, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black text-[12px] font-black ${t.amount >= 0 ? "bg-[#118A3E] text-white" : "bg-white text-black"}`}>
                  {t.amount >= 0 ? "+" : "−"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-black">{TX_LABEL[t.type] ?? t.type}</p>
                  <p className="text-[11.5px] font-medium text-black/45">
                    {new Date(t.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <span className="shrink-0 text-[13.5px] font-black tabular-nums text-black">
                  {t.amount >= 0 ? "+" : ""}{t.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

/* ── NOTIFICATIONS ────────────────────────────────────────────────────────── */
function NotificationsSection({ authHeader }: { authHeader: () => Promise<Record<string, string>> }) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings", { headers: await authHeader() });
        const d = await res.json();
        if (d.prefs) setPrefs(d.prefs);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [authHeader]);

  // Autosave on toggle (spec section 10: no "unsaved changes" surprises).
  const toggle = async (key: string) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ prefs: next }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <Card title="Email preferences" desc="Security and billing emails always send, so you're never caught out.">
      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse bg-[#F0F0F0]" />)}</div>
      ) : (
        <div className="space-y-3">
          {NOTIFS.map((n) => {
            const on = prefs[n.key] ?? true;
            return (
              <button
                key={n.key}
                onClick={() => toggle(n.key)}
                className="flex w-full items-center gap-4 border-2 border-black bg-white px-4 py-3 text-left transition-all hover:-translate-y-0.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-black uppercase tracking-tight text-black">{n.label}</p>
                  <p className="text-[12.5px] font-medium text-black/55">{n.desc}</p>
                </div>
                <span className={`relative h-6 w-11 shrink-0 border-2 border-black transition-colors ${on ? "bg-[#118A3E]" : "bg-white"}`}>
                  <span className={`absolute top-[1px] h-[18px] w-[18px] border-2 border-black bg-white transition-all ${on ? "left-[21px]" : "left-[1px]"}`} />
                </span>
              </button>
            );
          })}
        </div>
      )}
      {saved && <Note kind="ok">Saved.</Note>}
    </Card>
  );
}

/* ── DANGER ZONE ──────────────────────────────────────────────────────────── */
function DangerSection({
  authHeader,
  reauth,
  hasPassword,
  onDeleted,
}: {
  authHeader: () => Promise<Record<string, string>>;
  reauth: (pw?: string) => Promise<void>;
  hasPassword: boolean;
  onDeleted: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const del = async () => {
    setBusy(true); setErr("");
    try {
      // Re-auth first so the server sees a fresh auth_time.
      await reauth(pw);
      const res = await fetch("/api/settings/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ confirm }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't delete the account.");
      await onDeleted();
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setErr(
        code.includes("wrong-password") || code.includes("invalid-credential")
          ? "That password is incorrect."
          : (e as Error).message || "Couldn't delete the account."
      );
      setBusy(false);
    }
  };

  return (
    <>
      <Card title="Subscription management" desc="Payments are currently unavailable. Stay tuned for updates.">
        <button
          disabled
          className={`${btnGhost} cursor-not-allowed opacity-60`}
        >
          Stay tuned
        </button>
      </Card>

      <div className="rounded-none border-4 border-[#D02020] bg-white p-6 shadow-[5px_5px_0px_0px_#D02020]">
        <h3 className="text-[17px] font-black uppercase tracking-tight text-[#D02020]">Delete account</h3>
        <p className="mt-1 text-[13.5px] font-medium text-black/60">
          Cancels any active subscription and closes your account. You have 30 days to contact
          support and restore it, after which everything is permanently erased.
        </p>

        {!open ? (
          <button onClick={() => setOpen(true)} className={`${btnCls} mt-5`}>
            Delete my account
          </button>
        ) : (
          <div className="mt-5 border-2 border-black bg-[#F0F0F0] p-4">
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-black/60">
              Type <span className="text-[#D02020]">DELETE</span> to confirm
            </label>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" className={inputCls} />

            {hasPassword && (
              <>
                <label className="mb-1.5 mt-4 block text-[12px] font-bold uppercase tracking-wider text-black/60">Your password</label>
                <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="••••••••" className={inputCls} />
              </>
            )}
            {!hasPassword && (
              <p className="mt-3 text-[12.5px] font-medium text-black/60">You&apos;ll be asked to confirm with Google.</p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={del} disabled={busy || confirm !== "DELETE" || (hasPassword && !pw)} className={btnCls}>
                {busy ? "Deleting…" : "Permanently delete"}
              </button>
              <button onClick={() => { setOpen(false); setConfirm(""); setPw(""); setErr(""); }} className={btnGhost}>
                Cancel
              </button>
            </div>
            {err && <Note kind="err">{err}</Note>}
          </div>
        )}
      </div>
    </>
  );
}
