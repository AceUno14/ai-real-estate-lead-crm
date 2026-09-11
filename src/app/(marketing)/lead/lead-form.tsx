"use client";

import { useActionState } from "react";

import {
  submitPublicLead,
  type PublicLeadState,
} from "@/server/actions/public-lead";

const initialState: PublicLeadState = { status: "idle" };

const inputClassName =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none";

export function LeadForm({ organizationSlug }: { organizationSlug: string }) {
  // The workspace slug is bound server-side, so the browser cannot swap in
  // another organization when the form is submitted (D-027).
  const [state, formAction, pending] = useActionState(
    submitPublicLead.bind(null, organizationSlug),
    initialState,
  );

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="rounded-md border border-green-200 bg-green-50 px-4 py-6 text-center"
      >
        <p className="text-base font-medium text-green-800">
          Thank you — your inquiry has been received.
        </p>
        <p className="mt-1 text-sm text-green-700">
          An agent will review your request and get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Full name <span aria-hidden="true">*</span>
          </label>
          <input id="name" name="name" type="text" required maxLength={120} autoComplete="name" className={inputClassName} />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email <span aria-hidden="true">*</span>
          </label>
          <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className={inputClassName} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium">
            Phone
          </label>
          <input id="phone" name="phone" type="tel" maxLength={40} autoComplete="tel" className={inputClassName} />
        </div>
        <div>
          <label htmlFor="inquiryType" className="block text-sm font-medium">
            I want to <span aria-hidden="true">*</span>
          </label>
          <select id="inquiryType" name="inquiryType" required defaultValue="" className={inputClassName}>
            <option value="" disabled>
              Select an option
            </option>
            <option value="BUY">Buy a property</option>
            <option value="SELL">Sell a property</option>
            <option value="RENT">Rent a property</option>
            <option value="INVEST">Invest</option>
            <option value="OTHER">Something else</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="propertyType" className="block text-sm font-medium">
            Property type
          </label>
          <select id="propertyType" name="propertyType" defaultValue="" className={inputClassName}>
            <option value="">Not sure yet</option>
            <option value="HOUSE">House</option>
            <option value="APARTMENT">Apartment</option>
            <option value="CONDO">Condo</option>
            <option value="LAND">Land</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
        </div>
        <div>
          <label htmlFor="preferredLocation" className="block text-sm font-medium">
            Preferred location <span aria-hidden="true">*</span>
          </label>
          <input id="preferredLocation" name="preferredLocation" type="text" required maxLength={160} className={inputClassName} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="budgetMin" className="block text-sm font-medium">
            Budget from (USD)
          </label>
          <input id="budgetMin" name="budgetMin" type="number" min={0} step={1000} className={inputClassName} />
        </div>
        <div>
          <label htmlFor="budgetMax" className="block text-sm font-medium">
            Budget to (USD)
          </label>
          <input id="budgetMax" name="budgetMax" type="number" min={0} step={1000} className={inputClassName} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="timeline" className="block text-sm font-medium">
            Timeline
          </label>
          <select id="timeline" name="timeline" defaultValue="" className={inputClassName}>
            <option value="">Not specified</option>
            <option value="ASAP">As soon as possible</option>
            <option value="ONE_TO_THREE_MONTHS">1–3 months</option>
            <option value="THREE_TO_SIX_MONTHS">3–6 months</option>
            <option value="SIX_PLUS_MONTHS">6+ months</option>
            <option value="JUST_BROWSING">Just browsing</option>
          </select>
        </div>
        <div>
          <label htmlFor="financingStatus" className="block text-sm font-medium">
            Financing
          </label>
          <select id="financingStatus" name="financingStatus" defaultValue="" className={inputClassName}>
            <option value="">Not specified</option>
            <option value="CASH">Cash buyer</option>
            <option value="PRE_APPROVED">Pre-approved</option>
            <option value="NEEDS_MORTGAGE">Needs a mortgage</option>
            <option value="UNSOLD_PROPERTY">Must sell current property first</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          Message <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          maxLength={4000}
          placeholder="Tell us what you are looking for…"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="source" className="block text-sm font-medium">
          How did you hear about us?
        </label>
        <select id="source" name="source" defaultValue="" className={inputClassName}>
          <option value="">Not specified</option>
          <option value="WEBSITE">Website</option>
          <option value="REFERRAL">Referral</option>
          <option value="SOCIAL_MEDIA">Social media</option>
          <option value="ADVERTISEMENT">Advertisement</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
