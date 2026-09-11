# AI Real Estate Lead CRM

AI Real Estate Lead CRM is an AI-assisted lead management application designed for real estate agents and small real-estate teams.

The application captures property inquiries, organizes them inside a CRM, analyzes each lead with AI, assigns a lead score and priority, recommends the next sales action, and creates a draft response for human review.

## CORE WORKFLOW

Workspace-specific public lead
→ persistence
→ successful visitor response
→ automatic AI qualification
→ lead score / priority / intent / recommended next action / draft reply
→ HIGH / URGENT lead → automatic follow-up task
→ HIGH / URGENT lead → agent email notification (Resend)
→ human review and action
→ dashboard ranking and task workflow
→ lead status update

AI qualification also remains available manually from the lead detail page,
which is the fallback whenever the provider is unavailable or rate limited.
High-value leads (HIGH / URGENT) automatically receive one follow-up task so
they appear in the task workflow without the agent remembering to create one,
and the responsible agent is emailed so the lead is not missed.

## BUSINESS PROBLEM

Real estate agents often receive leads from:

- websites
- advertisements
- social media
- referrals
- property portals
- manual inquiries

Not every lead has the same value.

Agents may spend too much time manually reviewing inquiries and deciding:

- Who should I contact first?
- Which lead is ready to buy?
- Which lead has financing?
- Which lead has an urgent timeline?
- Which lead should be nurtured?
- What should I say when I respond?

## SOLUTION

AI Real Estate Lead CRM helps agents organize and prioritize incoming leads.

AI analyzes each lead and produces structured sales intelligence such as:

- lead score
- priority
- buying intent
- summary
- purchase timeline
- budget readiness
- financing status
- recommended next action
- suggested reply
- confidence

The agent remains in control.

AI-generated responses are reviewed by a human before they can be used.

## TARGET USERS

Primary:

- solo real estate agents
- small real-estate teams
- brokers
- real-estate lead-generation agencies

Secondary:

- property developers
- rental teams
- property management companies

## MVP FEATURES

### Authentication

- user authentication
- protected dashboard
- secure session handling

### Workspace Isolation

- organizations
- memberships
- OWNER role
- MEMBER role
- self-service sign-up provisions the first workspace with OWNER membership
- workspace-scoped CRM data
- server-side authorization

### Public Lead Capture

Public lead capture is workspace-specific: each organization has its own public
form URL.

```
/lead/[organizationSlug]      e.g. /lead/demo-realty
```

The workspace is resolved from the slug entirely server-side, and unknown slugs
return a 404. The legacy `/lead` route redirects to the configured default
workspace (`PUBLIC_LEAD_ORG_SLUG`). See DECISIONS.md D-027.

Collect:

- name
- email
- phone
- inquiry type
- property type
- preferred location
- budget
- timeline
- financing status
- message
- source

### Lead CRM

- lead list
- lead detail
- search
- filters
- sorting
- status management
- notes
- follow-up tasks
- activity history

### Lead Statuses

- NEW
- CONTACTED
- QUALIFIED
- NURTURING
- WON
- LOST

### AI Qualification

Qualification runs automatically after a public lead is safely persisted, using
Next.js `after()` so the visitor is never kept waiting on the AI. The manual
"Run AI qualification" button stays available and is the fallback when the
provider fails or is rate limited.

AI returns:

- score from 0 to 100
- priority
- intent
- summary
- timeline
- budget readiness
- financing status
- recommended action
- draft reply
- confidence

Priority levels:

- LOW
- MEDIUM
- HIGH
- URGENT

Failure handling: AI failure, timeout, provider outage, malformed output, or
HTTP 429 never fails the lead submission and never modifies the lead. A failed
qualification is recorded in the activity timeline, and the lead detail page
shows whether qualification is pending or has failed with retry available.
HTTP 429 retries are bounded (at most one retry, `Retry-After` respected) so a
free provider quota is never burned.

### Automatic Follow-Up Tasks

When qualification succeeds with HIGH or URGENT priority, exactly one follow-up
task is created automatically and appears in `/tasks` and on the lead detail
page, ready for the agent to complete or reopen.

- HIGH: due in 24 hours, titled `Follow up with <lead name>`
- URGENT: due in 2 hours, titled `Urgent follow-up with <lead name>`
- the description uses the AI recommended action
- LOW / MEDIUM create no automatic task
- server time is used consistently; no client timezone system
- one automatic task per lead (repeated qualification cannot duplicate it)
- a task-creation failure never removes the qualification or the lead, and
  manual task creation stays available

### Hot-Lead Email Notifications

When a HIGH or URGENT qualification succeeds, the responsible CRM user is
emailed through Resend.

- recipient rule (server-side only): the assigned user when they belong to the
  lead's organization, otherwise the organization's OWNER member(s)
- recipients are never taken from a global env var or from the client
- one notification per qualification (Activity ledger + Resend idempotency key)
- email is best-effort: a failure never affects the lead, qualification,
  follow-up task, or submission, and is recorded in the activity timeline
