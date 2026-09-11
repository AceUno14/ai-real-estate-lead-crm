"use client";

import { useActionState } from "react";

import { signUp, type SignUpState } from "@/server/auth/sign-up";

const initialState: SignUpState = {};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  if (state.success) {
    return (
      <div role="status" className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">        Account created and your workspace is ready. You can now{" "}
        <a href="/sign-in" className="font-medium underline">
          sign in
        </a>{" "}
        to open your dashboard.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
        ) : null}

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
