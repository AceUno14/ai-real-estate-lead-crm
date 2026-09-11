import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Public submissions schedule post-response AI qualification via after().
// The vitest runtime has no request scope, so run the task inline and await
// it — this keeps the automatic qualification deterministic for assertions.
vi.mock("next/server", () => ({
  after: async (task: () => void | Promise<void>) => {
    await task();
  },
}));

// Toggleable wrapper around the automatic follow-up task service so one test
// can prove that a task-creation failure never removes the qualification.
// Normal behavior delegates to the real implementation.
const { autoTaskControl } = vi.hoisted(() => ({
  autoTaskControl: { shouldFail: false },
}));

vi.mock("@/server/services/auto-follow-up-task", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/server/services/auto-follow-up-task")
    >();
  return {
    ...actual,
    createAutomaticFollowUpTaskIfNeeded: async (
      params: Parameters<typeof actual.createAutomaticFollowUpTaskIfNeeded>[0],
    ) => {
      if (autoTaskControl.shouldFail) {
        throw new Error("simulated automatic follow-up task failure");
      }
      return actual.createAutomaticFollowUpTaskIfNeeded(params);
    },
  };
});

const testEmail = "tenant-isolation-test@example.com";
const secondOrgSlug = "isolation-test-org";

let prisma: PrismaClient;
let organizationId: string;
let leadId: string;
let secondOrganizationId: string;
let secondUserId: string;
let esmaelOrganizationId: string;
let createdEsmaelOrg = false;

beforeAll(async () => {
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  const org = await prisma.organization.findUnique({
    where: { slug: "demo-realty" },
    select: { id: true },
  });
  if (!org) throw new Error("demo-realty organization missing — run npm run db:seed");
  organizationId = org.id;

  // A second organization + user to prove cross-tenant rejection.
  const secondOrg = await prisma.organization.upsert({
    where: { slug: secondOrgSlug },
    update: {},
    create: { name: "Isolation Test Org", slug: secondOrgSlug },
  });
  secondOrganizationId = secondOrg.id;

  const secondUser = await prisma.user.upsert({
    where: { email: testEmail },
    update: {},
    create: {
      name: "Tenant Isolation Test",
      email: testEmail,
      passwordHash: "test-hash-not-a-real-password",
    },
  });
  secondUserId = secondUser.id;

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: secondUserId,
        organizationId: secondOrganizationId,
      },
    },
    update: {},
    create: {
      userId: secondUserId,
      organizationId: secondOrganizationId,
      role: "OWNER",
    },
  });

  // One lead inside the second organization for the foreign-lead probes.
  const foreignLead = await prisma.lead.create({
    data: {
      organizationId: secondOrganizationId,
      name: "Foreign Lead",
      email: "foreign@example.com",
      inquiryType: "BUY",
      preferredLocation: "Nowhere",
      message: "Cross-tenant probe lead.",
      status: "NEW",
    },
    select: { id: true },
  });
  leadId = foreignLead.id;

  // Workspace-specific public lead routing needs a second, distinct workspace.
  // `esmael-realty` may already exist in a real database, so only create it
  // when missing and only delete it again when this test created it.
  const esmael = await prisma.organization.findUnique({
    where: { slug: "esmael-realty" },
    select: { id: true },
  });
  if (esmael) {
    esmaelOrganizationId = esmael.id;
  } else {
    const created = await prisma.organization.create({
      data: { name: "Esmael Realty", slug: "esmael-realty" },
      select: { id: true },
    });
    esmaelOrganizationId = created.id;
    createdEsmaelOrg = true;
  }
});

