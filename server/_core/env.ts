export const ENV = {
  // Clerk Authentication (wird in Etappe D entfernt — bis dahin Dual-Auth-Fallback)
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",

  // Custom Auth (server-only, KEIN VITE_ — Laufzeit, nicht Build-Zeit)
  authSecret: process.env.AUTH_SECRET ?? "",        // HMAC-Pepper für Session-Token-Hash
  totpEncSecret: process.env.TOTP_ENC_SECRET ?? "", // AES-256-GCM-Schlüssel für totpSecret at rest

  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Environment
  isProduction: process.env.NODE_ENV === "production",

  // Forge (optional)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_PUBLISHABLE_KEY: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",

  // Resend (Email)
  RESEND_API_KEY: process.env.Resend ?? "",

  // Anthropic (KI-Extraktion)
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
};
