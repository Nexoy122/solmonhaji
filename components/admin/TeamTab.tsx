"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Send, Trash2, Check, Clock, Coins } from "lucide-react";

interface Invite {
  id: string; email: string; role: string; kind: string; note: string | null;
  expires_at: string; accepted_at: string | null; revoked_at: string | null; created_at: string;
}
interface Member { uid: string; email: string | null; role: string; granted_at: string }

const ROLES = [
  { id: "tester", label: "Beta Tester", blurb: "Full tool access to find bugs. No admin panel." },
  { id: "staff", label: "Staff", blurb: "View users & billing, approve waitlist." },
  { id: "admin", label: "Admin", blurb: "Staff, plus ban and manual activate." },
  { id: "super_admin", label: "Super Admin", blurb: "Full control, including inviting others." },
];

const ROLE_COLOR: Record<string, string> = {
  tester: "#118A3E", staff: "#1040C0", admin: "#FF0033", super_admin: "#7C3AED", user: "#8A8A8A",
};

const btn = "inline-flex items-center justify-center gap-2 border-2 border-black px-4 py-2.5 text-[12.5px] font-black uppercase tracking-wider transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";
const input = "w-full border-2 border-black bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-black outline-none placeholder:text-black/35";

// Grant credits to any user by email. Admin-only, reason required, audit-logged.
function GrantCredits({ authHeader }: { authHeader: () => Promise<Record<string, string>> }) {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ k: "ok" | "err"; m: string } | null>(null);

  const grant = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ email: email.trim(), amount: Number(amount), reason: reason.trim() }),
      });
      const d = await res.json();
      if (!res.ok) setMsg({ k: "err", m: d.error || "Couldn't grant credits." });
      else {
        setMsg({ k: "ok", m: `Gave ${d.amount.toLocaleString()} credits to ${d.email}. New balance: ${d.balance.toLocaleString()}.` });
        setEmail(""); setAmount(""); setReason("");
      }
    } catch { setMsg({ k: "err", m: "Network error." }); }
    setBusy(false);
  };

  return (
    <div className="border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_#121212]">
      <h2 className="flex items-center gap-2 text-[14px] font-black uppercase tracking-wide text-black">
        <Coins className="h-4 w-4" strokeWidth={2.5} /> Give credits
      </h2>
      <p className="mt-1 text-[12px] font-medium text-black/50">
        Credits land instantly. The account must already exist, and every grant is recorded in the audit log.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]">
        <div>
          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black/50">User email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="them@example.com" className={input} />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black/50">Credits</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="1000" className={input} />
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black/50">Reason</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. beta tester bonus, support goodwill" className={input} />
      </div>

      <button
        onClick={grant}
        disabled={busy || !email.trim() || !amount || !reason.trim()}
        className={`${btn} mt-4 bg-[#118A3E] text-white shadow-[3px_3px_0px_0px_#121212]`}
      >
        <Coins className="h-3.5 w-3.5" strokeWidth={3} /> {busy ? "Sending…" : "Give credits"}
      </button>

      {msg && <p className={`mt-3 text-[13px] font-bold ${msg.k === "ok" ? "text-[#118A3E]" : "text-[#FF0033]"}`}>{msg.m}</p>}
    </div>
  );
}

