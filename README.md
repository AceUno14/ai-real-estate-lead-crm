# AI Real Estate Lead CRM

AI Real Estate Lead CRM is an AI-assisted lead management application designed for real estate agents and small real-estate teams.

The application captures property inquiries, organizes them inside a CRM, analyzes each lead with AI, assigns a lead score and priority, recommends the next sales action, and creates a draft response for human review.

## CORE WORKFLOW

Lead
→ CRM
→ AI qualification
→ lead score
→ priority
→ intent
→ recommended next action
→ draft follow-up
→ human review
→ lead status update

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

Implemented and verified through Phase 7 (dashboard insights): Next.js 16 + Prisma 7 foundation, credentials authentication, self-service workspace provisioning on sign-up, organization/tenant isolation, public lead capture, lead CRM (list/detail/status/notes/tasks), AI qualification with mock provider + human review, dashboard metrics and contact-first ranking, and a 64-test baseline.

The initial migration is applied and verified against the configured PostgreSQL/Neon database, and the seed has been run. Verification covers: migration state in sync, idempotent seed, authentication round trip, organization/tenant isolation and cross-tenant rejection, public lead persistence, lead list/detail rendering from persisted records, status/notes/follow-up-task/activity mutations, and mock AI qualification success, failure recovery, and human review.

Still open (see TASKS.md): production database (T080), Vercel deployment (T081), production smoke test (T082), and the deployment-dependent parts of the final README (T091).

### RUN LOCALLY

```bash
# 1. Configure environment (never commit secrets)
cp .env.example .env      # then set DATABASE_URL and AUTH_SECRET

# 2. Apply migrations and seed fictional demo data
npx prisma migrate dev
npm run db:seed

# 3. Start the app
npm run dev
```

The seed creates the fictional organization `demo-realty` and a demo owner (`owner@demo-realty.test`). The seed script prints the demo password on completion; all seeded people and inquiries are fictional. Sign in at `/sign-in`, or submit a public inquiry at `/lead`.

Accounts created at `/sign-up` automatically receive their own real-estate workspace with an OWNER membership, so a new user can reach the dashboard immediately without waiting for an invitation.

Useful checks:

```bash
npm run typecheck
npm run lint
npm test
```