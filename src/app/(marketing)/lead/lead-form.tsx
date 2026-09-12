"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useActionState } from "react";

import {
  FieldGroup,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/ui/form-field";
import {
  submitPublicLead,
  type PublicLeadState,
} from "@/server/actions/public-lead";

const initialState: PublicLeadState = { status: "idle" };

const PROPERTY_TYPES = [
  { value: "HOUSE", label: "House" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "CONDO", label: "Condo" },
  { value: "LAND", label: "Land" },
  { value: "COMMERCIAL", label: "Commercial" },
] as const;

const TIMELINES = [
  { value: "ASAP", label: "As soon as possible" },
  { value: "ONE_TO_THREE_MONTHS", label: "1–3 months" },
  { value: "THREE_TO_SIX_MONTHS", label: "3–6 months" },
  { value: "SIX_PLUS_MONTHS", label: "6+ months" },
  { value: "JUST_BROWSING", label: "Just browsing" },
] as const;

const FINANCING_OPTIONS = [
  { value: "CASH", label: "Cash buyer" },
  { value: "PRE_APPROVED", label: "Pre-approved" },
  { value: "NEEDS_MORTGAGE", label: "Needs a mortgage" },
  { value: "UNSOLD_PROPERTY", label: "Must sell current property first" },
] as const;

const SOURCES = [
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social media" },
  { value: "ADVERTISEMENT", label: "Advertisement" },
  { value: "OTHER", label: "Other" },
] as const;

export function LeadForm({
  organizationSlug,
  organizationName,
}: {
  organizationSlug: string;
  organizationName?: string;
}) {
  // The workspace slug is bound server-side, so the browser cannot swap in
  // another organization when the form is submitted (D-027).
  const [state, formAction, pending] = useActionState(
    submitPublicLead.bind(null, organizationSlug),
    initialState,
  );

  if (state.status === "success") {
    return <SuccessPanel organizationName={organizationName} />;
  }

  return (
    <form action={formAction} className="space-y-8">
      {state.status === "error" ? (
        <p
          role="alert"
          className="rounded-md border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger"
        >
          {state.message}
        </p>
      ) : null}

      {/* CONTACT */}
      <FieldGroup title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="name"
            label="Full name"
            required
            autoComplete="name"
            maxLength={120}
          />
          <TextField
            name="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
          />
        </div>
        <TextField
          name="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          helpText="Optional — the easiest way for an agent to reach you."
          className="sm:max-w-[calc(50%-0.5rem)]"
        />
      </FieldGroup>

      {/* PROPERTY GOAL */}
      <FieldGroup
        title="Property goal"
        description="What are you looking to do, and where?"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="inquiryType"
            label="I want to"
            required
            placeholder="Select an option"
            options={[
              { value: "BUY", label: "Buy a property" },
              { value: "SELL", label: "Sell a property" },
              { value: "RENT", label: "Rent a property" },
              { value: "INVEST", label: "Invest" },
              { value: "OTHER", label: "Something else" },
            ]}
          />
          <SelectField
            name="propertyType"
            label="Property type"
            placeholder="Not sure yet"
            options={PROPERTY_TYPES}
          />
        </div>
        <TextField
          name="preferredLocation"
          label="Preferred location"
          required
          maxLength={160}
          placeholder="e.g. Austin, TX or the Riverside district"
        />
      </FieldGroup>

      {/* BUDGET & READINESS */}
      <FieldGroup
        title="Budget & readiness"
        description="Optional — helps your agent shortlist realistic options."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="budgetMin"
            label="Budget from (USD)"
            type="number"
            min={0}
            step={1000}
            placeholder="200,000"
          />
          <TextField
            name="budgetMax"
            label="Budget to (USD)"
            type="number"
            min={0}
            step={1000}
            placeholder="450,000"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="timeline"
            label="Timeline"
            placeholder="Not specified"
            options={TIMELINES}
          />
          <SelectField
            name="financingStatus"
            label="Financing"
            placeholder="Not specified"
            options={FINANCING_OPTIONS}
          />
        </div>
      </FieldGroup>

      {/* DETAILS */}
      <FieldGroup title="Details">
        <TextareaField
          name="message"
          label="Message"
          required
          rows={5}
          maxLength={4000}
          placeholder="Tell us what you are looking for — must-haves, nice-to-haves, anything useful."
        />
        <SelectField
          name="source"
          label="How did you hear about us?"
          placeholder="Not specified"
          options={SOURCES}
        />
      </FieldGroup>

      <div className="border-t border-line pt-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Sending…
            </>
          ) : (
            "Send inquiry"
          )}
        </button>
        <p className="mt-3 text-center text-xs text-muted sm:text-left">
          An agent reviews every inquiry before responding.
        </p>
      </div>
    </form>
  );
}

/**
 * Phase C — polished success confirmation. Calm, professional, no specific
 * response-time promise.
 */
function SuccessPanel({
  organizationName,
}: {
  organizationName?: string;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center px-2 py-8 text-center sm:py-12"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-success-soft">
        <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">
        Inquiry received
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
        Thank you{organizationName ? ` — ${organizationName} has` : " — we have"}{" "}
        your inquiry. An agent will review your requirements and reach out
        about your next steps.
      </p>

      <div className="mt-7 w-full rounded-lg border border-line bg-surface-muted p-4 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          What happens next
        </p>
        <ol className="mt-2.5 space-y-2.5 text-sm text-ink-secondary">
          <li className="flex gap-2.5">
            <span
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-navy-soft text-[11px] font-semibold text-navy"
              aria-hidden="true"
            >
              1
            </span>
            Your requirements are reviewed by an agent.
          </li>
          <li className="flex gap-2.5">
            <span
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-navy-soft text-[11px] font-semibold text-navy"
              aria-hidden="true"
            >
              2
            </span>
            You are contacted at the details you provided.
          </li>
          <li className="flex gap-2.5">
            <span
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-navy-soft text-[11px] font-semibold text-navy"
              aria-hidden="true"
            >
              3
            </span>
            Matching properties and next steps are discussed with you.
          </li>
        </ol>
      </div>
    </div>
  );
}
