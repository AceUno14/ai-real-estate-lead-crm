# AI Real Estate Lead CRM — TASKS

## WORKING RULE

Complete tasks in order unless a blocker requires a documented change.

Primary coding AI:

DeepSeek V4 Flash

Fallback / escalation AI:

GLM 5.3 Flash

Do not switch models routinely.

After completing a task:

- run relevant verification
- update this file
- mark the task complete
- immediately continue to the next clearly defined task when no user input is required

Legend:

[ ] Not started

[-] In progress

[x] Complete

[!] Blocked

# PHASE 1 — PLANNING

## T001 — Create Project Planning Documents

Status: [x]

Create:

- AI_CONTEXT.md
- ARCHITECTURE.md
- DECISIONS.md
- TASKS.md
- .env.example
- README.md

# PHASE 2 — FOUNDATION

## T010 — Initialize Next.js Application

Status: [x]

Scope:

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- clean src-based structure if appropriate
- import aliases
- keep planning documents at repository root
- confirm development server starts

Do not add yet:

- authentication
- Prisma
- database logic
- runtime AI integration

Completion requirements:

- application initializes successfully
- npm dependencies install
- development server starts
- base page loads
- TypeScript configuration is valid
- project documentation remains intact

## T011 — Add Core Dependencies

Status: [x]

Scope:

- Prisma
- Prisma Client
- PostgreSQL support
- Zod
- environment validation foundation
- minimal utilities only

Do not add unnecessary dependencies.

Completion requirements:

- dependencies install successfully
- Prisma can initialize
- Zod is available
- environment configuration has a clear structure
- project still builds

## T012 — Authentication Foundation

Status: [x]

