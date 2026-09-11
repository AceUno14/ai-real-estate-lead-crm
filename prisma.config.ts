import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 configuration. The datasource URL comes from the environment
// (see .env.example). Never hard-code connection strings here.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
