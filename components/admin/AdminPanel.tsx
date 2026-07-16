"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";
import { Check, X, Search, ShieldAlert } from "lucide-react";

type Tab = "queue" | "users" | "audit";
type Status = "pending" | "invited" | "active" | "rejected" | "banned";

interface AccessUser {
  uid: string; email: string | null; name: string | null; status: Status;
  seq: number; signup_source: string | null; created_at: string;
}
interface Audit {
  id: string; admin_uid: string; action: string; target_type: string | null;
  target_id: string | null; details: Record<string, unknown> | null; created_at: string;
}

const STATUS_COLOR: Record<Status, string> = {
  pending: "#F0C020",
  invited: "#1040C0",
  active: "#118A3E",
  rejected: "#8A8A8A",
  banned: "#FF0033",
};

export function AdminPanel() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("queue");
  const [role, setRole] = useState<string>("user");
  const [checked, setChecked] = useState(false);
  const [denied, setDenied] = useState(false);

  const [users, setUsers] = useState<AccessUser[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [audit, setAudit] = useState<Audit[]>([]);
  const [filter, setFilter] = useState<string>("pending");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  // AdminGate has already proven the role server-side before mounting this, so
  // here we only need to know WHICH admin role, to show/hide admin-only actions.
  // (The APIs re-check on every call regardless; this is presentation only.)
  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      try {
        const res = await fetch("/api/admin/whoami", { headers: await authHeader() });
        if (res.status === 401 || res.status === 403) { setDenied(true); setChecked(true); return; }
        const d = await res.json();
        setRole(d.role ?? "user");
      } catch { setDenied(true); }
      setChecked(true);
    })();
  }, [user, loading, authHeader]);

  const loadUsers = useCallback(async (status: string) => {
    try {
      const res = await fetch(`/api/admin/users?status=${status}`, { headers: await authHeader() });
      if (res.status === 403) { setDenied(true); return; }
      const d = await res.json();
      setUsers(d.users ?? []);
      setStats(d.stats ?? {});
    } catch { /* ignore */ }
  }, [authHeader]);

  const loadAudit = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/audit", { headers: await authHeader() });
      if (res.ok) setAudit((await res.json()).entries ?? []);
    } catch { /* ignore */ }
  }, [authHeader]);

  useEffect(() => { if (checked && !denied) loadUsers(filter); }, [checked, denied, filter, loadUsers]);
  useEffect(() => { if (tab === "audit" && !denied) loadAudit(); }, [tab, denied, loadAudit]);

  const act = async (action: string, uids: string[], reason?: string) => {
    if (!uids.length) return;
    setBusy(uids[0]);
    try {
      await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ uids, action, reason }),
      });
      setSel(new Set());
      await loadUsers(filter);
    } catch { /* ignore */ }
    setBusy(null);
  };

  if (loading || !checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="loader-wrapper"><span className="loader-letter">Loading</span><div className="gloader" /></div>
      </div>
    );
  }

  // Give away nothing about the panel to non-admins.
  if (denied) {
    return (
      <main className="lp-root flex min-h-screen items-center justify-center bh-bg bh-text px-4">
        <div className="w-full max-w-sm border-4 bh-border bh-surface p-8 text-center bh-sh-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center border-2 bh-border bg-[#FF0033] text-white">
            <ShieldAlert className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 text-[22px] font-black uppercase tracking-tighter">Not found</h1>
          <p className="mt-2 text-[14px] font-medium opacity-60">You don&apos;t have access to this page.</p>
          <button onClick={() => router.replace("/dashboard")} className="mt-6 border-2 bh-border bh-surface bh-text px-5 py-2.5 text-[13px] font-black uppercase tracking-wider bh-sh-3">
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  const shown = users.filter((u) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (u.email ?? "").toLowerCase().includes(s) || (u.name ?? "").toLowerCase().includes(s) || u.uid.includes(s);
  });

  const canAdmin = role === "admin" || role === "super_admin";

  return (
    <main className="lp-root min-h-screen bh-bg bh-text antialiased">
      <header className="border-b-4 bh-border bh-bg">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 md:px-8">
          <Logo size={28} priority />
          <span className="text-[18px] font-black uppercase tracking-tighter">Admin</span>
          <span className="border-2 bh-border bg-[#121212] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
            {role.replace("_", " ")}
          </span>
          <button onClick={() => router.push("/dashboard")} className="ml-auto text-[12px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100">
            Back to app
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {([
            ["Pending", stats.pending ?? 0, "#F0C020"],
            ["Invited", stats.invited ?? 0, "#1040C0"],
            ["Active", stats.active ?? 0, "#118A3E"],
            ["Rejected", stats.rejected ?? 0, "#8A8A8A"],
            ["Banned", stats.banned ?? 0, "#FF0033"],
            ["Today", stats.today ?? 0, "#121212"],
          ] as [string, number, string][]).map(([label, n, c]) => (
            <div key={label} className="border-2 bh-border bh-surface p-4 bh-sh-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5" style={{ background: c }} />
                <span className="text-[11px] font-black uppercase tracking-widest opacity-50">{label}</span>
              </div>
              <div className="mt-1.5 text-[28px] font-black leading-none tabular-nums">{n}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-7 flex flex-wrap gap-2">
          {([["queue", "Approvals"], ["users", "All users"], ["audit", "Audit log"]] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); if (id === "queue") setFilter("pending"); if (id === "users") setFilter("all"); }}
              className={`border-2 bh-border px-4 py-2 text-[13px] font-black uppercase tracking-wide transition-all ${
                tab === id ? "bg-[#121212] text-white bh-sh-3" : "bh-surface bh-text hover:-translate-y-0.5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "audit" ? (
          <div className="mt-5 border-2 bh-border bh-surface bh-sh-4">
            <div className="border-b-2 bh-border px-5 py-3">
              <h2 className="text-[14px] font-black uppercase tracking-wide">Audit log</h2>
              <p className="mt-0.5 text-[12px] font-medium opacity-50">Append-only. Every admin action is recorded here.</p>
            </div>
            {audit.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13.5px] font-medium opacity-50">No actions logged yet.</p>
            ) : (
              <div className="divide-y-2 divide-black/10">
                {audit.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-[13px]">
                    <span className="border-2 bh-border bg-[#F0F0F0] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-black">
                      {a.action}
                    </span>
                    <span className="font-medium opacity-70">{a.target_id?.slice(0, 12)}…</span>
                    <span className="ml-auto text-[11.5px] font-medium opacity-40">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" strokeWidth={2.5} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search email, name, uid…"
                  className="w-[260px] border-2 bh-border bh-surface bh-text py-2 pl-9 pr-3 text-[13px] font-medium outline-none placeholder:opacity-40"
                />
              </div>
              {tab === "users" && (
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border-2 bh-border bh-surface bh-text px-3 py-2 text-[13px] font-bold uppercase tracking-wide outline-none"
                >
                  {["all", "pending", "invited", "active", "rejected", "banned"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
              {sel.size > 0 && (
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => act("approve", [...sel])}
                    className="inline-flex items-center gap-1.5 border-2 bh-border bg-[#118A3E] px-4 py-2 text-[12px] font-black uppercase tracking-wider text-white bh-sh-3 transition-all active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={4} /> Approve {sel.size}
                  </button>
                  <button
                    onClick={() => act("reject", [...sel])}
                    className="inline-flex items-center gap-1.5 border-2 bh-border bh-surface bh-text px-4 py-2 text-[12px] font-black uppercase tracking-wider bh-sh-3 transition-all active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={4} /> Reject {sel.size}
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto border-2 bh-border bh-surface bh-sh-4">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b-2 bh-border text-[11px] font-black uppercase tracking-widest opacity-50">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={shown.length > 0 && sel.size === shown.length}
                        onChange={(e) => setSel(e.target.checked ? new Set(shown.map((u) => u.uid)) : new Set())}
                        className="h-4 w-4 accent-[#FF0033]"
                      />
                    </th>
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">User</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Signed up</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-[13.5px] font-medium opacity-50">
                      {filter === "pending" ? "Nobody waiting. Queue is clear." : "No users match."}
                    </td></tr>
                  ) : shown.map((u) => (
                    <tr key={u.uid} className="border-b-2 border-black/10 last:border-0">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={sel.has(u.uid)}
                          onChange={(e) => {
                            const n = new Set(sel);
                            if (e.target.checked) n.add(u.uid); else n.delete(u.uid);
                            setSel(n);
                          }}
                          className="h-4 w-4 accent-[#FF0033]"
                        />
                      </td>
                      <td className="px-3 py-3 text-[12px] font-bold tabular-nums opacity-40">{u.seq}</td>
                      <td className="px-3 py-3">
                        <div className="text-[13.5px] font-bold">{u.name || "–"}</div>
                        <div className="text-[12px] font-medium opacity-55">{u.email || u.uid.slice(0, 16)}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white"
                          style={{ background: STATUS_COLOR[u.status] }}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[12px] font-medium opacity-55">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1.5">
                          {(u.status === "pending" || u.status === "invited") && (
                            <button
                              onClick={() => act("approve", [u.uid])}
                              disabled={busy === u.uid}
                              className="border-2 border-black bg-[#118A3E] px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
                            >
                              {busy === u.uid ? "…" : u.status === "invited" ? "Resend" : "Approve"}
                            </button>
                          )}
                          {u.status !== "banned" && u.status !== "rejected" && (
                            <button
                              onClick={() => act("reject", [u.uid])}
                              className="border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-black transition-all active:translate-x-[1px] active:translate-y-[1px]"
                            >
                              Reject
                            </button>
                          )}
                          {canAdmin && u.status === "banned" && (
                            <button
                              onClick={() => act("unban", [u.uid])}
                              className="border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-black"
                            >
                              Unban
                            </button>
                          )}
                          {canAdmin && u.status === "active" && (
                            <button
                              onClick={() => {
                                const reason = prompt("Reason for banning this user?");
                                if (reason?.trim()) act("ban", [u.uid], reason.trim());
                              }}
                              className="border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-[#FF0033]"
                            >
                              Ban
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
