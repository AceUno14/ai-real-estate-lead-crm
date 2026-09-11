import { describe, expect, it } from "vitest";

import { publicLeadInputSchema, toQualificationInput } from "@/domain/lead";

const validInput = {
  name: "Jane Buyer",
  email: "jane@example.com",
  inquiryType: "BUY",
  preferredLocation: "Austin, TX",
  message: "Looking for a 3-bedroom house with a garden.",
};

describe("publicLeadInputSchema", () => {
  it("accepts a minimal valid submission", () => {
    const result = publicLeadInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts optional fields when provided", () => {
    const result = publicLeadInputSchema.safeParse({
      ...validInput,
      phone: "+1 555 0100",
      propertyType: "HOUSE",
      budgetMin: 300_000,
      budgetMax: 500_000,
      timeline: "ASAP",
      financingStatus: "PRE_APPROVED",
      source: "WEBSITE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = publicLeadInputSchema.safeParse({
      email: "jane@example.com",
      message: "hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = publicLeadInputSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative budgets", () => {
    const result = publicLeadInputSchema.safeParse({
      ...validInput,
      budgetMin: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects phone numbers with letters", () => {
    const result = publicLeadInputSchema.safeParse({
      ...validInput,
      phone: "call me maybe",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes email casing and whitespace", () => {
    const result = publicLeadInputSchema.parse({
      ...validInput,
      email: "  Jane@Example.COM ",
      name: "  Jane Buyer  ",
    });
    expect(result.email).toBe("jane@example.com");
    expect(result.name).toBe("Jane Buyer");
  });
});

describe("toQualificationInput", () => {
  it("maps empty optional strings to null", () => {
    const result = toQualificationInput({
      ...validInput,
      phone: "",
      propertyType: "",
      budgetMin: null,
      budgetMax: null,
      timeline: "",
      financingStatus: "",
      source: "",
    });
    expect(result.propertyType).toBeNull();
    expect(result.budgetMin).toBeNull();
    expect(result.budgetMax).toBeNull();
    expect(result.timeline).toBeNull();
    expect(result.financingStatus).toBeNull();
    expect(result.source).toBeNull();
  });

  it("keeps provided values", () => {
    const result = toQualificationInput({
      ...validInput,
      budgetMin: 250_000,
      budgetMax: 450_000,
    });
    expect(result.budgetMin).toBe(250_000);
    expect(result.budgetMax).toBe(450_000);
    expect(result.name).toBe("Jane Buyer");
  });
});
