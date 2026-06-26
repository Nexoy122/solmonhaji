// ── Discord OAuth config (server-side only) ────────────────────────────────────
// "Login with Discord" → authorize (identify + guilds.join) → add to server + role.

export const discordConfig = {
  clientId: process.env.DISCORD_CLIENT_ID?.trim() || "",
  clientSecret: process.env.DISCORD_CLIENT_SECRET?.trim() || "",
  botToken: process.env.DISCORD_BOT_TOKEN?.trim() || "",
  guildId: process.env.DISCORD_GUILD_ID?.trim() || "",
  roleId: process.env.DISCORD_JOIN_ROLE_ID?.trim() || "",
  redirectUri: process.env.DISCORD_REDIRECT_URI?.trim() || "",
};

export const DISCORD_SCOPES = ["identify", "guilds.join"];

export function isDiscordConfigured(): boolean {
  const c = discordConfig;
  return Boolean(c.clientId && c.clientSecret && c.botToken && c.guildId && c.redirectUri);
}

/** Build the Discord authorize URL the user is sent to. */
export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: discordConfig.clientId,
    redirect_uri: discordConfig.redirectUri,
    response_type: "code",
    scope: DISCORD_SCOPES.join(" "),
    state,
    prompt: "consent",
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}
