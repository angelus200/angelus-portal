export const ENV = {
  // Clerk Authentication
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",

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
