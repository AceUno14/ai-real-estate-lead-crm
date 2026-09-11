/**
 * Organization slug / name helpers.
 *
 * Self-service sign-up creates the user's first workspace, so the default
 * organization name is derived from the submitted account name and the
 * slug is generated server-side. These helpers are pure (the uniqueness
 * check is injected as a predicate) so they can be unit tested without a
 * database.
 */

const MAX_SLUG_LENGTH = 48;
const FALLBACK_SLUG = "workspace";

/** Converts arbitrary text into a lowercase, hyphenated slug. */
export function slugify(input: string): string {
  const normalized = input
    .normalize("NFKD")
    // Strip combining diacritical marks left behind by NFKD.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // Any run of unsupported characters becomes a single hyphen.
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
}

/**
 * Sensible default workspace name based on the submitted account name,
 * with a fallback when no usable name was provided.
 */
export function defaultOrganizationName(accountName: string): string {
  const trimmed = accountName.trim().replace(/\s+/g, " ");
  // Only use the submitted name when it has sluggable content; otherwise
  // fall back so that names like "!!!" or non-latin scripts still get a
  // sensible, safe workspace name and slug.
  return slugify(trimmed).length > 0 ? `${trimmed} Realty` : "My Realty Workspace";
}

/** Slug base for a new workspace, guaranteed to be non-empty. */
export function organizationSlugBase(accountName: string): string {
  return slugify(defaultOrganizationName(accountName)) || FALLBACK_SLUG;
}

/**
 * Resolves a slug that is not already taken, appending a numeric suffix
 * (then a random one if many collisions occur). The caller supplies the
 * uniqueness check so this works inside a Prisma transaction.
 */
export async function resolveUniqueOrganizationSlug(
  baseSlug: string,
  isSlugTaken: (slug: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  const base = slugify(baseSlug) || FALLBACK_SLUG;

  if (!(await isSlugTaken(base))) {
    return base;
  }

  for (let attempt = 2; attempt <= maxAttempts; attempt += 1) {
    const candidate = `${base}-${attempt}`;
    if (!(await isSlugTaken(candidate))) {
      return candidate;
    }
  }

  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
