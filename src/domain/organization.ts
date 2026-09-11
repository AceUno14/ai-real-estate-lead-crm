import { z } from "zod";

/**
 * Organization (workspace) slug domain schema.
 *
 * Public lead capture is workspace-specific: the form lives at
 * `/lead/[organizationSlug]`. The slug is only a routing/selection key —
 * the trusted `organizationId` is always resolved server-side from it and
 * is never accepted from the browser (DECISIONS.md D-005 / D-027).
 */
export const organizationSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid organization slug");

export type OrganizationSlug = z.infer<typeof organizationSlugSchema>;
