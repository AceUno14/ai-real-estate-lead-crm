# AI Real Estate Lead CRM — DECISIONS

This file records important product and architecture decisions.

AI coding agents should not casually reverse these decisions.

## D-001 — Use a Modular Monolith

Status: Accepted

Decision:

Use one Next.js application for:

- frontend
- backend logic
- Server Actions
- API routes
- CRM workflows
- authentication
- AI orchestration

Reason:

This is faster to build, easier to deploy, and appropriate for the MVP.

Not chosen:

Microservices.

## D-002 — Use Next.js App Router

Status: Accepted

Decision:

Use Next.js App Router with TypeScript.

Reason:

It supports server rendering, route handlers, Server Actions, layouts, and deployment to Vercel.

## D-003 — Use PostgreSQL

Status: Accepted

Decision:

Use PostgreSQL as the primary database.

Reason:

The product contains strongly relational data:

- organizations
- memberships
- leads
- qualifications
- notes
- tasks
- activities

## D-004 — Use Prisma ORM

Status: Accepted

Decision:

Use Prisma as the ORM.

Reason:

Prisma provides:

- schema management
- migrations
- generated TypeScript types
- good PostgreSQL support
- simple development workflow

## D-005 — Workspace Isolation Is Mandatory

Status: Accepted

Decision:

All protected CRM data must be scoped to an organization/workspace.

Authorization must be enforced server-side.

Reason:

Cross-tenant data access would be a critical security defect.

Rule:

AI-generated values must never control organization ownership or authorization.

## D-006 — Organization Membership Model

Status: Accepted

Decision:

Use:

- User
- Organization
- Membership

MVP membership roles:

- OWNER
- MEMBER

Reason:

This gives the project proper multi-tenant architecture without building a complex permission system.

## D-007 — Human-in-the-Loop AI

Status: Accepted

Decision:

AI can:

- analyze leads
- score leads
- assign priority
- summarize intent
- recommend actions
- draft follow-up replies

AI does not automatically contact leads in the MVP.

Reason:

This is safer, easier to test, and appropriate for a portfolio-ready CRM.

## D-008 — Structured AI Output Only

Status: Accepted

Decision:

AI qualification must return structured data that passes Zod validation.

Reason:

Free-form text is too unreliable for application automation.

Invalid output must not be persisted as a valid qualification.

## D-009 — AI Provider Abstraction

Status: Accepted

Decision:

CRM logic must depend on an AI provider interface rather than one specific vendor.

Reason:

The runtime AI provider should be replaceable without rewriting CRM functionality.

## D-010 — Coding AI and Runtime AI Are Separate

Status: Accepted

Decision:

The AI used to write the application is separate from the AI provider used by the deployed application.

Coding AI:

DeepSeek V4 Flash

Runtime AI:

Configured separately through environment variables.

Reason:

Coding-assistant access and production inference are separate concerns.

## D-011 — Start with a Mock AI Provider

Status: Accepted

Decision:

Create a deterministic mock AI provider before requiring a real AI API.

Reason:

This allows development of:

- CRM workflow
- database persistence
- dashboard UI
- qualification screens
- human review
- testing
- deployment

without being blocked by AI billing or credentials.

## D-012 — MVP Lead Statuses

Status: Accepted

Decision:

Use:

- NEW
- CONTACTED
- QUALIFIED
- NURTURING
- WON
- LOST

Reason:

This represents a simple real-estate lead lifecycle without excessive complexity.

## D-013 — AI Priority Levels

Status: Accepted

Decision:

Use:

- LOW
- MEDIUM
- HIGH
- URGENT

Reason:

These are easy for agents to scan and understand.

## D-014 — AI Review States

Status: Accepted

Decision:

Use:

- GENERATED
- EDITED
- APPROVED
- REJECTED

Reason:

This provides clear human review tracking for AI-generated drafts.

## D-015 — No Automatic Messaging in MVP

Status: Accepted

Decision:

Do not automatically send:

- email
- SMS
- WhatsApp
- social messages

during the MVP.

Reason:

Keep scope controlled and prevent accidental outbound messages during development.

## D-016 — No RAG or Vector Database in MVP

Status: Accepted

Decision:

Do not add:

- embeddings
- vector database
- RAG

for the initial MVP.

Reason:

Lead qualification can be demonstrated using lead information and business rules.

RAG does not provide enough MVP value to justify the complexity yet.

## D-017 — No MLS or Property Portal Integration in MVP

Status: Accepted

Decision:

Do not integrate:

- MLS
- Zillow
- Realtor.com
- property portal scraping

during the MVP.

Reason:

These introduce API, legal, data quality, and integration complexity that is unnecessary for validating the core product.

## D-018 — Deployment Target

Status: Accepted

Decision:

Use:

- Vercel for Next.js
- Neon for PostgreSQL

Reason:

Fast setup and good compatibility with the selected stack.

## D-019 — Real Estate SaaS Design Direction

