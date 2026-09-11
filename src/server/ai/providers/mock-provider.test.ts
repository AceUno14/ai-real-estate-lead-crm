import { describe, expect, it } from "vitest";

import {
  MockQualificationProvider,
  MOCK_FAILURE_TOKEN,
} from "@/server/ai/providers/mock-provider";
import { qualificationResultSchema } from "@/domain/qualification";
import { AiProviderError } from "@/server/ai/providers/types";

const baseInput = {
  name: "Jane Buyer",
  inquiryType: "BUY",
  preferredLocation: "Austin, TX",
  message: "Looking for a 3-bedroom house with a garden.",
};

describe("MockQualificationProvider", () => {
  it("returns a schema-valid result", async () => {
    const provider = new MockQualificationProvider();
    const result = await provider.qualify(baseInput);
    expect(() => qualificationResultSchema.parse(result)).not.toThrow();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("is deterministic for identical inputs", async () => {
    const provider = new MockQualificationProvider();
    const a = await provider.qualify(baseInput);
    const b = await provider.qualify(baseInput);
    expect(a).toEqual(b);
  });

  it("scores urgent cash buyers higher than browsers", async () => {
    const provider = new MockQualificationProvider();

    const urgent = await provider.qualify({
      ...baseInput,
      timeline: "ASAP",
      financingStatus: "CASH",
      budgetMax: 750_000,
      message: "We need to move this month, ready to make an offer.",
    });

    const browser = await provider.qualify({
      ...baseInput,
      timeline: "JUST_BROWSING",
      message: "Just curious about the market.",
    });

    expect(urgent.score).toBeGreaterThan(browser.score);
    expect(urgent.priority).toBe("URGENT");
    expect(browser.priority).toBe("LOW");
  });

  it("throws AiProviderError in the controlled failure mode", async () => {
    const provider = new MockQualificationProvider();
    await expect(
      provider.qualify({
        ...baseInput,
        message: `Interesting property ${MOCK_FAILURE_TOKEN}`,
      }),
    ).rejects.toBeInstanceOf(AiProviderError);
  });

  it("respects forced failure mode", async () => {
    const provider = new MockQualificationProvider(true);
    await expect(provider.qualify(baseInput)).rejects.toBeInstanceOf(
      AiProviderError,
    );
  });
});