- configured with `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; when unset, no email
  is sent and the CRM keeps working

### Human Review

Draft review states:

- GENERATED
- EDITED
- APPROVED
- REJECTED

### Dashboard

Dashboard should show:

- total leads
- new leads
- high-priority leads
- urgent leads
- average AI score
- follow-ups due
- leads by status
- recent activity
- leads that should be contacted first

## TECHNOLOGY STACK

Planned stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod
- Next.js-compatible authentication
- Server Actions and/or Route Handlers
- AI provider abstraction
- Neon PostgreSQL
- Vercel

## ARCHITECTURE

The project uses a modular monolith architecture.

Main layers:

- presentation
- server actions/API
- application services
- domain schemas
- database
- authentication
- AI qualification

The CRM is the primary system.

AI is an enhancement.

If the AI provider becomes unavailable, CRM functionality should continue working.

## MULTI-TENANT SECURITY

Every organization owns its own CRM data.

Protected records are scoped using organizationId.

Examples:

- Lead
- LeadQualification
- LeadNote
- FollowUpTask
- Activity

Authorization is enforced server-side.

The application must never trust a browser-provided organization ID by itself.

Public lead capture is addressed by workspace slug, never by organization ID:
the slug in `/lead/[organizationSlug]` is resolved to a trusted `organizationId`
server-side, and any client-supplied `organizationId` is ignored.

AI must never make authentication or authorization decisions.

## AI DESIGN

The application uses an AI provider abstraction.

This allows the runtime AI provider to change without rewriting CRM business logic.

Development begins with a deterministic mock AI provider.

Benefits:

- no AI API cost during early development
- predictable testing
- easy UI development
- reliable demo data
- easy AI failure testing

Later, an OpenAI-compatible provider can be added.

## CODING AI

Primary coding AI:

DeepSeek V4 Flash

Fallback / escalation AI:

GLM 5.3 Flash

DeepSeek V4 Flash is used for most implementation work.

GLM 5.3 Flash should only be used when deeper reasoning is necessary, such as:

- difficult authentication problems
- tenant-isolation issues
- security-sensitive bugs
- difficult multi-layer debugging
- independent architecture review

Do not switch models unnecessarily.

## CODING AI PRIVACY

Never send a coding model:

- API keys
- passwords
- authentication secrets
- raw .env values
- production customer information
- real lead PII
- private client documents
- proprietary secrets

Use sanitized or fictional development data.

## DEVELOPMENT DOCUMENTATION

Important files:

AI_CONTEXT.md

Defines:
- project scope
- features
- AI rules
- security rules
- development rules

ARCHITECTURE.md

Defines:
- application structure
- layers
- request flows
- tenancy
- AI architecture

DECISIONS.md

Records:
- architecture decisions
- product decisions
- development decisions

TASKS.md

Defines:
- ordered implementation plan
- project phases
- current next task

.env.example

Documents:
- required environment variables
- database configuration
- authentication configuration
- AI provider configuration

SESSION_REPORT.md

Records:
- verification results for the current session
- defects found and fixed
- task status reconciliation
- blockers and next actions

## DEVELOPMENT PRINCIPLES

- one bounded task at a time
- use the smallest correct implementation
- server-side workspace isolation
- strict validation
- structured AI output
- human review before messaging
- minimal dependencies
- no premature integrations
- no secrets committed
- fictional demo data only
- avoid unrelated refactors

## NON-GOALS FOR MVP

The initial MVP will not include:

- MLS integration
- Zillow scraping
- Realtor.com scraping
- automatic SMS
- automatic email
- voice calling
- calendar booking
- billing
- advanced automation
- RAG
- vector database
- autonomous agents
- complex analytics

These can be considered after the core CRM is complete.

## DEPLOYMENT TARGET

Application:

Vercel

Database:

Neon PostgreSQL

Runtime AI:

Configurable provider

## CURRENT STATUS

Implemented and verified through Phase 7 (dashboard insights) plus automatic AI
qualification on public lead capture: Next.js 16 + Prisma 7 foundation,
credentials authentication, self-service workspace provisioning on sign-up,
organization/tenant isolation, workspace-specific public lead capture
(`/lead/[organizationSlug]`) with automatic post-response AI qualification and
automatic follow-up tasks and Resend email notifications for HIGH/URGENT
leads, lead CRM (list/detail/status/notes/tasks), AI qualification with mock
provider + human review, dashboard metrics and contact-first ranking, and a
116-test baseline.

The initial migration is applied and verified against the configured PostgreSQL/Neon database, and the seed has been run. Verification covers: migration state in sync, idempotent seed, authentication round trip, organization/tenant isolation and cross-tenant rejection, public lead persistence, lead list/detail rendering from persisted records, status/notes/follow-up-task/activity mutations, and mock AI qualification success, failure recovery, and human review.

Still open (see TASKS.md): production database (T080), Vercel deployment (T081), production smoke test (T082), and the deployment-dependent parts of the final README (T091).

### RUN LOCALLY

```bash
# 1. Configure environment (never commit secrets)
cp .env.example .env      # set DATABASE_URL and AUTH_SECRET (and optionally RESEND_API_KEY / RESEND_FROM_EMAIL)

# 2. Apply migrations and seed fictional demo data
npx prisma migrate dev
npm run db:seed

# 3. Start the app
npm run dev
```

The seed creates the fictional organization `demo-realty` and a demo owner (`owner@demo-realty.test`). The seed script prints the demo password on completion; all seeded people and inquiries are fictional. Sign in at `/sign-in`, or submit a public inquiry at `/lead/demo-realty` (the legacy `/lead` route redirects there).

Accounts created at `/sign-up` automatically receive their own real-estate workspace with an OWNER membership, so a new user can reach the dashboard immediately without waiting for an invitation.

Useful checks:

```bash
npm run typecheck
npm run lint
npm test
```