afterAll(async () => {
  // Cleanup everything this test created.
  const activities = await prisma.activity.deleteMany({
    where: { organizationId: secondOrganizationId },
  });
  await prisma.leadQualification.deleteMany({
    where: { organizationId: secondOrganizationId },
  });
  await prisma.followUpTask.deleteMany({
    where: { organizationId: secondOrganizationId },
  });
  await prisma.leadNote.deleteMany({
    where: { organizationId: secondOrganizationId },
  });
  await prisma.lead.deleteMany({
    where: { organizationId: secondOrganizationId },
  });
  await prisma.membership.deleteMany({
    where: { organizationId: secondOrganizationId },
  });
  await prisma.organization.deleteMany({
    where: { id: secondOrganizationId },
  });
  await prisma.user.deleteMany({ where: { id: secondUserId } });

  // Remove leads created by the public-flow tests (identified by marker email).
  const publicTestLeads = await prisma.lead.findMany({
    where: {
      email: {
        in: [
          "public-flow-test@example.com",
          "esmael-flow-test@example.com",
          "override-attempt-test@example.com",
          "auto-qualify-success@example.com",
          "auto-qualify-failure@example.com",
        ],
      },
    },
    select: { id: true },
  });
  if (publicTestLeads.length > 0) {
    await prisma.activity.deleteMany({
      where: { leadId: { in: publicTestLeads.map((l) => l.id) } },
    });
    await prisma.lead.deleteMany({
      where: { id: { in: publicTestLeads.map((l) => l.id) } },
    });
  }

  // Remove the temporary Esmael Realty workspace only if we created it.
  if (createdEsmaelOrg) {
    await prisma.activity.deleteMany({
      where: { organizationId: esmaelOrganizationId },
    });
    await prisma.leadQualification.deleteMany({
      where: { organizationId: esmaelOrganizationId },
    });
    await prisma.followUpTask.deleteMany({
      where: { organizationId: esmaelOrganizationId },
    });
    await prisma.leadNote.deleteMany({
      where: { organizationId: esmaelOrganizationId },
    });
    await prisma.lead.deleteMany({
      where: { organizationId: esmaelOrganizationId },
    });
    await prisma.membership.deleteMany({
      where: { organizationId: esmaelOrganizationId },
    });
    await prisma.organization.deleteMany({
      where: { id: esmaelOrganizationId },
    });
  }

  console.log(
    `cleanup ok (removed ${activities.count} activity rows from test org)`,
  );
  await prisma.$disconnect();
});

/** Minimal valid public submission with a marker email for cleanup. */
function publicLeadForm(email: string): FormData {
  const formData = new FormData();
  formData.set("name", "Public Flow Test");
  formData.set("email", email);
  formData.set("inquiryType", "BUY");
  formData.set("preferredLocation", "Test City");
  formData.set("message", "Integration test inquiry from the public flow.");
  formData.set("budgetMin", "250000");
  formData.set("budgetMax", "400000");
  return formData;
}

describe("public lead routing (live database)", () => {
  it("resolves /lead/demo-realty and creates the lead under demo-realty", async () => {
    const { submitPublicLead } = await import(
      "@/server/actions/public-lead"
    );

    const result = await submitPublicLead(
      "demo-realty",
      { status: "idle" },
      publicLeadForm("public-flow-test@example.com"),
    );
    expect(result).toEqual({ status: "success" });

    const lead = await prisma.lead.findFirst({
      where: {
        email: "public-flow-test@example.com",
        organizationId,
      },
    });
    expect(lead).not.toBeNull();
    expect(lead?.status).toBe("NEW");
    expect(lead?.budgetMin).toBe(250000);

    const activity = await prisma.activity.findFirst({
      where: {
        leadId: lead!.id,
        organizationId,
        type: "LEAD_CREATED",
      },
    });
    expect(activity).not.toBeNull();
  });

  it("resolves /lead/esmael-realty and creates the lead under Esmael Realty", async () => {
    const { submitPublicLead } = await import(
      "@/server/actions/public-lead"
    );

    const result = await submitPublicLead(
      "esmael-realty",
      { status: "idle" },
      publicLeadForm("esmael-flow-test@example.com"),
    );
    expect(result).toEqual({ status: "success" });

    const lead = await prisma.lead.findFirst({
      where: {
        email: "esmael-flow-test@example.com",
        organizationId: esmaelOrganizationId,
      },
    });
    expect(lead).not.toBeNull();
    expect(lead?.status).toBe("NEW");

    // The lead must land only in the workspace named by the route.
    const inDemoRealty = await prisma.lead.findFirst({
      where: {
        email: "esmael-flow-test@example.com",
        organizationId,
      },
    });
    expect(inDemoRealty).toBeNull();
  });

  it("ignores a client-supplied organizationId", async () => {
    const { submitPublicLead } = await import(
      "@/server/actions/public-lead"
    );

    const formData = publicLeadForm("override-attempt-test@example.com");
    // Attacker-supplied organization ID pointing at a different workspace.
    formData.set("organizationId", esmaelOrganizationId);

    const result = await submitPublicLead(
      "demo-realty",
      { status: "idle" },
      formData,
    );
    expect(result).toEqual({ status: "success" });

    const lead = await prisma.lead.findFirst({
      where: { email: "override-attempt-test@example.com" },
      select: { organizationId: true },
    });
    expect(lead?.organizationId).toBe(organizationId);
    expect(lead?.organizationId).not.toBe(esmaelOrganizationId);

    const inEsmael = await prisma.lead.count({
      where: {
        email: "override-attempt-test@example.com",
        organizationId: esmaelOrganizationId,
      },
    });
    expect(inEsmael).toBe(0);
  });

  it("does not create a lead for an unknown or malformed slug", async () => {
    const { submitPublicLead } = await import(
      "@/server/actions/public-lead"
    );

    const before = await prisma.lead.count({
      where: { email: "esmael-flow-test@example.com" },
    });

    const unknown = await submitPublicLead(
      "no-such-workspace-xyz",
      { status: "idle" },
      publicLeadForm("esmael-flow-test@example.com"),
    );
    expect(unknown.status).toBe("error");

    const malformed = await submitPublicLead(
      "not/a/slug",
      { status: "idle" },
      publicLeadForm("esmael-flow-test@example.com"),
    );
    expect(malformed.status).toBe("error");

    const after = await prisma.lead.count({
      where: { email: "esmael-flow-test@example.com" },
    });
    expect(after).toBe(before);
  });

  it("rejects invalid submissions without creating anything", async () => {
    const { submitPublicLead } = await import(
      "@/server/actions/public-lead"
    );

    const before = await prisma.lead.count({
      where: { email: "public-flow-test@example.com" },
    });

    const formData = new FormData();
    formData.set("name", "Bad Input");
    formData.set("email", "not-an-email");
    formData.set("inquiryType", "BUY");
    formData.set("preferredLocation", "Test City");
    formData.set("message", "should fail validation");

    const result = await submitPublicLead(
      "demo-realty",
      { status: "idle" },
      formData,
    );
    expect(result.status).toBe("error");

    const after = await prisma.lead.count({
      where: { email: "public-flow-test@example.com" },
    });
    expect(after).toBe(before);
  });
});

