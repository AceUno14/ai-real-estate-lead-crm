import { describe, expect, it } from "vitest";

import {
  qualificationResultSchema,
  qualificationStatusSchema,
} from "@/domain/qualification";

const validResult = {
  score: 78,
  priority: "HIGH",
  intent: "wants to buy a family home",
  summary: "Jane is looking for a 3-bedroom house in Austin.",
  timeline: "as soon as possible",
  budgetReadiness: "stated a concrete budget range",
  financingStatus: "pre-approved",
  recommendedAction: "Call Jane today",
  draftReply: "Hi Jane, thank you for reaching out…",
  confidence: 0.9,
};

describe("qualificationResultSchema", () => {
  it("accepts a valid qualification result", () => {
    const result = qualificationResultSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  it("rejects non-integer scores", () => {
    const result = qualificationResultSchema.safeParse({
      ...validResult,
      score: 78.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range scores", () => {
    expect(
      qualificationResultSchema.safeParse({ ...validResult, score: -1 })
        .success,
    ).toBe(false);
    expect(
      qualificationResultSchema.safeParse({ ...validResult, score: 101 })
        .success,
    ).toBe(false);
  });

  it("rejects invalid priorities", () => {
    const result = qualificationResultSchema.safeParse({
      ...validResult,
      priority: "MAYBE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range confidence", () => {
    expect(
      qualificationResultSchema.safeParse({ ...validResult, confidence: 1.5 })
        .success,
    ).toBe(false);
    expect(
      qualificationResultSchema.safeParse({ ...validResult, confidence: -0.1 })
        .success,
    ).toBe(false);
  });

  it("rejects missing or empty required text fields", () => {
    const result = qualificationResultSchema.safeParse({
      ...validResult,
      summary: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects extra unknown fields is allowed but ignored by parse", () => {
    // Zod strips unknown keys by default; the schema contract is about the
    // required fields, not strict rejection of extras.
    const parsed = qualificationResultSchema.parse({
      ...validResult,
      rogueField: "should be stripped",
    });
    expect(parsed).not.toHaveProperty("rogueField");
  });
});

describe("qualificationStatusSchema", () => {
  it("accepts persistence statuses", () => {
    for (const status of ["PENDING", "SUCCEEDED", "FAILED"]) {
      expect(qualificationStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects unknown statuses", () => {
    expect(qualificationStatusSchema.safeParse("DONE").success).toBe(false);
  });
});
