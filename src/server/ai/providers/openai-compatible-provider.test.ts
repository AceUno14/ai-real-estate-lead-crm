import { afterEach, describe, expect, it, vi } from "vitest";

import { OpenAiCompatibleProvider } from "@/server/ai/providers/openai-compatible-provider";
import { AiProviderError } from "@/server/ai/providers/types";

const validResult = {
  score: 80,
  priority: "HIGH",
  intent: "wants to buy a property",
  summary: "Summary.",
  timeline: "asap",
  budgetReadiness: "Ready",
  financingStatus: "cash",
  recommendedAction: "Call today.",
  draftReply: "Hi there,",
  confidence: 0.9,
};

const input = {
  name: "Jane Buyer",
  inquiryType: "BUY",
  preferredLocation: "Austin, TX",
  message: "Looking for a house.",
};

function makeProvider() {
  return new OpenAiCompatibleProvider({
    apiKey: "test-key-not-real",
    baseUrl: "http://localhost:9",
    model: "test-model",
    timeoutMs: 1000,
    systemPrompt: "system",
    buildUserPrompt: () => "user",
  });
}

function successResponse(): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(validResult) } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function rateLimitedResponse(retryAfter?: string): Response {
  return new Response("rate limited", {
    status: 429,
    headers: retryAfter ? { "retry-after": retryAfter } : {},
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OpenAiCompatibleProvider rate-limit handling", () => {
  it("returns a schema-valid result on a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse());
    vi.stubGlobal("fetch", fetchMock);

    const result = await makeProvider().qualify(input);

    expect(result.priority).toBe("HIGH");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once on 429 when Retry-After is short, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(rateLimitedResponse("0"))
      .mockResolvedValueOnce(successResponse());
    vi.stubGlobal("fetch", fetchMock);

    const result = await makeProvider().qualify(input);

    expect(result.score).toBe(80);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the bounded retry count when 429 persists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(rateLimitedResponse("0"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(makeProvider().qualify(input)).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
    // 1 initial attempt + at most 1 retry — never an unbounded loop.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry when Retry-After is too long", async () => {
    const fetchMock = vi.fn().mockResolvedValue(rateLimitedResponse("120"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(makeProvider().qualify(input)).rejects.toBeInstanceOf(
      AiProviderError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes other provider errors without retrying", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(makeProvider().qualify(input)).rejects.toMatchObject({
      code: "PROVIDER",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