describe("automatic qualification on public submission (live database)", () => {
  let successLeadId: string;

  it("returns success and persists a qualification with a system (null) actor", async () => {
    const { submitPublicLead } = await import(
      "@/server/actions/public-lead"
    );

    const result = await submitPublicLead(
      "demo-realty",
      { status: "idle" },
      publicLeadForm("auto-qualify-success@example.com"),
    );
    expect(result).toEqual({ status: "success" });

    const lead = await prisma.lead.findFirst({
      where: {
        email: "auto-qualify-success@example.com",
        organizationId,
      },
      select: { id: true },
    });
    expect(lead).not.toBeNull();
    successLeadId = lead!.id;

    const qualification = await prisma.leadQualification.findFirst({
      where: { leadId: successLeadId, organizationId },
    });
    expect(qualification).not.toBeNull();
    expect(qualification?.reviewState).toBe("GENERATED");

    const generated = await prisma.activity.findFirst({
      where: {
        leadId: successLeadId,
        organizationId,
        type: "QUALIFICATION_GENERATED",
      },
      select: { actorUserId: true },
    });
    expect(generated).not.toBeNull();
    // Automatic/system activity uses a null actor, not a user.
    expect(generated?.actorUserId).toBeNull();
  });

  it("keeps the lead and returns success when automatic AI fails", async () => {
    const { submitPublicLead } = await import(
      "@/server/actions/public-lead"
    );

    const formData = publicLeadForm("auto-qualify-failure@example.com");
    formData.set(
      "message",
      "Please trigger a failure MOCK_AI_FAILURE for this inquiry.",
    );

    const result = await submitPublicLead("demo-realty", { status: "idle" }, formData);
    expect(result).toEqual({ status: "success" });

    const lead = await prisma.lead.findFirst({
      where: {
        email: "auto-qualify-failure@example.com",
        organizationId,
      },
      select: { id: true, status: true, message: true },
    });
    expect(lead).not.toBeNull();
    // The lead is intact and unchanged by the failed qualification.
    expect(lead?.status).toBe("NEW");
    expect(lead?.message).toContain("MOCK_AI_FAILURE");

    const created = await prisma.activity.findFirst({
      where: { leadId: lead!.id, type: "LEAD_CREATED" },
    });
    expect(created).not.toBeNull();

    const failed = await prisma.activity.findFirst({
      where: {
        leadId: lead!.id,
        organizationId,
        type: "QUALIFICATION_FAILED",
      },
      select: { actorUserId: true },
    });
    expect(failed).not.toBeNull();
    expect(failed?.actorUserId).toBeNull();

    const qualifications = await prisma.leadQualification.count({
      where: { leadId: lead!.id },
    });
    expect(qualifications).toBe(0);
  });

  it("does not duplicate successful qualifications on repeated automatic runs", async () => {
    expect(successLeadId).toBeTruthy();

    const { runAutomaticQualification } = await import(
      "@/server/ai/qualify-lead"
    );

    const outcome = await runAutomaticQualification({
      organizationId,
      leadId: successLeadId,
    });
    expect(outcome).toEqual({ status: "skipped" });

    const count = await prisma.leadQualification.count({
      where: { leadId: successLeadId, organizationId },
    });
    expect(count).toBe(1);
  });

  it("scopes qualification to the resolved organization (no cross-tenant run)", async () => {
    expect(successLeadId).toBeTruthy();

    const { qualifyLeadForOrganization } = await import(
      "@/server/ai/qualify-lead"
    );

    // A demo-realty lead addressed with the second organization's id must
    // behave exactly like a missing lead and write nothing.
    const outcome = await qualifyLeadForOrganization({
      organizationId: secondOrganizationId,
      leadId: successLeadId,
      actorUserId: null,
    });
    expect(outcome).toEqual({ status: "failed", message: "Lead not found." });

    const crossTenant = await prisma.leadQualification.count({
      where: { leadId: successLeadId, organizationId: secondOrganizationId },
    });
    expect(crossTenant).toBe(0);
  });
});

