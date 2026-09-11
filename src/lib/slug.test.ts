import { describe, expect, it, vi } from "vitest";

import {
  defaultOrganizationName,
  organizationSlugBase,
  resolveUniqueOrganizationSlug,
  slugify,
} from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Demo Owner Realty")).toBe("demo-owner-realty");
  });

  it("strips diacritics and punctuation", () => {
    expect(slugify("Café & Réalty, Inc.")).toBe("cafe-realty-inc");
  });

  it("collapses separator runs and trims the edges", () => {
    expect(slugify("  --Hello   World--  ")).toBe("hello-world");
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("caps the slug length", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(48);
  });
});

describe("defaultOrganizationName", () => {
  it("uses the submitted account name", () => {
    expect(defaultOrganizationName("Demo Owner")).toBe("Demo Owner Realty");
  });

  it("collapses surrounding whitespace", () => {
    expect(defaultOrganizationName("  Demo   Owner  ")).toBe("Demo Owner Realty");
  });

  it("falls back when the name is blank", () => {
    expect(defaultOrganizationName("   ")).toBe("My Realty Workspace");
  });

  it("falls back when the name has no sluggable content", () => {
    expect(defaultOrganizationName("!!!")).toBe("My Realty Workspace");
  });
});

describe("organizationSlugBase", () => {
  it("derives a slug from the default workspace name", () => {
    expect(organizationSlugBase("Demo Owner")).toBe("demo-owner-realty");
  });

  it("falls back to a usable slug for un-sluggable names", () => {
    expect(organizationSlugBase("!!!")).toBe("my-realty-workspace");
  });
});

describe("resolveUniqueOrganizationSlug", () => {
  it("returns the base slug when it is free", async () => {
    const isSlugTaken = vi.fn().mockResolvedValue(false);

    await expect(
      resolveUniqueOrganizationSlug("demo-owner-realty", isSlugTaken),
    ).resolves.toBe("demo-owner-realty");
    expect(isSlugTaken).toHaveBeenCalledWith("demo-owner-realty");
  });

  it("appends the first free numeric suffix", async () => {
    const taken = new Set(["demo-owner-realty", "demo-owner-realty-2"]);

    await expect(
      resolveUniqueOrganizationSlug("demo-owner-realty", async (candidate) =>
        taken.has(candidate),
      ),
    ).resolves.toBe("demo-owner-realty-3");
  });

  it("normalizes the base slug and falls back when empty", async () => {
    await expect(
      resolveUniqueOrganizationSlug("", async () => false),
    ).resolves.toBe("workspace");
  });

  it("falls back to a random suffix when attempts are exhausted", async () => {
    const result = await resolveUniqueOrganizationSlug(
      "base",
      async () => true,
      3,
    );

    expect(result.startsWith("base-")).toBe(true);
    expect(result).not.toBe("base");
    expect(result).not.toBe("base-2");
    expect(result).not.toBe("base-3");
  });
});
