import "dotenv/config";
import { afterAll, describe, expect, it, vi } from "vitest";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Self-service sign-up provisioning tests (live database, D-026).
 *
 * Verifies that a successful sign-up creates exactly one User, exactly one
 * Organization (OWNER membership), that the new user can resolve their
 * active organization, that the dashboard tenant guard accepts them, and
 * that retries do not create duplicate workspaces.
 *
 * All data is fictional and is removed in afterAll.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const runId = Date.now().toString(36);
let counter = 0;
const createdEmails: string[] = [];

function nextEmail(prefix: string): string {
  counter += 1;
  const email = `${prefix}-${runId}-${counter}@example.com`;
  createdEmails.push(email);
  return email;
}

function signUpForm(name: string, email: string): FormData {
  const formData = new FormData();
  formData.set("name", name);
  formData.set("email", email);
  formData.set("password", "fictional-pass-2026");
  return formData;
}

async function findUserWithOrganizations(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      memberships: {
        select: {
          role: true,
          organization: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
}

afterAll(async () => {
  // Clean up whatever this test created, even if a test failed midway.
  const users = await prisma.user.findMany({
    where: { email: { in: createdEmails } },
    select: { id: true, memberships: { select: { organizationId: true } } },
  });
  const organizationIds = users.flatMap((user) =>
    user.memberships.map((membership) => membership.organizationId),
  );

  if (organizationIds.length > 0) {
    // Deleting the organization cascades its memberships.
    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
  }
  if (createdEmails.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
  }

  await prisma.$disconnect();
});

describe("self-service sign-up (live database)", () => {
  it("creates a user, exactly one organization, and an OWNER membership", async () => {
    const { signUp } = await import("@/server/auth/sign-up");

    const name = `Fictional Agent ${runId}`;
    const email = nextEmail("signup-owner");
    // Scoped to this run's slug prefix so parallel test files cannot affect it.
    const slugWhere = { slug: { startsWith: `fictional-agent-${runId}` } };
    const organizationsBefore = await prisma.organization.count({
      where: slugWhere,
    });

    const result = await signUp({}, signUpForm(name, email));
    expect(result).toEqual({ success: true });

    const user = await findUserWithOrganizations(email);
    expect(user).not.toBeNull();
    expect(user!.name).toBe(name);
    expect(user!.email).toBe(email);

    // Exactly one workspace and one OWNER membership.
    expect(user!.memberships).toHaveLength(1);
    const membership = user!.memberships[0];
    expect(membership.role).toBe("OWNER");
    expect(membership.organization.name).toBe(`${name} Realty`);
    expect(membership.organization.slug.startsWith(`fictional-agent-${runId}`)).toBe(
      true,
    );

    // Exactly one new organization row was created for this account.
    expect(
      await prisma.organization.count({ where: slugWhere }),
    ).toBe(organizationsBefore + 1);
  });

  it("gives users with the same submitted name distinct workspace slugs", async () => {
    const { signUp } = await import("@/server/auth/sign-up");

    const name = `Twin Agent ${runId}`;
    const emailA = nextEmail("signup-twin-a");
    const emailB = nextEmail("signup-twin-b");

    expect((await signUp({}, signUpForm(name, emailA))).success).toBe(true);
    expect((await signUp({}, signUpForm(name, emailB))).success).toBe(true);

    const userA = await findUserWithOrganizations(emailA);
    const userB = await findUserWithOrganizations(emailB);
    const slugA = userA!.memberships[0].organization.slug;
    const slugB = userB!.memberships[0].organization.slug;

    expect(slugA).not.toBe(slugB);
  });

  it("lets the new user resolve their active organization as OWNER", async () => {
    const { signUp } = await import("@/server/auth/sign-up");
    const { getActiveOrganization } = await import("@/server/auth/organization");

    const name = `Resolve Agent ${runId}`;
    const email = nextEmail("signup-resolve");
    expect((await signUp({}, signUpForm(name, email))).success).toBe(true);

    const user = await findUserWithOrganizations(email);
    const organization = user!.memberships[0].organization;

    const active = await getActiveOrganization(user!.id);
    expect(active).not.toBeNull();
    expect(active!.id).toBe(organization.id);
    expect(active!.role).toBe("OWNER");
  });

  it("does not create duplicate workspaces when registration is retried", async () => {
    const { signUp } = await import("@/server/auth/sign-up");

    const name = `Retry Agent ${runId}`;
    const email = nextEmail("signup-retry");

    const first = await signUp({}, signUpForm(name, email));
    expect(first).toEqual({ success: true });

    const user = await findUserWithOrganizations(email);
    const organizationId = user!.memberships[0].organization.id;

    // Retry the identical registration.
    const second = await signUp({}, signUpForm(name, email));
    expect(second.success).toBeUndefined();
    expect(second.error).toBeTruthy();

    // Same account, same single workspace — nothing new was created.
    expect(await prisma.user.count({ where: { email } })).toBe(1);
    const userAfterRetry = await findUserWithOrganizations(email);
    expect(userAfterRetry!.memberships).toHaveLength(1);
    expect(userAfterRetry!.memberships[0].organization.id).toBe(organizationId);
    expect(
      await prisma.membership.count({ where: { userId: user!.id } }),
    ).toBe(1);
  });

  it("lets the authenticated new user pass the dashboard tenant guard", async () => {
    const { signUp } = await import("@/server/auth/sign-up");

    const name = `Dashboard Agent ${runId}`;
    const email = nextEmail("signup-dashboard");
    expect((await signUp({}, signUpForm(name, email))).success).toBe(true);

    const user = await findUserWithOrganizations(email);
    const organization = user!.memberships[0].organization;

    // The dashboard layout calls requireActiveOrganization(), which reads
    // the session server-side and resolves the membership. Simulate only
    // the authenticated session here — organization resolution stays real.
    vi.resetModules();
    vi.doMock("@/server/auth/session", () => ({
      requireSessionUser: async () => ({
        id: user!.id,
        email,
        name,
      }),
    }));

    const { requireActiveOrganization } = await import(
      "@/server/auth/organization"
    );
    const active = await requireActiveOrganization();

    expect(active.id).toBe(organization.id);
    expect(active.role).toBe("OWNER");
    expect(active.slug).toBe(organization.slug);
  });
});
