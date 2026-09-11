import { describe, expect, it } from "vitest";

import {
  AUTOMATIC_TASK_DUE_HOURS,
  planAutomaticFollowUpTask,
} from "@/server/services/auto-follow-up-task";

const HOUR_MS = 60 * 60 * 1000;
const now = new Date("2026-09-12T12:00:00.000Z");

describe("planAutomaticFollowUpTask", () => {
  it("plans a task due within 24 hours for HIGH priority", () => {
    const plan = planAutomaticFollowUpTask({
      priority: "HIGH",
      leadName: "Daniel Reyes",
      recommendedAction: "Call Daniel today.",
      now,
    });

    expect(plan).not.toBeNull();
    expect(plan?.title).toBe("Follow up with Daniel Reyes");
    expect(plan?.description).toBe("Call Daniel today.");
    expect(plan?.dueDate.getTime()).toBe(
      now.getTime() + AUTOMATIC_TASK_DUE_HOURS.HIGH! * HOUR_MS,
    );
    // Due within 24 hours of now.
    expect(plan!.dueDate.getTime()).toBeLessThanOrEqual(
      now.getTime() + 24 * HOUR_MS,
    );
  });

  it("plans a sooner, clearly urgent task for URGENT priority", () => {
    const urgent = planAutomaticFollowUpTask({
      priority: "URGENT",
      leadName: "Marcus Reed",
      recommendedAction: "Call immediately.",
      now,
    });
    const high = planAutomaticFollowUpTask({
      priority: "HIGH",
      leadName: "Marcus Reed",
      recommendedAction: "Call today.",
      now,
    });

    expect(urgent?.title).toBe("Urgent follow-up with Marcus Reed");
    expect(urgent!.dueDate.getTime()).toBeLessThan(high!.dueDate.getTime());
  });

  it("creates nothing for LOW priority", () => {
    expect(
      planAutomaticFollowUpTask({
        priority: "LOW",
        leadName: "Browser",
        now,
      }),
    ).toBeNull();
  });

  it("creates nothing for MEDIUM priority", () => {
    expect(
      planAutomaticFollowUpTask({
        priority: "MEDIUM",
        leadName: "Warm Lead",
        now,
      }),
    ).toBeNull();
  });

  it("falls back to a sensible description when no recommended action exists", () => {
    const high = planAutomaticFollowUpTask({
      priority: "HIGH",
      leadName: "No Action",
      recommendedAction: "   ",
      now,
    });
    expect(high?.description).toBe(
      "High-priority lead — follow up within 24 hours.",
    );

    const urgent = planAutomaticFollowUpTask({
      priority: "URGENT",
      leadName: "No Action",
      recommendedAction: null,
      now,
    });
    expect(urgent?.description).toBe(
      "Urgent lead — follow up as soon as possible.",
    );
  });

  it("falls back to a generic subject for a blank lead name", () => {
    const plan = planAutomaticFollowUpTask({
      priority: "HIGH",
      leadName: "   ",
      recommendedAction: "Call.",
      now,
    });
    expect(plan?.title).toBe("Follow up with this lead");
  });
});
