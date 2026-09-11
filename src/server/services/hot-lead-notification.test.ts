import { describe, expect, it } from "vitest";

import { buildHotLeadEmail } from "@/server/services/hot-lead-notification";

const lead = {
  id: "lead_123",
  name: "Daniel Reyes",
  inquiryType: "BUY",
  propertyType: "HOUSE",
  preferredLocation: "Austin, TX",
  budgetMin: 400_000,
  budgetMax: 650_000,
  timeline: "ASAP",
  financingStatus: "PRE_APPROVED",
};

const qualification = {
  priority: "HIGH" as const,
  score: 82,
  confidence: 0.85,
  summary: "Ready buyer with financing.",
  recommendedAction: "Call Daniel today.",
};

const baseUrl = "https://ai-real-estate-lead-crm.vercel.app";

describe("buildHotLeadEmail", () => {
  it("builds a high-priority subject and body with a lead link", () => {
    const email = buildHotLeadEmail({ lead, qualification, baseUrl });

    expect(email.subject).toBe("High-priority lead: Daniel Reyes — score 82");
    expect(email.text).toContain("Name: Daniel Reyes");
    expect(email.text).toContain("Priority: HIGH");
    expect(email.text).toContain("AI score: 82/100");
    expect(email.text).toContain("Confidence: 85%");
    expect(email.text).toContain("Inquiry type: BUY");
    expect(email.text).toContain("Property type: HOUSE");
    expect(email.text).toContain("Preferred location: Austin, TX");
    expect(email.text).toContain("400,000 – 650,000 USD");
    expect(email.text).toContain("Timeline: ASAP");
    expect(email.text).toContain("Financing: PRE_APPROVED");
    expect(email.text).toContain("Ready buyer with financing.");
    expect(email.text).toContain("Call Daniel today.");
    expect(email.text).toContain(`${baseUrl}/leads/lead_123`);
    expect(email.html).toContain(`${baseUrl}/leads/lead_123`);
  });

  it("uses an URGENT subject for urgent leads", () => {
    const email = buildHotLeadEmail({
      lead,
      qualification: { ...qualification, priority: "URGENT", score: 95 },
      baseUrl,
    });
    expect(email.subject).toBe("URGENT lead: Daniel Reyes — score 95");
  });

  it("escapes untrusted lead text in the HTML body", () => {
    const email = buildHotLeadEmail({
      lead: { ...lead, name: '<script>alert("x")</script>' },
      qualification,
      baseUrl,
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    // The plain-text body keeps the raw value (no HTML context).
    expect(email.text).toContain('<script>alert("x")</script>');
  });

  it("tolerates missing optional fields", () => {
    const email = buildHotLeadEmail({
      lead: {
        ...lead,
        propertyType: null,
        budgetMin: null,
        budgetMax: null,
        timeline: null,
        financingStatus: null,
      },
      qualification,
      baseUrl,
    });

    expect(email.text).toContain("Property type: Not specified");
    expect(email.text).toContain("Budget: Not specified");
    expect(email.text).toContain("Timeline: Not specified");
    expect(email.text).toContain("Financing: Not specified");
  });
});