describe("automatic follow-up tasks (live database)", () => {
  const HOUR_MS = 60 * 60 * 1000;

  async function createQualifiableLead(overrides: {
    name: string;
    message?: string;
    timeline?: string | null;
    financingStatus?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
  }): Promise<string> {
    const lead = await prisma.lead.create({
      data: {
        organizationId: secondOrganizationId,
        name: overrides.name,
        email: `${overrides.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@auto-task.test`,
        inquiryType: "BUY",
        preferredLocation: "Auto Task City",
        message: overrides.message ?? "Automatic follow-up task test lead.",
        timeline: overrides.timeline ?? null,
        financingStatus: overrides.financingStatus ?? null,
        budgetMin: overrides.budgetMin ?? null,
        budgetMax: overrides.budgetMax ?? null,
        status: "NEW",
      },
      select: { id: true },
    });
    return lead.id;
  }

  async function qualify(leadId: string) {
    const { qualifyLeadForOrganization } = await import(
      "@/server/ai/qualify-lead"
    );
    return qualifyLeadForOrganization({
      organizationId: secondOrganizationId,
      leadId,
      actorUserId: null,
    });
  }

  it("creates exactly one automatic task for a HIGH-priority qualification", async () => {
    const leadId = await createQualifiableLead({
      name: "High Priority Lead",
      timeline: "ONE_TO_THREE_MONTHS",
      financingStatus: "CASH",
    });

    const outcome = await qualify(leadId);
    expect(outcome.status).toBe("succeeded");

    const qualification = await prisma.leadQualification.findFirst({
      where: { leadId, organizationId: secondOrganizationId },
    });
    expect(qualification?.priority).toBe("HIGH");

    const tasks = await prisma.followUpTask.findMany({
      where: { leadId, organizationId: secondOrganizationId },
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Follow up with High Priority Lead");
    expect(tasks[0].description).toBe(qualification!.recommendedAction);
    // Due within 24 hours of now.
    expect(tasks[0].dueDate.getTime()).toBeGreaterThan(Date.now());
    expect(tasks[0].dueDate.getTime()).toBeLessThanOrEqual(
      Date.now() + 24 * HOUR_MS + 5000,
    );

    const marker = await prisma.activity.findFirst({
      where: {
        leadId,
        organizationId: secondOrganizationId,
        type: "AUTO_FOLLOW_UP_CREATED",
      },
      select: { actorUserId: true, message: true },
    });
    expect(marker).not.toBeNull();
    expect(marker?.actorUserId).toBeNull();
    expect(marker?.message).toContain("HIGH-priority");
  });

  it("creates exactly one sooner task for an URGENT-priority qualification", async () => {
    const leadId = await createQualifiableLead({
      name: "Urgent Priority Lead",
      timeline: "ASAP",
      financingStatus: "CASH",
      budgetMin: 600_000,
      budgetMax: 900_000,
    });

    const outcome = await qualify(leadId);
    expect(outcome.status).toBe("succeeded");

    const qualification = await prisma.leadQualification.findFirst({
      where: { leadId, organizationId: secondOrganizationId },
    });
    expect(qualification?.priority).toBe("URGENT");

    const tasks = await prisma.followUpTask.findMany({ where: { leadId } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Urgent follow-up with Urgent Priority Lead");
    // Due much sooner than the HIGH window (2h vs 24h).
    const hoursUntilDue = (tasks[0].dueDate.getTime() - Date.now()) / HOUR_MS;
    expect(hoursUntilDue).toBeGreaterThan(0);
    expect(hoursUntilDue).toBeLessThanOrEqual(2.01);
  });

  it("creates no automatic task for LOW or MEDIUM priority", async () => {
    const lowLeadId = await createQualifiableLead({
      name: "Low Priority Lead",
      timeline: "JUST_BROWSING",
    });
    const mediumLeadId = await createQualifiableLead({
      name: "Medium Priority Lead",
      timeline: "ONE_TO_THREE_MONTHS",
    });

    expect((await qualify(lowLeadId)).status).toBe("succeeded");
    expect((await qualify(mediumLeadId)).status).toBe("succeeded");

    const lowQualification = await prisma.leadQualification.findFirst({
      where: { leadId: lowLeadId },
    });
    expect(lowQualification?.priority).toBe("LOW");
    const mediumQualification = await prisma.leadQualification.findFirst({
      where: { leadId: mediumLeadId },
    });
    expect(mediumQualification?.priority).toBe("MEDIUM");

    expect(
      await prisma.followUpTask.count({ where: { leadId: lowLeadId } }),
    ).toBe(0);
    expect(
      await prisma.followUpTask.count({ where: { leadId: mediumLeadId } }),
    ).toBe(0);
  });

  it("does not duplicate automatic tasks on repeated qualification", async () => {
    const leadId = await createQualifiableLead({
      name: "Repeat High Lead",
      timeline: "ONE_TO_THREE_MONTHS",
      financingStatus: "CASH",
    });

    expect((await qualify(leadId)).status).toBe("succeeded");
    expect((await qualify(leadId)).status).toBe("succeeded");

    // Two qualifications may exist, but only one automatic task and marker.
    expect(await prisma.followUpTask.count({ where: { leadId } })).toBe(1);
    expect(
      await prisma.activity.count({
        where: { leadId, type: "AUTO_FOLLOW_UP_CREATED" },
      }),
    ).toBe(1);
  });

  it("creates exactly one automatic task under concurrent execution", async () => {
    const leadId = await createQualifiableLead({
      name: "Concurrent High Lead",
      timeline: "ONE_TO_THREE_MONTHS",
      financingStatus: "CASH",
    });

    const { createAutomaticFollowUpTaskIfNeeded } = await import(
      "@/server/services/auto-follow-up-task"
    );

    // Fire several automatic creations for the same organization + lead at
    // once. This is the check-then-create race the SERIALIZABLE transaction
    // is meant to close.
    const outcomes = await Promise.all(
      Array.from({ length: 5 }, () =>
        createAutomaticFollowUpTaskIfNeeded({
          organizationId: secondOrganizationId,
          leadId,
          priority: "HIGH",
          recommendedAction: "Call immediately.",
        }),
      ),
    );

    expect(
      await prisma.followUpTask.count({
        where: { leadId, organizationId: secondOrganizationId },
      }),
    ).toBe(1);
    expect(
      await prisma.activity.count({
        where: {
          leadId,
          organizationId: secondOrganizationId,
          type: "AUTO_FOLLOW_UP_CREATED",
        },
      }),
    ).toBe(1);
    // Exactly one caller actually created the task; the rest observed it.
    expect(outcomes.filter((outcome) => outcome.created)).toHaveLength(1);
  });

  it("cannot create an automatic task across tenants", async () => {
    const foreignLead = await prisma.lead.findFirst({
      where: { organizationId },
      select: { id: true },
    });
    expect(foreignLead).not.toBeNull();

    const { createAutomaticFollowUpTaskIfNeeded } = await import(
      "@/server/services/auto-follow-up-task"
    );

    const outcome = await createAutomaticFollowUpTaskIfNeeded({
      organizationId: secondOrganizationId,
      leadId: foreignLead!.id,
      priority: "URGENT",
      recommendedAction: "Should never be written.",
    });
    expect(outcome.created).toBe(false);

    expect(
      await prisma.followUpTask.count({
        where: { leadId: foreignLead!.id, organizationId: secondOrganizationId },
      }),
    ).toBe(0);
  });

  it("keeps the qualification when automatic task creation fails", async () => {
    const leadId = await createQualifiableLead({
      name: "Task Failure Lead",
      timeline: "ONE_TO_THREE_MONTHS",
      financingStatus: "CASH",
    });

    autoTaskControl.shouldFail = true;
    try {
      const outcome = await qualify(leadId);
      expect(outcome.status).toBe("succeeded");

      // The successful qualification survives the task failure.
      expect(
        await prisma.leadQualification.count({
          where: { leadId, organizationId: secondOrganizationId },
        }),
      ).toBe(1);
      expect(await prisma.followUpTask.count({ where: { leadId } })).toBe(0);
    } finally {
      autoTaskControl.shouldFail = false;
    }
  });
});

describe("tenant isolation (live database)", () => {
  it("mimics session resolution for the second-organization user", async () => {
    // Session/org helpers are mocked to return the second org's context.
    vi.doMock("@/server/auth/session", async () => {
      const actual = await import("@/server/auth/session");
      return {
        ...actual,
        requireSessionUser: vi.fn().mockResolvedValue({
          id: secondUserId,
          email: testEmail,
          name: "Tenant Isolation Test",
        }),
      };
    });
    vi.doMock("@/server/auth/organization", async () => {
      const actual = await import("@/server/auth/organization");
      return {
        ...actual,
        requireActiveOrganization: vi.fn().mockResolvedValue({
          id: secondOrganizationId,
          name: "Isolation Test Org",
          slug: secondOrgSlug,
          role: "OWNER",
        }),
      };
    });

    const { updateLeadStatus } = await import("@/server/actions/lead-mutations");

    const formData = new FormData();
    formData.set("leadId", leadId); // lead belongs to the second org — allowed
    formData.set("status", "CONTACTED");

    const result = await updateLeadStatus({}, formData);
    expect(result.error).toBeUndefined();

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead?.status).toBe("CONTACTED");

    const activity = await prisma.activity.findFirst({
      where: { leadId, type: "STATUS_CHANGED" },
    });
    expect(activity).not.toBeNull();
  });

  it("rejects mutations on leads outside the organization", async () => {
    vi.doMock("@/server/auth/session", async () => {
      const actual = await import("@/server/auth/session");
      return {
        ...actual,
        requireSessionUser: vi.fn().mockResolvedValue({
          id: secondUserId,
          email: testEmail,
          name: "Tenant Isolation Test",
        }),
      };
    });
    vi.doMock("@/server/auth/organization", async () => {
      const actual = await import("@/server/auth/organization");
      return {
        ...actual,
        requireActiveOrganization: vi.fn().mockResolvedValue({
          id: secondOrganizationId,
          name: "Isolation Test Org",
          slug: secondOrgSlug,
          role: "OWNER",
        }),
      };
    });

    const { updateLeadStatus, addLeadNote } = await import(
      "@/server/actions/lead-mutations"
    );

    // Grab a lead from the demo-realty organization (NOT the second org).
    const foreignLead = await prisma.lead.findFirst({
      where: { organizationId },
      select: { id: true },
    });
    expect(foreignLead).not.toBeNull();

    const statusForm = new FormData();
    statusForm.set("leadId", foreignLead!.id);
    statusForm.set("status", "WON");
    const statusResult = await updateLeadStatus({}, statusForm);
    expect(statusResult.error).toBe("Lead not found.");

    const noteForm = new FormData();
    noteForm.set("leadId", foreignLead!.id);
    noteForm.set("content", "should never be written");
    const noteResult = await addLeadNote({}, noteForm);
    expect(noteResult.error).toBe("Lead not found.");

    // Nothing was mutated in the victim organization.
    const unchanged = await prisma.lead.findUnique({
      where: { id: foreignLead!.id },
      select: { status: true },
    });
    expect(unchanged?.status).not.toBe("WON");

    const notesCount = await prisma.leadNote.count({
      where: { leadId: foreignLead!.id, content: "should never be written" },
    });
    expect(notesCount).toBe(0);
  });
});

function mockSecondOrganizationContext() {
  vi.doMock("@/server/auth/session", async () => {
    const actual = await import("@/server/auth/session");
    return {
      ...actual,
      requireSessionUser: vi.fn().mockResolvedValue({
        id: secondUserId,
        email: testEmail,
        name: "Tenant Isolation Test",
      }),
    };
  });
  vi.doMock("@/server/auth/organization", async () => {
    const actual = await import("@/server/auth/organization");
    return {
      ...actual,
      requireActiveOrganization: vi.fn().mockResolvedValue({
        id: secondOrganizationId,
        name: "Isolation Test Org",
        slug: secondOrgSlug,
        role: "OWNER",
      }),
    };
  });
}

describe("follow-up tasks (live database)", () => {
  it("creates, completes, and reopens a task with activity entries", async () => {
    mockSecondOrganizationContext();

    const { createFollowUpTask, toggleFollowUpTask } = await import(
      "@/server/actions/follow-up-tasks"
    );

    const title = `Call back about financing ${Date.now()}`;
    const createForm = new FormData();
    createForm.set("leadId", leadId);
    createForm.set("title", title);
    createForm.set("description", "Discuss pre-approval options.");
    createForm.set(
      "dueDate",
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    );

    const createResult = await createFollowUpTask({}, createForm);
    expect(createResult.error).toBeUndefined();

    const task = await prisma.followUpTask.findFirst({
      where: { organizationId: secondOrganizationId, title },
    });
    expect(task).not.toBeNull();
    expect(task?.completedAt).toBeNull();

    const createdActivity = await prisma.activity.findFirst({
      where: { leadId, organizationId: secondOrganizationId, type: "FOLLOW_UP_CREATED" },
    });
    expect(createdActivity).not.toBeNull();

    const toggleForm = new FormData();
    toggleForm.set("taskId", task!.id);

    const completeResult = await toggleFollowUpTask({}, toggleForm);
    expect(completeResult.error).toBeUndefined();
    const completed = await prisma.followUpTask.findUnique({
      where: { id: task!.id },
      select: { completedAt: true },
    });
    expect(completed?.completedAt).not.toBeNull();

    await toggleFollowUpTask({}, toggleForm);
    const reopened = await prisma.followUpTask.findUnique({
      where: { id: task!.id },
      select: { completedAt: true },
    });
    expect(reopened?.completedAt).toBeNull();

    const activityTypes = await prisma.activity.findMany({
      where: { leadId, organizationId: secondOrganizationId },
      select: { type: true },
    });
    const types = activityTypes.map((a) => a.type);
    expect(types).toContain("FOLLOW_UP_CREATED");
    expect(types).toContain("FOLLOW_UP_COMPLETED");
    expect(types).toContain("FOLLOW_UP_REOPENED");

    await prisma.followUpTask.deleteMany({
      where: { organizationId: secondOrganizationId, title },
    });
  });

  it("rejects a task for a lead outside the organization", async () => {
    mockSecondOrganizationContext();

    const { createFollowUpTask } = await import(
      "@/server/actions/follow-up-tasks"
    );

    const foreignLead = await prisma.lead.findFirst({
      where: { organizationId },
      select: { id: true },
    });
    expect(foreignLead).not.toBeNull();

    const form = new FormData();
    form.set("leadId", foreignLead!.id);
    form.set("title", "should never be created");
    form.set("dueDate", new Date(Date.now() + 86_400_000).toISOString());

    const result = await createFollowUpTask({}, form);
    expect(result.error).toBe("Lead not found.");

    const count = await prisma.followUpTask.count({
      where: { title: "should never be created" },
    });
    expect(count).toBe(0);
  });
});

describe("human review of AI draft (live database)", () => {
  let qualificationId: string;
  let reviewLeadId: string;
  let foreignLeadId: string;

  beforeAll(async () => {
    // Dedicated lead so the qualification-workflow assertions below (which
    // expect exactly one qualification for their own lead) stay independent.
    const reviewLead = await prisma.lead.create({
      data: {
        organizationId: secondOrganizationId,
        name: "Review State Lead",
        email: "review-state@example.com",
        inquiryType: "BUY",
        preferredLocation: "Review Town",
        message: "Lead used for human review state tests.",
        status: "NEW",
      },
      select: { id: true },
    });
    reviewLeadId = reviewLead.id;

    const qualification = await prisma.leadQualification.create({
      data: {
        organizationId: secondOrganizationId,
        leadId: reviewLeadId,
        provider: "mock",
        model: "mock-real-estate-qualifier-v1",
        score: 72,
        priority: "HIGH",
        intent: "BUY",
        summary: "Review-state test qualification.",
        timeline: "ONE_TO_THREE_MONTHS",
        budgetReadiness: "Ready",
        financingStatus: "PRE_APPROVED",
        recommendedAction: "Call today.",
        draftReply: "Original draft reply.",
        confidence: 0.8,
        reviewState: "GENERATED",
      },
      select: { id: true },
    });
    qualificationId = qualification.id;

    const foreignLead = await prisma.lead.findFirst({
      where: { organizationId },
      select: { id: true },
    });
    foreignLeadId = foreignLead!.id;
  });

  it("ignores a tampered leadId and records the draft edit on the owned lead", async () => {
    mockSecondOrganizationContext();

    const { editQualificationDraft } = await import(
      "@/server/actions/qualification"
    );

    const form = new FormData();
    form.set("qualificationId", qualificationId);
    // Attacker-supplied leadId belongs to a different organization.
    form.set("leadId", foreignLeadId);
    form.set("draftReply", "Edited draft reply.");

    const result = await editQualificationDraft({}, form);
    expect(result.error).toBeUndefined();

    const qualification = await prisma.leadQualification.findUnique({
      where: { id: qualificationId },
      select: { draftReply: true, reviewState: true },
    });
    expect(qualification?.draftReply).toBe("Edited draft reply.");
    expect(qualification?.reviewState).toBe("EDITED");

    // The activity must be attached to the qualification's own lead —
    // never to the foreign lead supplied by the browser.
    const ownActivity = await prisma.activity.findFirst({
      where: {
        leadId: reviewLeadId,
        organizationId: secondOrganizationId,
        type: "DRAFT_EDITED",
      },
    });
    expect(ownActivity).not.toBeNull();

    const crossTenantActivity = await prisma.activity.findFirst({
      where: { leadId: foreignLeadId, type: "DRAFT_EDITED" },
    });
    expect(crossTenantActivity).toBeNull();
  });

  it("approves the draft and records the activity", async () => {
    mockSecondOrganizationContext();

    const { setQualificationReviewState } = await import(
      "@/server/actions/qualification"
    );

    const form = new FormData();
    form.set("qualificationId", qualificationId);
    form.set("leadId", reviewLeadId);
    form.set("reviewState", "APPROVED");

    const result = await setQualificationReviewState({}, form);
    expect(result.error).toBeUndefined();

    const qualification = await prisma.leadQualification.findUnique({
      where: { id: qualificationId },
      select: { reviewState: true },
    });
    expect(qualification?.reviewState).toBe("APPROVED");

    const activity = await prisma.activity.findFirst({
      where: {
        leadId: reviewLeadId,
        organizationId: secondOrganizationId,
        type: "DRAFT_APPROVED",
      },
    });
    expect(activity).not.toBeNull();
  });

  it("treats an approved review as terminal", async () => {
    mockSecondOrganizationContext();

    const { setQualificationReviewState, editQualificationDraft } = await import(
      "@/server/actions/qualification"
    );

    const reviewForm = new FormData();
    reviewForm.set("qualificationId", qualificationId);
    reviewForm.set("leadId", reviewLeadId);
    reviewForm.set("reviewState", "REJECTED");
    const reviewResult = await setQualificationReviewState({}, reviewForm);
    expect(reviewResult.error).toBe("This draft has already been reviewed.");

    const editForm = new FormData();
    editForm.set("qualificationId", qualificationId);
    editForm.set("leadId", reviewLeadId);
    editForm.set("draftReply", "Should not be saved.");
    const editResult = await editQualificationDraft({}, editForm);
    expect(editResult.error).toBe(
      "This draft has already been reviewed and can no longer be edited.",
    );

    const qualification = await prisma.leadQualification.findUnique({
      where: { id: qualificationId },
      select: { reviewState: true, draftReply: true },
    });
    expect(qualification?.reviewState).toBe("APPROVED");
    expect(qualification?.draftReply).toBe("Edited draft reply.");
  });
});

describe("qualification workflow (live database, mock AI)", () => {
  it("persists a validated qualification + activity for an org lead", async () => {
    vi.doMock("@/server/auth/session", async () => {
      const actual = await import("@/server/auth/session");
      return {
        ...actual,
        requireSessionUser: vi.fn().mockResolvedValue({
          id: secondUserId,
          email: testEmail,
          name: "Tenant Isolation Test",
        }),
      };
    });
    vi.doMock("@/server/auth/organization", async () => {
      const actual = await import("@/server/auth/organization");
      return {
        ...actual,
        requireActiveOrganization: vi.fn().mockResolvedValue({
          id: secondOrganizationId,
          name: "Isolation Test Org",
          slug: secondOrgSlug,
          role: "OWNER",
        }),
      };
    });

    // Manual authenticated qualification goes through the action wrapper,
    // which resolves the session + workspace and calls the trusted core.
    const { runQualification } = await import(
      "@/server/actions/qualification"
    );

    const form = new FormData();
    form.set("leadId", leadId);
    const result = await runQualification({}, form);
    expect(result.error).toBeUndefined();

    const qualification = await prisma.leadQualification.findFirst({
      where: { leadId, organizationId: secondOrganizationId },
    });
    expect(qualification).not.toBeNull();
    expect(qualification?.provider).toBe("mock");
    expect(qualification?.score).toBeGreaterThanOrEqual(0);
    expect(qualification?.score).toBeLessThanOrEqual(100);
    expect(qualification?.reviewState).toBe("GENERATED");

    const activity = await prisma.activity.findFirst({
      where: { leadId, type: "QUALIFICATION_GENERATED" },
    });
    expect(activity).not.toBeNull();
  });

  it("keeps the lead usable when the AI provider fails", async () => {
    vi.doMock("@/server/auth/session", async () => {
      const actual = await import("@/server/auth/session");
      return {
        ...actual,
        requireSessionUser: vi.fn().mockResolvedValue({
          id: secondUserId,
          email: testEmail,
          name: "Tenant Isolation Test",
        }),
      };
    });
    vi.doMock("@/server/auth/organization", async () => {
      const actual = await import("@/server/auth/organization");
      return {
        ...actual,
        requireActiveOrganization: vi.fn().mockResolvedValue({
          id: secondOrganizationId,
          name: "Isolation Test Org",
          slug: secondOrgSlug,
          role: "OWNER",
        }),
      };
    });

    // Force a failing lead message to trigger the mock failure mode.
    await prisma.lead.update({
      where: { id: leadId },
      data: { message: "Trigger failure MOCK_AI_FAILURE please" },
    });

    const { runQualification } = await import(
      "@/server/actions/qualification"
    );
    const form = new FormData();
    form.set("leadId", leadId);
    const result = await runQualification({}, form);
    expect(result.error).toBeDefined();

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { status: true },
    });
    expect(lead?.status).toBe("CONTACTED"); // unchanged by failed qualification

    const failureActivity = await prisma.activity.findFirst({
      where: { leadId, type: "QUALIFICATION_FAILED" },
    });
    expect(failureActivity).not.toBeNull();

    const validQualifications = await prisma.leadQualification.count({
      where: { leadId, provider: "mock" },
    });
    expect(validQualifications).toBe(1); // only the earlier success persisted
  });
});
