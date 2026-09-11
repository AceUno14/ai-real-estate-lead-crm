import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  try {
    const email = "owner@demo-realty.test";
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });
    console.log("user found:", user !== null);

    if (user) {
      const ok = await bcrypt.compare("demo-password-2026", user.passwordHash);
      console.log("password verifies:", ok);
      const membership = await prisma.membership.findFirst({
        where: { userId: user.id },
      });
      console.log("membership exists:", membership !== null);
    }

    console.log("total leads in db:", await prisma.lead.count());
    console.log(
      "orgs:",
      (await prisma.organization.findMany({ select: { slug: true } })).map(
        (o) => o.slug,
      ).length,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main();
