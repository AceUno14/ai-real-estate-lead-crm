"use server";

import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import {
  defaultOrganizationName,
  organizationSlugBase,
  resolveUniqueOrganizationSlug,
} from "@/lib/slug";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";

/**
 * Sign-up server action.
 *
 * Self-service registration provisions the user's first workspace
 * server-side (product decision D-026):
 *
 *   validate input → create User → create Organization (unique slug)
 *   → create Membership with role OWNER → success
 *
 * The whole provisioning step runs in one transaction, so a failed or
 * retried request cannot leave a user without a workspace or create a
 * second workspace for an existing account. Organization names/slugs and
 * role assignment are all derived on the server; nothing is trusted from
 * the client beyond the submitted name/email/password.
 */

const signUpSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

export type SignUpState = {
  error?: string;
  success?: boolean;
};

/** Generic, non-enumerating failure message (never leaks internals). */
const GENERIC_ERROR = "Unable to create an account with these details.";

export async function signUp(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input." };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    // Generic message: do not reveal whether the account exists.
    return { error: GENERIC_ERROR };
  }

  const passwordHash = await hashPassword(password);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash },
        select: { id: true },
      });

      const slug = await resolveUniqueOrganizationSlug(
        organizationSlugBase(name),
        async (candidate) => {
          const match = await tx.organization.findUnique({
            where: { slug: candidate },
            select: { id: true },
          });
          return match !== null;
        },
      );

      const organization = await tx.organization.create({
        data: { name: defaultOrganizationName(name), slug },
        select: { id: true },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "OWNER",
        },
      });
    });
  } catch (error) {
    // A unique-constraint failure means the request was retried (or raced)
    // with the same email/slug: the transaction rolled back, so no partial
    // or duplicate workspace was created.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: GENERIC_ERROR };
    }

    // Database/config failures degrade to the same safe message.
    return { error: GENERIC_ERROR };
  }

  return { success: true };
}
