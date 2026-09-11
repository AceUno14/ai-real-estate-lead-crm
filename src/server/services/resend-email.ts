import { getResendConfig } from "@/lib/env";

/**
 * Minimal Resend transactional-email transport (TASKS.md T058).
 *
 * Uses the Resend HTTP API directly with `fetch` — no SDK dependency.
 *
 * Security / robustness rules:
 * - the API key is read from the environment on the server only and is never
 *   logged, returned, or included in error messages
 * - requests are bounded by a timeout via AbortController
 * - Resend response bodies are never surfaced (they can contain provider
 *   internals); callers only receive a normalized failure code
 * - a single small retry is allowed for transient 5xx / network failures;
 *   4xx (auth/configuration, 429, other client errors) are never retried
 * - a stable `Idempotency-Key` is sent so the provider can de-duplicate
 */

export type SendEmailInput = {
  to: string[];
  subject: string;
  html: string;
  text: string;
  /** Stable key derived from the triggering record (e.g. the qualification id). */
  idempotencyKey: string;
};

export type SendEmailFailureCode =
  | "NOT_CONFIGURED"
  | "AUTH"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "NETWORK"
  | "TIMEOUT";

export type SendEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; code: SendEmailFailureCode; retryable: boolean };

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_TRANSIENT_RETRIES = 1;
const RETRY_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptSend(
  config: { apiKey: string; fromEmail: string },
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Sent only to the configured provider over the server runtime.
        Authorization: `Bearer ${config.apiKey}`,
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from: config.fromEmail,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: controller.signal,
    });

    if (response.ok) {
      let messageId: string | undefined;
      try {
        const payload = (await response.json()) as { id?: unknown };
        if (typeof payload.id === "string") {
          messageId = payload.id;
        }
      } catch {
        // A malformed success body is harmless; the send already happened.
      }
      return { ok: true, messageId };
    }

    if (response.status === 401 || response.status === 403) {
      return { ok: false, code: "AUTH", retryable: false };
    }
    if (response.status === 429) {
      // Deliberately no retry: avoid burning a free provider quota.
      return { ok: false, code: "RATE_LIMITED", retryable: false };
    }
    if (response.status >= 500) {
      return { ok: false, code: "PROVIDER_ERROR", retryable: true };
    }
    return { ok: false, code: "PROVIDER_ERROR", retryable: false };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, code: "TIMEOUT", retryable: true };
    }
    return { ok: false, code: "NETWORK", retryable: true };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sends one email through Resend. Never throws; every failure is normalized to
 * a {@link SendEmailResult} with a safe code.
 */
export async function sendEmailViaResend(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const config = getResendConfig();
  if (!config) {
    return { ok: false, code: "NOT_CONFIGURED", retryable: false };
  }

  for (let attempt = 0; ; attempt += 1) {
    const result = await attemptSend(config, input);

    if (
      result.ok ||
      !result.retryable ||
      attempt >= MAX_TRANSIENT_RETRIES
    ) {
      return result;
    }

    await sleep(RETRY_DELAY_MS);
  }
}