export function TeamTab({
  authHeader,
  canInviteTeam,
  canGrantCredits,
}: {
  authHeader: () => Promise<Record<string, string>>;
  canInviteTeam: boolean;
  canGrantCredits: boolean;
}) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [team, setTeam] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("tester");
  const [kind, setKind] = useState<"team" | "early_access">("team");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ k: "ok" | "err"; m: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/invites", { headers: await authHeader() });
      if (!res.ok) return;
      const d = await res.json();
      setInvites(d.invites ?? []);
      setTeam(d.team ?? []);
    } catch { /* ignore */ }
  }, [authHeader]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!email.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ email: email.trim(), role, kind, note: note.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ k: "err", m: d.error || "Couldn't send the invite." }); }
      else {
        setMsg({ k: "ok", m: `Invite sent to ${email.trim()}.` });
        setEmail(""); setNote("");
        await load();
      }
    } catch { setMsg({ k: "err", m: "Network error." }); }
    setBusy(false);
  };

  const revoke = async (body: Record<string, string>) => {
    try {
      await fetch("/api/admin/invites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify(body),
      });
      await load();
    } catch { /* ignore */ }
  };

  const pending = invites.filter((i) => !i.accepted_at && !i.revoked_at);

  return (
    <div className="mt-5 space-y-5">
      {canGrantCredits && <GrantCredits authHeader={authHeader} />}

      {/* Invite form */}
      <div className="border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_#121212]">
        <h2 className="flex items-center gap-2 text-[14px] font-black uppercase tracking-wide text-black">
          <Mail className="h-4 w-4" strokeWidth={2.5} /> Invite someone
        </h2>

        {/* kind switch */}
        <div className="mt-4 flex gap-2">
          {([["team", "Team member"], ["early_access", "Early access"]] as [typeof kind, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              disabled={k === "team" && !canInviteTeam}
              className={`border-2 border-black px-3.5 py-1.5 text-[12px] font-black uppercase tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                kind === k ? "bg-[#121212] text-white shadow-[3px_3px_0px_0px_#121212]" : "bg-white text-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {kind === "team" && !canInviteTeam && (
          <p className="mt-3 text-[12.5px] font-bold text-[#FF0033]">
            Only a Super Admin can grant team roles.
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black/50">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="them@example.com" className={input} />
          </div>
          {kind === "team" && (
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black/50">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={input}>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {kind === "team" && (
          <p className="mt-2 text-[12px] font-medium text-black/50">
            {ROLES.find((r) => r.id === role)?.blurb}
          </p>
        )}

        <div className="mt-3">
          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black/50">
            Personal note <span className="opacity-50">(optional)</span>
          </label>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Added to the email, e.g. 'Focus on the Script Generator this week'" className={input} />
        </div>

        <button onClick={send} disabled={busy || !email.trim() || (kind === "team" && !canInviteTeam)} className={`${btn} mt-4 bg-[#FF0033] text-white shadow-[3px_3px_0px_0px_#121212]`}>
          <Send className="h-3.5 w-3.5" strokeWidth={3} /> {busy ? "Sending…" : "Send invite"}
        </button>

        {msg && (
          <p className={`mt-3 text-[13px] font-bold ${msg.k === "ok" ? "text-[#118A3E]" : "text-[#FF0033]"}`}>{msg.m}</p>
        )}
      </div>

      {/* Pending invites */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#121212]">
        <div className="border-b-2 border-black px-5 py-3">
          <h2 className="text-[14px] font-black uppercase tracking-wide text-black">Pending invites ({pending.length})</h2>
        </div>
        {pending.length === 0 ? (
          <p className="px-5 py-6 text-center text-[13px] font-medium text-black/45">No pending invites.</p>
        ) : (
          <div className="divide-y-2 divide-black/10">
            {pending.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Clock className="h-4 w-4 shrink-0 text-black/30" strokeWidth={2.5} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-black">{i.email}</div>
                  <div className="text-[11.5px] font-medium text-black/45">
                    Expires {new Date(i.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <span className="border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: ROLE_COLOR[i.role] ?? "#8A8A8A" }}>
                  {i.kind === "early_access" ? "Early access" : i.role}
                </span>
                <button onClick={() => revoke({ id: i.id })} className="border-2 border-black bg-white px-2.5 py-1.5 text-[11px] font-black uppercase text-black transition-all active:translate-x-[1px] active:translate-y-[1px]">
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current team */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#121212]">
        <div className="border-b-2 border-black px-5 py-3">
          <h2 className="text-[14px] font-black uppercase tracking-wide text-black">Team ({team.length})</h2>
          <p className="mt-0.5 text-[12px] font-medium text-black/50">
            People who accepted a role invite. Owners set in the server config aren&apos;t listed and can&apos;t be removed here.
          </p>
        </div>
        {team.length === 0 ? (
          <p className="px-5 py-6 text-center text-[13px] font-medium text-black/45">Nobody yet. Invite someone above.</p>
        ) : (
          <div className="divide-y-2 divide-black/10">
            {team.map((m) => (
              <div key={m.uid} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Check className="h-4 w-4 shrink-0 text-[#118A3E]" strokeWidth={3} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-black">{m.email || m.uid.slice(0, 16)}</div>
                  <div className="text-[11.5px] font-medium text-black/45">
                    Joined {new Date(m.granted_at).toLocaleDateString()}
                  </div>
                </div>
                <span className="border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: ROLE_COLOR[m.role] ?? "#8A8A8A" }}>
                  {m.role}
                </span>
                {canInviteTeam && (
                  <button onClick={() => revoke({ uid: m.uid })} className="border-2 border-black bg-white px-2.5 py-1.5 text-[11px] font-black uppercase text-[#FF0033] transition-all active:translate-x-[1px] active:translate-y-[1px]">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