Status: Accepted

Decision:

The interface should look like a professional real-estate sales tool.

Prefer:

- clean layout
- professional colors
- high readability
- strong information hierarchy
- useful status indicators
- useful lead priority indicators

Avoid:

- neon AI styling
- excessive gradients
- futuristic interfaces
- excessive animation

Reason:

The product should look sellable to agents, brokerages, and real-estate teams.

## D-020 — Primary Coding AI

Status: Accepted

Decision:

Use DeepSeek V4 Flash as the primary coding AI for this project.

Use it for:

- project setup
- UI
- CRUD
- database work
- APIs
- AI integration
- debugging
- testing
- documentation

Reason:

DeepSeek V4 Flash is preferred for faster implementation and iteration.

## D-021 — GLM 5.3 Flash as Escalation AI

Status: Accepted

Decision:

Use GLM 5.3 Flash only when:

- DeepSeek cannot resolve an issue after one focused retry
- authentication requires deeper reasoning
- workspace isolation requires deeper review
- a difficult security issue appears
- a bug spans multiple layers
- an independent review is justified

Reason:

Avoid unnecessary model switching while keeping a stronger reasoning fallback available.

## D-022 — One Primary Coding AI Per Project

Status: Accepted

Decision:

Do not routinely switch models task-by-task.

Keep one primary coding AI across the project whenever practical.

Reason:

Benefits include:

- more consistent code
- more consistent naming
- less context rebuilding
- simpler development workflow
- more efficient Freebuff model-session usage

## D-023 — Coding AI Privacy Rule

Status: Accepted

Decision:

Never provide coding models with:

- API keys
- passwords
- authentication secrets
- raw .env values
- production lead information
- real customer PII
- private client documents
- proprietary secrets

Reason:

Development should use sanitized or fictional information.

## D-024 — Fictional Demo Data Only

Status: Accepted

Decision:

Seed and portfolio data must use fictional people, companies, contact information, and property inquiries.

Reason:

Protect privacy and make the project safe to publish publicly.

## D-025 — CRM Must Work Without AI

Status: Accepted

Decision:

AI availability must not determine whether the CRM itself works.

If the AI provider fails:

- the lead remains available
- CRM actions still work
- qualification can show a failure state
- qualification can be retried

Reason:

AI should enhance the product rather than create a single point of failure.

## D-026 — Self-Service Sign-Up Creates the First Workspace

Status: Accepted

Decision:

A successful public sign-up provisions the user's first workspace:

sign up
→ create User
→ create Organization
→ create Membership with role OWNER
→ authenticated user can enter the protected dashboard

Rules:

- workspace provisioning happens entirely server-side
- the organization name defaults to a value derived from the submitted
  account name when available (for example "Demo Owner" → "Demo Owner Realty")
- the slug is generated and made unique server-side; the client never
  supplies an organization name or slug
- the user who creates the workspace becomes OWNER
- provisioning runs in a single transaction so a failed, raced, or
  retried request cannot produce a partial or duplicate workspace
- `/no-organization` remains the fallback for users who genuinely have
  no membership

Reason:

Without automatic provisioning, a new account has no membership and
cannot use the CRM, which makes self-service registration a dead end.
Automatic provisioning keeps the existing multi-tenant model and
server-side authorization intact while letting a new agent start
immediately.

Not chosen:

- invite-only onboarding for the public sign-up route
- client-supplied organization names or slugs

## D-027 — Workspace-Specific Public Lead URLs

Status: Accepted

Decision:

Public lead capture is workspace-specific. Every organization has its own
public form URL:

```
/lead/[organizationSlug]
```

Flow:

```
GET /lead/[organizationSlug]
→ server validates the slug shape
→ server resolves the slug to an Organization
→ unknown/invalid slug returns 404
→ render the public form with the slug bound server-side
→ submission is resolved to a trusted organizationId server-side
→ create Lead
→ create LEAD_CREATED Activity
```

Rules:

- the route may carry an `organizationSlug`, but the `organizationId` is
  always resolved server-side; a `organizationId` supplied by the browser is
  ignored
- the slug is bound to the submit action server-side, so the client cannot
  swap in another workspace at submit time
- unknown or malformed slugs return not-found and create nothing
- tenant isolation and existing public lead validation are unchanged
- the legacy `/lead` route redirects to `/lead/<PUBLIC_LEAD_ORG_SLUG>`

`PUBLIC_LEAD_ORG_SLUG` is retained and now only selects the default workspace
used by the legacy `/lead` redirect. It is never used to route a submission
whose URL already names a workspace.

Reason:

The previous design used a single global `PUBLIC_LEAD_ORG_SLUG`, so every
submission went to one configured organization. This caused leads to be routed
to the wrong workspace (for example `demo-realty` instead of `esmael-realty`).
Workspace-specific URLs let several organizations each publish a public form
while keeping server-side tenant resolution and isolation intact.

Not chosen:

