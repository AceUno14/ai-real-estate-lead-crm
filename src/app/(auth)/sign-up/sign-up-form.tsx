"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useActionState } from "react";

import { PasswordField, TextField } from "@/components/ui/form-field";
import { signUp, type SignUpState } from "@/server/auth/sign-up";

const initialState: SignUpState = {};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  if (state.success) {
    return (
      <div
        role="status"
        className="flex flex-col items-center px-2 py-6 text-center"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
        </span>
        <p className="mt-3.5 text-base font-semibold text-ink">
          Workspace ready
        </p>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          Your account and workspace have been created.{" "}
          <a
            href="/sign-in"
            className="font-medium text-navy underline underline-offset-2 hover:text-navy-strong"
          >
            Sign in
          </a>{" "}
          to open your dashboard.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <TextField
        name="name"
        label="Full name"
        required
        autoComplete="name"
        maxLength={120}
      />

      <TextField
        name="email"
        label="Work email"
        type="email"
        required
        autoComplete="email"
        maxLength={254}
      />

      <PasswordField
        name="password"
        label="Password"
        required
        minLength={8}
        autoComplete="new-password"
        helpText="At least 8 characters."
      />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </button>
      <p className="text-center text-xs leading-5 text-muted">
        Creating an account sets up your initial real-estate workspace with
        you as its owner.
      </p>
    </form>
  );
}
