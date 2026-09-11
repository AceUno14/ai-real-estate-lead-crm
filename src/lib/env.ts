import { z } from "zod";

/**
 * Typed, validated environment access.
 *
 * Rules (AI_CONTEXT.md security rules):
 * - never log raw env values or secrets
 * - secrets stay server-side; NEXT_PUBLIC_* values are safe for the browser
 * - the AI provider is selected via AI_PROVIDER (default: mock)
 *
 * DB/auth vars are optional at build time: they are validated lazily the
 * first time a runtime consumer actually needs them. This keeps
 * `next build` working without a database connection on the build machine.
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("AI Real Estate Lead CRM"),
});

/** Optional URL variable: an empty string (as in .env.example) means unset. */
const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.url().optional(),
);

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  DIRECT_URL: optionalUrl,
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.url().default("http://localhost:3000"),
  AI_PROVIDER: z.enum(["mock", "openai-compatible"]).default("mock"),
  AI_MODEL: z.string().default("mock-real-estate-qualifier-v1"),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: optionalUrl,
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  PUBLIC_LEAD_ORG_SLUG: z.string().default("demo-realty"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Validated public (browser-safe) environment. Safe to import anywhere. */
export const publicEnv: PublicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.APP_NAME,
});

/**
 * Default workspace slug used only by the legacy `/lead` route, which
 * redirects to its workspace-specific URL `/lead/[organizationSlug]`.
 *
 * Read directly (with the same fallback as the schema) instead of through
 * `getServerEnv()` so the redirect does not require DATABASE_URL/AUTH_SECRET
 * to be present just to compute a URL.
 */
export function getDefaultPublicLeadOrgSlug(): string {
  const value = process.env.PUBLIC_LEAD_ORG_SLUG?.trim();
  return value && value.length > 0 ? value : "demo-realty";
}

let cachedServerEnv: ServerEnv | null = null;

/**
 * Validated server environment. Server-only: throws if a required variable
 * is missing when a runtime consumer actually needs it.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_BASE_URL: process.env.AI_BASE_URL,
    AI_TIMEOUT_MS: process.env.AI_TIMEOUT_MS,
    PUBLIC_LEAD_ORG_SLUG: process.env.PUBLIC_LEAD_ORG_SLUG,
  });

  if (!parsed.success) {
    // Never log values — only the variable names that failed.
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(
      `Invalid environment configuration. Check .env against .env.example. Offending variables: ${missing}`,
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}