- accepting an organization ID from the browser
- a single global organization variable for all public submissions

## D-028 — Automatic AI Qualification After Public Lead Capture

Status: Accepted

Decision:

AI qualification runs automatically after a public lead is safely persisted.
The visitor is told their inquiry was received before any AI call happens.

```
public submission
→ validate workspace slug
→ validate lead input
→ persist Lead
→ persist LEAD_CREATED Activity
→ return success to the visitor
→ (post-response) automatic AI qualification
→ persist LeadQualification + QUALIFICATION_GENERATED activity
→ dashboard ranking reflects the result
```

Scheduling:

- automatic qualification is scheduled with Next.js `after()` from
  `next/server`, the supported post-response API, so the visitor never waits
  on the AI
- no external paid queue or background service is introduced for the MVP
- scheduling is best-effort; if it fails the submission still succeeds

Qualification layers:

- `qualifyLeadForOrganization({ organizationId, leadId, actorUserId })` is the
  trusted, session-free core service. `organizationId` must be a trusted
  server-resolved value; the lead is always loaded by `organizationId + leadId`
- the authenticated manual flow (`src/server/actions/qualification.ts`) is the
  manual wrapper: it resolves the session and active workspace, then calls the
  core with the signed-in user as `actorUserId`
- the automatic flow calls the same core with `actorUserId = null`, which the
  existing `Activity.actorUserId` (nullable) already supports

Failure behavior:

- AI failure, timeout, provider outage, malformed output, or HTTP 429 never
  fails or delays the public submission and never modifies or deletes the lead
- a `QUALIFICATION_FAILED` activity is recorded
- the manual "Run AI qualification" button remains available as the fallback

Idempotency:

- an automatic run skips when a qualification already exists for the lead, so
  a submission cannot produce duplicate successful qualifications
- intentional manual requalification is preserved

Rate limiting:

- HTTP 429 is treated as retryable with at most one bounded retry
- `Retry-After` is respected; a wait longer than 5 seconds (or exhausted
  retries) fails fast and records the failure
- retries are deliberately minimal so a free quota is never burned

Reason:

Agents should not have to click a button to get AI value for a new lead. Doing
it automatically after persistence keeps the visitor experience fast and keeps
AI as an enhancement rather than a dependency (D-025).

Not chosen:

- blocking the public submission on the AI call
- an external queue or paid background service for the MVP
- unbounded or aggressive retries against a rate-limited provider
- accepting a client-supplied `organizationId` for the automatic run

## D-029 — Automatic Follow-Up Task for High-Value Leads

Status: Accepted

Decision:

When AI qualification succeeds with HIGH or URGENT priority, the system creates
exactly one automatic follow-up task so the lead enters the task workflow
immediately.

```
public lead persisted
→ automatic AI qualification succeeds
→ priority is HIGH or URGENT
→ create one follow-up task (+ AUTO_FOLLOW_UP_CREATED activity)
→ task appears in /tasks and on the lead detail page
→ agent completes/reopens it normally
```

Rules:

- the rule runs only after a LeadQualification is persisted; it never runs
  before a successful qualification
- LOW and MEDIUM priority create no automatic task
- the rule uses only the server-trusted, Zod-validated qualification result;
  client-supplied priority or recommended action is never used
- the task uses the same trusted `organizationId` and `leadId` as the
  qualification
- system-created tasks use `actorUserId = null` in their activity

Due dates (server time):

- the rule uses server time consistently; no client timezone system is
  introduced for the MVP
- HIGH is due 24 hours after creation
- URGENT is due 2 hours after creation (clearly sooner than HIGH)

Title / description:

- HIGH: `Follow up with <lead name>`
- URGENT: `Urgent follow-up with <lead name>`
- description uses the AI `recommendedAction` when available, with a sensible
  priority-specific fallback otherwise

Idempotency:

- one automatic task per lead
- reuse the existing Activity ledger: an `AUTO_FOLLOW_UP_CREATED` activity is
  written together with the task and acts as the marker
- the marker check, the task write, and the marker write execute in a single
  SERIALIZABLE transaction, so PostgreSQL's serialization (SSI) aborts a
  concurrent duplicate instead of allowing two tasks; the aborted attempt is
  retried a very small, bounded number of times (3) and then observes the
  committed marker and creates nothing
- no in-memory lock is used, because Vercel/serverless runs multiple instances
- manual requalification does not create another automatic task

Failure isolation:

- task creation is best-effort; a failure never removes or corrupts the lead,
  the successful qualification, or existing activities
- manual task creation remains available

Reason:

High-value leads should not wait for an agent to remember to create a
follow-up. Reusing `FollowUpTask` and the existing `Activity` model keeps the
change small and avoids a migration.

Not chosen:

- creating tasks before qualification succeeds
- creating automatic tasks for LOW / MEDIUM leads
- a schema migration or new column just to flag automatic tasks
- a client-timezone scheduling system for the MVP