import { describe, expect, it, vi } from "vitest";

/**
 * Session helper unit tests (T070 — authentication protection).
 *
 * next-auth and auth-options are mocked so these tests stay pure: no
 * database, no environment secrets, no network.
 */

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

// Prevents auth-options (and therefore Prisma) from being loaded.
vi.mock("@/server/auth/auth-options", () => ({ authOptions: {} }));

function resetMocks() {
  mocks.getServerSession.mockReset();
  mocks.redirect.mockReset();
}

describe("getSessionUser", () => {
  it("returns null when there is no session", async () => {
    resetMocks();
    mocks.getServerSession.mockResolvedValue(null);

    const { getSessionUser } = await import("@/server/auth/session");
    expect(await getSessionUser()).toBeNull();
  });

  it("returns null when the session has no user id", async () => {
    resetMocks();
    mocks.getServerSession.mockResolvedValue({
      user: { email: "agent@example.com" },
    });

    const { getSessionUser } = await import("@/server/auth/session");
    expect(await getSessionUser()).toBeNull();
  });

  it("returns the authenticated user", async () => {
    resetMocks();
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user_1", email: "agent@example.com", name: "Agent" },
    });

    const { getSessionUser } = await import("@/server/auth/session");
    expect(await getSessionUser()).toEqual({
      id: "user_1",
      email: "agent@example.com",
      name: "Agent",
    });
  });
});

describe("requireSessionUser", () => {
  it("redirects unauthenticated callers to sign-in", async () => {
    resetMocks();
    mocks.getServerSession.mockResolvedValue(null);
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    const { requireSessionUser } = await import("@/server/auth/session");
    await expect(requireSessionUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("returns the user without redirecting when authenticated", async () => {
    resetMocks();
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user_1", email: "agent@example.com", name: "Agent" },
    });

    const { requireSessionUser } = await import("@/server/auth/session");
    const user = await requireSessionUser();
    expect(user.id).toBe("user_1");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
