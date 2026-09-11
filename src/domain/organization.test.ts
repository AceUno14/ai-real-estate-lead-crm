import { describe, expect, it } from "vitest";

import { organizationSlugSchema } from "@/domain/organization";

describe("organizationSlugSchema", () => {
  it("accepts the seeded and demo workspace slugs", () => {
    expect(organizationSlugSchema.safeParse("demo-realty").success).toBe(true);
    expect(organizationSlugSchema.safeParse("esmael-realty").success).toBe(true);
  });

  it("accepts single-token slugs", () => {
    expect(organizationSlugSchema.safeParse("workspace").success).toBe(true);
    expect(organizationSlugSchema.safeParse("workspace-2").success).toBe(true);
  });

  it("normalizes case and surrounding whitespace", () => {
    const result = organizationSlugSchema.parse("  Demo-Realty  ");
    expect(result).toBe("demo-realty");
  });

  it("rejects empty values", () => {
    expect(organizationSlugSchema.safeParse("").success).toBe(false);
    expect(organizationSlugSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects path traversal and separators", () => {
    expect(organizationSlugSchema.safeParse("../demo-realty").success).toBe(false);
    expect(organizationSlugSchema.safeParse("demo/realty").success).toBe(false);
    expect(organizationSlugSchema.safeParse("demo realty").success).toBe(false);
  });

  it("rejects leading, trailing, or repeated hyphens", () => {
    expect(organizationSlugSchema.safeParse("-demo").success).toBe(false);
    expect(organizationSlugSchema.safeParse("demo-").success).toBe(false);
    expect(organizationSlugSchema.safeParse("demo--realty").success).toBe(false);
  });

  it("rejects values over the length limit", () => {
    expect(organizationSlugSchema.safeParse("a".repeat(65)).success).toBe(false);
  });
});
