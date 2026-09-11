import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, organizationId: true, email: true },
    });

    const seen = new Set<string>();
    const duplicateIds: string[] = [];

    for (const lead of leads) {
      const key = `${lead.organizationId}:${lead.email}`;
      if (seen.has(key)) {
        duplicateIds.push(lead.id);
      } else {
        seen.add(key);
      }
    }

    if (duplicateIds.length === 0) {
      console.log("No duplicate leads found. Nothing to clean.");
      return;
    }

    const activities = await prisma.activity.deleteMany({
      where: { leadId: { in: duplicateIds } },
    });
    const removed = await prisma.lead.deleteMany({
      where: { id: { in: duplicateIds } },
    });

    console.log(
      `Removed ${removed.count} duplicate lead(s) and ${activities.count} related activit(y/ies). Kept the oldest per organization+email.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main();
