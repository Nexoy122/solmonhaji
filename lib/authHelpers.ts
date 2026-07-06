// Friendly Firebase Auth error messages + shared helpers.

export function authErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support@vixo.live.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in.";
    case "auth/weak-password":
      return "Password is too weak — use at least 6 characters.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Pop-up blocked. Allow pop-ups and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fire the "first Google sign-in" welcome email (idempotent server-side).
// Best-effort: never blocks the redirect and swallows all errors.
export async function sendGoogleWelcome(getIdToken: () => Promise<string>): Promise<void> {
  try {
    const token = await getIdToken();
    await fetch("/api/auth/welcome-google", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    /* ignore — welcome email is non-critical */
  }
}

// Mask an email for display, e.g. "retronebulous0@gmail.com" → "retr*******@gmail.com".
// Keeps the first ~4 chars of the local part; domain stays visible.
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at < 1) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at); // includes "@"
  const keep = Math.min(4, Math.max(1, local.length - 1));
  const masked = local.slice(0, keep) + "*".repeat(Math.max(3, local.length - keep));
  return masked + domain;
}
