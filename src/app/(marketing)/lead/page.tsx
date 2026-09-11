import type { Metadata } from "next";

import { LeadForm } from "./lead-form";

export const metadata: Metadata = {
  title: "Property inquiry",
  description:
    "Tell us what you are looking for and a local real-estate agent will get back to you.",
};

export default function PublicLeadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Property inquiry</h1>
      <p className="mt-2 text-slate-500">
        Looking to buy, sell, or rent? Send us the details and we will match
        you with the right agent.
      </p>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <LeadForm />
      </div>
    </main>
  );
}