Progress note: verified end-to-end against Neon. NextAuth v4 credentials + JWT sessions. HTTP round trip: GET /api/auth/csrf → POST /api/auth/callback/credentials with the seeded demo owner → GET /api/auth/session returns the real Neon user id. Unauthenticated /dashboard and /leads redirect (307) to /sign-in; /sign-in and /api/auth/* reachable. Session helpers covered by unit tests (src/server/auth/session.test.ts).

Sign-up provisioning (D-026, resolved this session): a successful self-service sign-up now creates the User, a default Organization with a server-generated unique slug, and an OWNER Membership in a single transaction, so the new account can enter the dashboard immediately. Verified by live tests and an HTTP sign-up → sign-in → /dashboard (200) check; retries do not create duplicate workspaces. /no-organization is preserved as the fallback for accounts with no membership.

Scope:

- select a Next.js-compatible authentication solution
- authentication setup
- sign-up
- sign-in
- sign-out
- session retrieval
- protected dashboard shell

Do not build organization membership logic beyond what is needed for the next task.

Completion requirements:

- user can authenticate
- unauthenticated users cannot access protected dashboard
- authenticated session can be read server-side
- secrets stay server-side

## T013 — Organization Membership and Tenant Guard

Status: [x]

Scope:

- Organization
- Membership
- OWNER role
- MEMBER role
- active organization resolution
- server-side membership checks
- workspace authorization helpers
- protected dashboard routes
- tenant isolation

Completion requirements:

- user can only access organizations they belong to
- protected queries use organization context
- cross-organization access is rejected

# PHASE 3 — DATABASE AND CRM CORE

## T020 — Create Prisma Schema

Status: [x]

Create models for:

- User and auth models required by selected auth solution
- Organization
- Membership
- Lead
- LeadQualification
- LeadNote
- FollowUpTask
- Activity

Create enums for:

- MembershipRole
- LeadStatus
- LeadPriority
- QualificationReviewState

Requirements:

- proper relations
- organization scoping
- timestamps
- useful indexes
- no unnecessary complexity

## T021 — Create Initial Migration and Seed Data

Status: [x]

Progress note: verified against Neon. `prisma migrate status` reports "Database schema is up to date!" (1 migration: 20260910201219_init). `npm run db:seed` is idempotent: creates organization "Demo Realty Group" (slug demo-realty), owner owner@demo-realty.test (OWNER membership), and 18 fictional leads; re-running reports "0 new lead(s), 18 already present". Password hash verifies with bcrypt; membership resolution confirmed (scripts/check-auth.ts).

Scope:

- create initial migration
- create fictional organization
- create fictional membership where appropriate
- create 15 to 25 fictional real-estate leads
- use multiple statuses
- use multiple lead sources
- use multiple budgets
- use different timelines

Do not use real customer data.

## T022 — Tenant-Scoped Database Helpers

Status: [x]

Scope:

- organization-scoped lead reads
- organization-scoped lead writes
- safe lead lookup
- safe organization lookup
- safe not-found behavior

Requirements:

Never allow protected CRM queries to retrieve records across organizations.

# PHASE 4 — PUBLIC LEAD CAPTURE

## T030 — Public Lead Capture Page

Status: [x]

Create a public real-estate inquiry form.

Fields:

- name
- email
- phone
- inquiry type
- property type
- preferred location
- budget minimum
- budget maximum
- timeline
- financing status
- message
- source when appropriate

Requirements:

- responsive
- mobile friendly
- accessible labels
- validation errors
- success state
- professional real-estate design

## T031 — Public Lead Creation

Status: [x]

Progress note: verified against Neon by the live integration test. submitPublicLead resolves the organization server-side from the workspace slug in the route (D-027), validates with Zod, creates the Lead (status NEW) + a LEAD_CREATED Activity, and returns success; an invalid submission creates nothing. Browser never supplies an organization id.

Scope:

- server-side validation
- Zod validation
- safe organization resolution
- create Lead
- create Activity
- safe error handling

Security:

Do not trust organizationId supplied by the browser.

Design the endpoint so rate limiting and spam protection can be added later.

## T032 — Workspace-Specific Public Lead Routing

Status: [x]

Progress note: public lead capture is now workspace-specific (D-027). The form
lives at `/lead/[organizationSlug]`; the page validates the slug, resolves the
organization server-side with `getOrganizationBySlug`, and renders a 404 for
unknown or malformed slugs (no submission path). The submit action now takes a
server-bound `organizationSlug`, resolves the trusted `organizationId` itself,
and ignores any `organizationId` in the payload. The legacy `/lead` route
redirects to `/lead/<PUBLIC_LEAD_ORG_SLUG>`, which now only selects the default
workspace for that redirect. Covered by live tests: `/lead/demo-realty` and
`/lead/esmael-realty` each create leads under their own workspace, a
client-supplied `organizationId` is ignored, and unknown/malformed slugs create
nothing. Tenant isolation and public lead validation remain intact.

Scope:

- new `/lead/[organizationSlug]` route that resolves the organization server-side
- slug validation schema (`src/domain/organization.ts`)
- submit action resolves the slug to a trusted organizationId
- never accept or trust a client-supplied organizationId
- legacy `/lead` redirect to the configured default workspace
- tests proving routing, isolation, and validation
- documentation updates

Security:

- unknown slug → not-found, no lead created
- organizationId is always resolved server-side

# PHASE 5 — CRM DASHBOARD

## T040 — Dashboard Shell and Navigation

Status: [x]

Progress note: routes, sidebar/mobile navigation, page-header system, loading/error states, and the protected layout are in place. /settings is no longer a placeholder — it renders a read-only, server-resolved workspace overview (name, slug, membership role) plus the signed-in member.

Create routes:

- /dashboard
- /leads
- /leads/[leadId]
- /tasks
- /settings

Create:

- dashboard sidebar/navigation
- responsive layout
- page header system
- loading states
- protected layout

## T041 — Lead List

Status: [x]

Display:

- name
- contact
- status
- AI priority when available
- AI score when available
- source
- preferred location
- created date

Add:

- search
- status filter
- priority filter
- source filter
- sorting
- pagination-ready query design

Requirements:

All queries must be organization scoped.

## T042 — Lead Detail Page

Status: [x]

Display:

- lead profile
- contact information
- inquiry details
- preferred location
- property type
- budget
- timeline
- financing status
- message
- source
- status
- AI qualification
- notes
- follow-up tasks
- activity timeline

## T043 — Lead Mutation Actions

Status: [x]

Implement:

- update status
- assign user where appropriate
- edit safe lead fields
- add note
- create Activity entries

Security:

Every mutation must validate organization ownership.

## T044 — Follow-Up Tasks

Status: [x]

Progress note: create/complete/reopen actions are validated and organization-scoped with activity logging; the dashboard shows a "Follow-ups due" metric. This session completed the missing piece — the /tasks route was still a placeholder. It now lists pending tasks (overdue highlighted) and completed tasks for the active organization, each linking to its lead with a complete/reopen control, and task mutations revalidate both the lead page and /tasks.

- create follow-up
- description/title
- due date
- associate with lead
- mark complete
- reopen
- list pending tasks

Add dashboard summary for follow-ups needing attention.

# PHASE 6 — AI QUALIFICATION

## T050 — Qualification Schema and Prompt Contract

Status: [x]

Create validated schema for:

- score
- priority
- intent
- summary
- timeline
- budgetReadiness
- financingStatus
- recommendedAction
- draftReply
- confidence

Requirements:

score:
0 to 100 integer

confidence:
0 to 1

priority:
- LOW
- MEDIUM
- HIGH
- URGENT

Create versioned qualification prompt.

## T051 — Mock AI Provider

Status: [x]

Implement deterministic mock provider.

Requirements:

- always returns schema-valid data
- predictable scoring for testing
- supports controlled failure mode
- requires no paid AI API
- works with fictional leads

## T052 — AI Provider Interface and Runtime Selection

Status: [x]

Implement:

- provider interface
- provider factory
- AI_PROVIDER environment variable
- AI_MODEL environment variable
- normalized provider errors

Default provider:

mock

## T053 — OpenAI-Compatible Runtime Provider

Status: [x]

Progress note: implementation complete (timeout via AbortController, safe error normalization, Zod validation, no secret logging). Live HTTP path will be exercised only when a real AI_API_KEY is configured; mock remains the default provider.

Implement:

- server-only API key
- configurable base URL
- configurable model
- timeout handling
- safe HTTP handling
- structured response parsing
- Zod validation
- normalized errors

Security:

Never log API keys or raw secrets.

## T054 — Lead Qualification Workflow

Status: [x]

Flow:

- receive leadId
- resolve authenticated organization
- load lead using leadId + organizationId
- prepare qualification input
- call configured AI provider
- validate result
- persist LeadQualification
- store provider/model metadata
- create Activity
- handle failures
- allow retry

Requirements:

AI failure must not damage the Lead.

## T055 — Human Review of AI Draft

Status: [x]

Implement states:

- GENERATED
- EDITED
- APPROVED
- REJECTED

Features:

- view AI draft
- edit draft
- approve draft
- reject draft

Do not send outbound messages.

## T056 — Automatic Qualification After Public Lead Capture

Status: [x]

Progress note: public submissions now trigger AI qualification automatically
after the lead is persisted and the visitor has already received success
(D-028). Qualification was refactored into a session-free trusted core
(`qualifyLeadForOrganization({ organizationId, leadId, actorUserId })`) plus
an authenticated manual wrapper in `src/server/actions/qualification.ts`;
the automatic path calls the same core with `actorUserId = null`. Scheduling
uses Next.js `after()` from `next/server` (the supported post-response API),
so the visitor never waits on the AI and no external queue was introduced.
Failures (including HTTP 429) record a `QUALIFICATION_FAILED` activity and
leave the lead intact and manually requalifiable. Automatic runs are
idempotent (skip when a qualification already exists). The openai-compatible
provider retries HTTP 429 at most once, respects `Retry-After`, and fails
fast when the wait exceeds 5 seconds. No schema migration was required.

Scope:

- session-free trusted core qualification service
- authenticated manual wrapper preserved
- automatic post-response qualification via `after()`
- system activity with `actorUserId = null`
- idempotent automatic runs
- bounded HTTP 429 handling
- lead detail status label (pending / failed — retry available)
- tests + documentation

Security:

- the public form still never supplies an `organizationId`
- the core scopes the lead by `organizationId + leadId`
- no secrets or provider internals are exposed

## T057 — Automatic Follow-Up Task for High-Value Leads

Status: [x]

Progress note: after a LeadQualification is successfully persisted, HIGH and
URGENT results create exactly one automatic follow-up task (D-029). The rule
lives in `src/server/services/auto-follow-up-task.ts` — a pure
`planAutomaticFollowUpTask` plus an idempotent, organization-scoped
`createAutomaticFollowUpTaskIfNeeded` called from the qualification core after
persistence. LOW/MEDIUM create nothing. Due dates use server time: HIGH is due
in 24 hours, URGENT in 2 hours. Idempotency reuses the existing Activity ledger
(`AUTO_FOLLOW_UP_CREATED`, written in the same transaction as the task), so
repeated/racing qualification runs cannot duplicate the task. System rows use
`actorUserId = null`. Task creation is best-effort: a failure never removes the
qualification, lead, or activities, and manual task creation stays available.
No schema migration was required.

Scope:

- pure priority rule + due-date offsets
- idempotent automatic task creation after successful qualification
- `AUTO_FOLLOW_UP_CREATED` activity (system actor)
- best-effort failure isolation
- tests + documentation

Rules:

- run only after a successful qualification is persisted
- use only the server-trusted, Zod-validated qualification result
- task links the same trusted `organizationId` and `leadId`
- no client-supplied priority or recommended action

# PHASE 7 — DASHBOARD INSIGHTS

## T060 — Dashboard Metrics

Status: [x]

Create cards for:

- total leads
- new leads
- high-priority leads
- urgent leads
- average AI score
- follow-ups due

Create sections for:

- leads by status
- recent activity
- recent leads

All metrics must be organization scoped.

## T061 — Contact-First Ranking

Status: [x]

Create a section answering:

Who should I contact first?

Display top leads using:

- AI score
- priority
- short reasoning
- timeline
- recommended action

Authorization and visibility must still come from server-side organization rules.

AI must never decide which organization records the user can see.

# PHASE 8 — TESTING, SECURITY, AND POLISH

## T070 — Testing Baseline

Status: [x]

Progress note: 44 tests passing across 6 files (vitest). Unit: qualification schema (incl. malformed-output rejection), public lead validation, qualification input mapping, versioned prompt contract, mock provider determinism + controlled failure mode, session/auth-protection helpers. Live (Neon, mock AI): public lead workflow + activity, tenant isolation (cross-organization status/note mutations rejected; own-org mutation succeeds), follow-up task create/complete/reopen + activities, human review edit/approve + terminal-state enforcement, qualification success persistence, and provider-failure recovery (lead left usable). The live suite is src/server/actions/integration.live.test.ts and requires DATABASE_URL.

Test:

- qualification schema
- public lead validation
- tenant isolation
- lead status mutation
- malformed AI response
- AI provider failure
- authentication protection

Include at least one happy-path lead workflow.

## T071 — Security Review

Status: [x]

Progress note: verified — no client-supplied organization IDs anywhere (grep audit) — sign-up provisions the workspace and OWNER role entirely server-side from the submitted name/email/password only; all protected queries go through org-scoped helpers; every mutation validates ownership; no console logging of secrets/env; AI output Zod-validated before persistence; lead message isolated in prompt data delimiters; public endpoint is a single server action ready for rate limiting; error responses are generic. Re-audit this session found and fixed one real defect: setQualificationReviewState and editQualificationDraft wrote an Activity using the client-supplied leadId instead of the server-trusted, org-scoped qualification.leadId (cross-tenant integrity issue). Both actions now use qualification.leadId, and APPROVED/REJECTED review states are enforced as terminal server-side. Regression coverage added in the live integration test.

Check:

- authentication
- authorization
- organization isolation
- input validation
- client/server boundaries
- environment variables
- secret handling
- error responses
- logs
- AI output validation
- AI prompt injection surface
- public lead endpoint abuse surface

Fix only real issues found.

Avoid unrelated refactors.

## T072 — UX, Accessibility, and Mobile Review

Status: [x]

Progress note: accessible labels on all form fields, native focus states, responsive grids/sidebar, overflow-safe tables, loading/empty/error states on dashboard pages, truncated long text. Real-device pass recommended during deployment smoke test (T082).

Check:

- mobile layout
- tablet layout
- desktop layout
- keyboard navigation
- focus states
- form labels
- error states
- empty states
- loading states
- long text
- button sizes
- no horizontal overflow

## T073 — Build, Lint, and TypeScript Cleanup

Status: [x]

Run:

- lint
- TypeScript checks
- production build

Fix actual errors.

Avoid unnecessary refactoring.

# PHASE 9 — DEPLOYMENT

## T080 — Neon Production Database

Status: [ ]

Scope:

- create Neon PostgreSQL database
- configure DATABASE_URL
- configure DIRECT_URL if required
- apply production-safe migrations

Do not commit credentials.

## T081 — Vercel Deployment

Status: [ ]

Scope:

- import repository
- configure environment variables
- deploy Next.js application
- configure auth URLs/origins
- connect Neon database

## T082 — Production Smoke Test

Status: [ ]

Verify:

- landing page
- sign-up/sign-in
- protected dashboard
- public lead submission
- lead list
- lead detail
- status changes
- notes
- tasks
- qualification
- AI failure handling
- human review
- mobile layout
- 404 behavior
- error handling

# PHASE 10 — PORTFOLIO POLISH

## T090 — Professional Demo Data

Status: [x]

Progress note: the seed (prisma/seed.ts) already provides 18 fictional leads covering the requested archetypes — urgent cash buyer (Marcus Reed), first-time pre-approved buyer (Priya Natarajan), investor (Daniel Okafor, Fatima Al-Rashid), rental lead (Liam Gallagher, Amelia Wright, Oliver Grant), seller lead (Sofia Marchetti, Elena Petrova, Ryan O'Connor), long-term nurture (Tom Becker, Amelia Wright), and pre-approved buyers (Grace Chen, Noah Kimberly, Isabella Moretti). Multiple statuses/sources/budgets/timelines; no real contact information. Remaining polish can be folded into T091.

Create polished fictional real-estate data.

Include examples such as:

- urgent buyer
- first-time buyer
- investor
- rental lead
- seller lead
- long-term nurture lead
- cash buyer
- pre-approved buyer

Do not use real contact information.

## T091 — Final README

Status: [ ]

README should include:

- project overview
- business problem
- solution
- core workflow
- screenshots
- technology stack
- architecture
- AI qualification flow
- security design
- organization isolation
- installation
- environment variables
- local development
- deployment
- demo link
- portfolio explanation

# CURRENT NEXT TASK

T080 — Neon Production Database

Phases 1–7 and the local testing baseline (T070/T071/T073) are complete and verified against the local Neon database. T080–T082 (production database, Vercel deployment, production smoke test) and the deployment-dependent parts of T091 (screenshots, demo link) require user-supplied production credentials and account actions, so they are blocked pending input.

Verified this session:

- migration state in sync with Neon
- idempotent seed (organization, owner membership, 18 leads)
- authentication round trip against Neon
- organization/tenant isolation and cross-tenant rejection
- public lead submission persistence
- lead list/detail rendering from persisted records
- status/notes/follow-up-task/activity mutations
- mock AI qualification success + failure recovery + human review
- self-service sign-up workspace provisioning + dashboard access (D-026)

Verified this session (T032 — workspace-specific public lead routing):

- `/lead/[organizationSlug]` resolves the slug server-side to one workspace
- `/lead/demo-realty` and `/lead/esmael-realty` each create leads under their
  own workspace
- a browser-supplied `organizationId` is ignored
- unknown/malformed slugs create nothing (404 / error, no writes)
- legacy `/lead` redirects to the configured default workspace

Verified this session (T056 — automatic qualification after public lead capture):

- a public submission succeeds and persists a `LeadQualification` plus a
  `QUALIFICATION_GENERATED` activity with `actorUserId = null`
- when AI fails the submission still succeeds, the lead is unchanged, and a
  `QUALIFICATION_FAILED` activity is recorded
- repeated automatic runs do not create duplicate successful qualifications
- qualification stays scoped to the resolved workspace; cross-tenant runs
  write nothing
- manual authenticated qualification still works; human review is unchanged
- HTTP 429 retries are bounded and respect `Retry-After`

Verified this session (T057 — automatic follow-up task for high-value leads):

- HIGH and URGENT qualifications each create exactly one automatic task in the
  same organization/lead as the qualification
- LOW and MEDIUM create none
- HIGH is due within 24 hours; URGENT is due sooner
- repeated qualification does not duplicate the automatic task or its marker
- cross-tenant task creation is impossible
- a task-creation failure leaves the qualification, lead, and activities intact
- manual create / complete / reopen continue to work; existing tests still pass

Note: the application is deployed to Vercel with a Neon production database and
Groq as the runtime AI provider. That state is user-reported; T080–T082 remain
unchecked in this file until a production smoke test is run and recorded.

The coding AI should continue with the first incomplete task that does not require user input.