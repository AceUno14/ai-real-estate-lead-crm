import { afterEach, describe, expect, it, vi } from "vitest";

import { sendEmailViaResend } from "@/server/services/resend-email";

const input = {
  to: ["owner@example.test"],
  subject: "High-priority lead: Jane Buyer — score 82",
  html: "<p>hi</p>",
  text: "hi",
  idempotencyKey: "hot-lead-notification-qual_123",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendEmailViaResend", () => {
  it("does not attempt a request when Resend is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmailViaResend(input);

    expect(result).toEqual({
      ok: false,
      code: "NOT_CONFIGURED",
      retryable: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to the Resend API with a stable idempotency key", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key-not-real");
    vi.stubEnv("RESEND_FROM_EMAIL", "Alerts <alerts@example.test>");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "msg_1" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmailViaResend(input);

    expect(result).toEqual({ ok: true, messageId: "msg_1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key-not-real");
    expect(headers["Idempotency-Key"]).toBe(input.idempotencyKey);

    const body = JSON.parse(init.body as string);
    expect(body.from).toBe("Alerts <alerts@example.test>");
    expect(body.to).toEqual(["owner@example.test"]);
    expect(body.subject).toBe(input.subject);
    expect(body.html).toBe("<p>hi</p>");
    expect(body.text).toBe("hi");
  });

  it("does not retry authentication failures", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key-not-real");
    vi.stubEnv("RESEND_FROM_EMAIL", "alerts@example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmailViaResend(input);

    expect(result).toEqual({ ok: false, code: "AUTH", retryable: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry rate limiting", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key-not-real");
    vi.stubEnv("RESEND_FROM_EMAIL", "alerts@example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmailViaResend(input);

    expect(result).toEqual({
      ok: false,
      code: "RATE_LIMITED",
      retryable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a transient 5xx once and can succeed", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key-not-real");
    vi.stubEnv("RESEND_FROM_EMAIL", "alerts@example.test");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ id: "msg_2" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmailViaResend(input);

    expect(result).toEqual({ ok: true, messageId: "msg_2" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the transient retry bounded", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key-not-real");
    vi.stubEnv("RESEND_FROM_EMAIL", "alerts@example.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmailViaResend(input);

    expect(result).toEqual({
      ok: false,
      code: "PROVIDER_ERROR",
      retryable: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("normalizes network errors without leaking details", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key-not-real");
    vi.stubEnv("RESEND_FROM_EMAIL", "alerts@example.test");
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmailViaResend(input);

    expect(result).toEqual({ ok: false, code: "NETWORK", retryable: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
