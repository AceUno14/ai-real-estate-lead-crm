import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/server/auth/password";

/**
 * Fictional seed data (TASKS.md T021/T090).
 *
 * All people, contact details, and inquiries are fictional (D-024).
 * Creates one organization, one owner account, and 18 leads across
 * statuses/sources/budgets/timelines so every dashboard view has content.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});const DEMO_ORG_SLUG = "demo-realty";
const DEMO_OWNER_EMAIL = "owner@demo-realty.test";



type SeedLead = {
  name: string;
  email: string;
  phone: string | null;
  inquiryType: string;
  propertyType: string | null;
  preferredLocation: string;
  budgetMin: number | null;
  budgetMax: number | null;
  timeline: string | null;
  financingStatus: string | null;
  message: string;
  source: string | null;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "NURTURING" | "WON" | "LOST";
};

const LEADS: SeedLead[] = [
  {
    name: "Marcus Reed",
    email: "marcus.reed@example.com",
    phone: "+1 555 0101",
    inquiryType: "BUY",
    propertyType: "HOUSE",
    preferredLocation: "Austin, TX",
    budgetMin: 600000,
    budgetMax: 750000,
    timeline: "ASAP",
    financingStatus: "CASH",
    message:
      "Relocating for work next month. Ready to make an offer on the right house immediately, ideally with a short closing.",
    source: "WEBSITE",
    status: "NEW",
  },
  {
    name: "Priya Natarajan",
    email: "priya.n@example.com",
    phone: "+1 555 0102",
    inquiryType: "BUY",
    propertyType: "APARTMENT",
    preferredLocation: "Seattle, WA",
    budgetMin: 450000,
    budgetMax: 550000,
    timeline: "ONE_TO_THREE_MONTHS",
    financingStatus: "PRE_APPROVED",
    message:
      "First-time buyer, pre-approved with my bank. Looking for a two-bedroom apartment close to the light rail.",
    source: "REFERRAL",
    status: "NEW",
  },
  {
    name: "Daniel Okafor",
    email: "d.okafor@example.com",
    phone: null,
    inquiryType: "INVEST",
    propertyType: "CONDO",
    preferredLocation: "Miami, FL",
    budgetMin: 300000,
    budgetMax: 420000,
    timeline: "THREE_TO_SIX_MONTHS",
    financingStatus: "NEEDS_MORTGAGE",
    message:
      "Building a small rental portfolio. Interested in condos with strong short-term rental potential.",
    source: "SOCIAL_MEDIA",
    status: "CONTACTED",
  },
  {
    name: "Sofia Marchetti",
    email: "sofia.marchetti@example.com",
    phone: "+1 555 0104",
    inquiryType: "SELL",
    propertyType: "HOUSE",
    preferredLocation: "Denver, CO",
    budgetMin: null,
    budgetMax: null,
    timeline: "SIX_PLUS_MONTHS",
    financingStatus: "UNSOLD_PROPERTY",
    message:
      "Planning to list our family home next spring. Would like a valuation and preparation advice first.",
    source: "WEBSITE",
    status: "CONTACTED",
  },
  {
    name: "Liam Gallagher",
    email: "liam.g@example.com",
    phone: "+1 555 0105",
    inquiryType: "RENT",
    propertyType: "APARTMENT",
    preferredLocation: "Chicago, IL",
    budgetMin: 1800,
    budgetMax: 2400,
    timeline: "ONE_TO_THREE_MONTHS",
    financingStatus: null,
    message: "Monthly budget 1800-2400. Need pet-friendly, parking included.",
    source: "ADVERTISEMENT",
    status: "QUALIFIED",
  },
  {
    name: "Grace Chen",
    email: "grace.chen@example.com",
    phone: "+1 555 0106",
    inquiryType: "BUY",
    propertyType: "HOUSE",
    preferredLocation: "San Jose, CA",
    budgetMin: 1200000,
    budgetMax: 1500000,
    timeline: "ASAP",
    financingStatus: "PRE_APPROVED",
    message:
      "Pre-approved, both of us work in tech. Want a four-bedroom in a good school district.",
    source: "REFERRAL",
    status: "QUALIFIED",
  },
  {
    name: "Tom Becker",
    email: "tom.becker@example.com",
    phone: null,
    inquiryType: "BUY",
    propertyType: "LAND",
    preferredLocation: "Boise, ID",
    budgetMin: 80000,
    budgetMax: 120000,
    timeline: "SIX_PLUS_MONTHS",
    financingStatus: "CASH",
    message: "Looking for a buildable lot, cash purchase, no rush.",
    source: "WEBSITE",
    status: "NURTURING",
  },
  {
    name: "Amelia Wright",
    email: "amelia.wright@example.com",
    phone: "+1 555 0108",
    inquiryType: "RENT",
    propertyType: "APARTMENT",
    preferredLocation: "Portland, OR",
    budgetMin: 1500,
    budgetMax: 1900,
    timeline: "JUST_BROWSING",
    financingStatus: null,
    message: "Just exploring options for later in the year.",
    source: "SOCIAL_MEDIA",
    status: "NURTURING",
  },
  {
    name: "Noah Kimberly",
    email: "noah.kimberly@example.com",
    phone: "+1 555 0109",
    inquiryType: "BUY",
    propertyType: "CONDO",
    preferredLocation: "San Diego, CA",
    budgetMin: 500000,
    budgetMax: 620000,
    timeline: "ONE_TO_THREE_MONTHS",
    financingStatus: "PRE_APPROVED",
    message: "Want a view condo near the bay. Flexible on finishings.",
    source: "ADVERTISEMENT",
    status: "WON",
  },
  {
    name: "Elena Petrova",
    email: "elena.petrova@example.com",
    phone: null,
    inquiryType: "SELL",
    propertyType: "APARTMENT",
    preferredLocation: "Boston, MA",
    budgetMin: null,
    budgetMax: null,
    timeline: "THREE_TO_SIX_MONTHS",
    financingStatus: null,
    message: "Considering selling my condo after renovating the kitchen.",
    source: "WEBSITE",
    status: "LOST",
  },
  {
    name: "Jordan Ellis",
    email: "jordan.ellis@example.com",
    phone: "+1 555 0111",
    inquiryType: "BUY",
    propertyType: "HOUSE",
    preferredLocation: "Nashville, TN",
    budgetMin: 350000,
    budgetMax: 425000,
    timeline: "THREE_TO_SIX_MONTHS",
    financingStatus: "NEEDS_MORTGAGE",
    message: "First house, want to compare neighborhoods near the university.",
    source: "WEBSITE",
    status: "NEW",
  },
  {
    name: "Fatima Al-Rashid",
    email: "fatima.ar@example.com",
    phone: "+1 555 0112",
    inquiryType: "INVEST",
    propertyType: "COMMERCIAL",
    preferredLocation: "Dallas, TX",
    budgetMin: 800000,
    budgetMax: 1100000,
    timeline: "ONE_TO_THREE_MONTHS",
    financingStatus: "CASH",
    message: "Cash buyer looking for small retail spaces with existing tenants.",
    source: "REFERRAL",
    status: "CONTACTED",
  },
  {
    name: "Oliver Grant",
    email: "oliver.grant@example.com",
    phone: null,
    inquiryType: "RENT",
    propertyType: "HOUSE",
    preferredLocation: "Phoenix, AZ",
    budgetMin: 2200,
    budgetMax: 2800,
    timeline: "ASAP",
    financingStatus: null,
    message: "Need a 3-bedroom rental by the end of the month, family of four.",
    source: "ADVERTISEMENT",
    status: "NEW",
  },
  {
    name: "Chloe Dubois",
    email: "chloe.dubois@example.com",
    phone: "+1 555 0114",
    inquiryType: "BUY",
    propertyType: "APARTMENT",
    preferredLocation: "New Orleans, LA",
    budgetMin: 275000,
    budgetMax: 340000,
    timeline: "THREE_TO_SIX_MONTHS",
    financingStatus: "NEEDS_MORTGAGE",
    message: "Historic apartment near the garden district if possible.",
    source: "SOCIAL_MEDIA",
    status: "CONTACTED",
  },
  {
    name: "Ethan Walsh",
    email: "ethan.walsh@example.com",
    phone: null,
    inquiryType: "OTHER",
    propertyType: null,
    preferredLocation: "Kansas City, MO",
    budgetMin: null,
    budgetMax: null,
    timeline: "JUST_BROWSING",
    financingStatus: null,
    message: "General question about property management services.",
    source: "WEBSITE",
    status: "LOST",
  },
  {
    name: "Isabella Moretti",
    email: "isabella.m@example.com",
    phone: "+1 555 0116",
    inquiryType: "BUY",
    propertyType: "HOUSE",
    preferredLocation: "Minneapolis, MN",
    budgetMin: 400000,
    budgetMax: 480000,
    timeline: "ONE_TO_THREE_MONTHS",
    financingStatus: "PRE_APPROVED",
    message: "Pre-approved; need to close before the school year starts.",
    source: "REFERRAL",
    status: "QUALIFIED",
  },
  {
    name: "Ryan O'Connor",
    email: "ryan.oconnor@example.com",
    phone: "+1 555 0117",
    inquiryType: "SELL",
    propertyType: "CONDO",
    preferredLocation: "Las Vegas, NV",
    budgetMin: null,
    budgetMax: null,
    timeline: "SIX_PLUS_MONTHS",
    financingStatus: null,
    message: "Rental condo, tenant leaving in six months, will list then.",
    source: "WEBSITE",
    status: "NURTURING",
  },
  {
    name: "Zoe Campbell",
    email: "zoe.campbell@example.com",
    phone: null,
    inquiryType: "BUY",
    propertyType: "APARTMENT",
    preferredLocation: "Atlanta, GA",
    budgetMin: 250000,
    budgetMax: 310000,
    timeline: "ASAP",
    financingStatus: "CASH",
    message: "Cash purchase, downsizing, want single-level living.",
    source: "ADVERTISEMENT",
    status: "WON",
  },
];

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    update: {},
    create: {
      name: "Demo Realty Group",
      slug: DEMO_ORG_SLUG,
    },
  });

  const passwordHash = await hashPassword("demo-password-2026");

  const owner = await prisma.user.upsert({
    where: { email: DEMO_OWNER_EMAIL },
    update: {},
    create: {
      name: "Demo Owner",
      email: DEMO_OWNER_EMAIL,
      passwordHash,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: owner.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: owner.id,
      organizationId: org.id,
      role: "OWNER",
    },
  });

  let created = 0;
  for (const lead of LEADS) {
    // Idempotent: skip leads already seeded for this organization.
    const existing = await prisma.lead.findFirst({
      where: { organizationId: org.id, email: lead.email },
      select: { id: true },
    });
    if (existing) {
      continue;
    }

    const createdLead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        ...lead,
      },
    });
    created += 1;

    await prisma.activity.create({
      data: {
        organizationId: org.id,
        leadId: createdLead.id,
        type: "LEAD_CREATED",
        message: `Seeded lead: ${lead.name}`,
      },
    });
  }

  console.log(
    `Seeded organization "${org.name}" (slug: ${org.slug}), owner ${DEMO_OWNER_EMAIL}; ${created} new lead(s), ${LEADS.length - created} already present.`,
  );
  console.log("Demo sign-in password: demo-password-2026");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
