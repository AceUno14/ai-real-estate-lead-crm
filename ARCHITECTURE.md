# AI Real Estate Lead CRM — ARCHITECTURE

## ARCHITECTURE GOALS

The architecture should prioritize:

- fast MVP development
- strict organization/workspace isolation
- maintainable code
- clear separation between CRM and AI logic
- replaceable AI providers
- runtime validation
- simple deployment
- easy future expansion

Use a modular monolith.

Do not introduce microservices for the MVP.

## SYSTEM OVERVIEW

Public Lead Form
        ↓
Next.js Application
        ↓
Authentication + Organization Guard
        ↓
CRM Services
        ↓
Prisma ORM
        ↓
PostgreSQL

AI Qualification runs through:

Lead
        ↓
AI Qualification Service
        ↓
AI Provider Adapter
        ↓
Structured Output Validation
        ↓
LeadQualification Database Record

The AI system must never control authentication, authorization, organization membership, or record ownership.

## APPLICATION LAYERS

### Presentation Layer

Responsibilities:
- pages
- layouts
- forms
- dashboard
- lead tables
- lead detail UI
- loading states
- empty states
- error states
- accessibility

Suggested locations:

app/
components/

### Application / Service Layer

Responsibilities:
- business workflows
- lead creation
- lead updates
- qualification workflow
- notes
- follow-up tasks
- activity logging
- tenant-aware operations

Suggested location:

src/server/services/

### Server Actions / API Layer

Responsibilities:
- receive requests
- validate input
- resolve authentication
- resolve organization
- call services
- return safe responses

Suggested locations:

src/server/actions/
app/api/

### Domain Layer

Responsibilities:
- domain types
- enums
- Zod schemas
- business rules

Suggested location:

src/domain/

### Database Layer

Responsibilities:
- Prisma client
- database access
- organization-scoped queries
- migrations
- seeds

Suggested locations:

src/server/db/
prisma/

### AI Layer

Responsibilities:
- AI provider abstraction
- qualification prompt
- prompt version
- AI schemas
- structured validation
- provider selection
- error normalization

Suggested location:

src/server/ai/

## RECOMMENDED REPOSITORY STRUCTURE

ai-real-estate-lead-crm/

app/
  (marketing)/
    page.tsx

  (auth)/
    sign-in/
    sign-up/

  (dashboard)/
    layout.tsx
    dashboard/
    leads/
      page.tsx
      [leadId]/
    tasks/
    settings/

  api/
    public/
      leads/
    ai/
      qualify/

components/
  ui/
  dashboard/
  leads/
  forms/

src/
  domain/
    lead.ts
    qualification.ts

  server/
    auth/
    db/
    services/
    actions/
    ai/
      providers/
      prompts/
      schemas/
      qualify-lead.ts

  lib/

prisma/
  schema.prisma
  seed.ts

public/

AI_CONTEXT.md
ARCHITECTURE.md
DECISIONS.md
TASKS.md
README.md
.env.example

Exact folder names may change when framework or authentication conventions require it.

Keep the architectural responsibilities separated even if paths change.

## PUBLIC LEAD CAPTURE FLOW

Public lead capture is **workspace-specific** (D-027). Each organization has
its own public form URL:

/lead/[organizationSlug]

GET /lead/[organizationSlug]
→ server validates the slug shape
→ server resolves the slug to an Organization
→ unknown/invalid slug → 404 (no form, no submission path)
→ render the public lead form with the workspace slug bound server-side

POST (server action)
→ Server receives request with the server-bound slug
→ Validate form input with Zod
→ Resolve the slug to a trusted organizationId server-side
→ Create Lead
→ Create LEAD_CREATED Activity record
→ Return success response to the visitor
→ Schedule automatic AI qualification with Next.js `after()`
   (post-response; never blocks or fails the submission — D-028)

Automatic qualification calls the same trusted core as the manual button, with
`actorUserId = null`. AI success persists a `LeadQualification` plus a
`QUALIFICATION_GENERATED` activity; AI failure (including HTTP 429, timeout,
outage, or malformed output) records a `QUALIFICATION_FAILED` activity and
leaves the lead intact and manually requalifiable.

The browser must not be trusted to choose arbitrary organization IDs.

The route may carry an `organizationSlug`, but the `organizationId` is always
resolved server-side from that slug. Any `organizationId` supplied by the
browser is ignored.

Legacy `/lead`
→ redirects to `/lead/<PUBLIC_LEAD_ORG_SLUG>` (default workspace)

`PUBLIC_LEAD_ORG_SLUG` now only selects the default workspace for the legacy
redirect; it is never used to route a submission whose URL already names a
workspace.

## AUTHENTICATED DASHBOARD FLOW

User
→ Sign in
→ Server validates session
→ Resolve organization membership
→ Resolve active organization
→ Load workspace-scoped dashboard data
→ Render dashboard

## LEAD READ FLOW

Authenticated user
→ Resolve session
→ Resolve organization
→ Read lead using leadId + organizationId
→ Return lead if authorized

Never retrieve a protected lead only by leadId without verifying organization ownership.

## LEAD UPDATE FLOW

Authenticated user
→ Resolve session
→ Resolve organization
→ Validate input
→ Verify lead belongs to organization
→ Perform update
→ Create Activity record
→ Return safe result

## AI QUALIFICATION FLOW

Qualification is split into two layers (D-028) so the same workflow serves the
authenticated manual button and automatic public-lead qualification.

### Trusted core service (session-free)

`qualifyLeadForOrganization({ organizationId, leadId, actorUserId })`

Server-resolved inputs only
→ Load lead using organizationId + leadId
→ Build qualification input
→ Build approved prompt
→ Call configured AI provider
→ Receive response
→ Parse response
→ Validate with Zod
→ Persist LeadQualification (with provider/model metadata)
→ Create QUALIFICATION_GENERATED Activity with actorUserId
→ Return outcome

`organizationId` must always come from trusted server code (an authenticated
workspace, or a public workspace slug resolved server-side). `actorUserId` is
`null` for automatic/system runs.

### Authenticated manual wrapper

`src/server/actions/qualification.ts`

Authenticated user
→ Resolve session
→ Resolve active organization
→ Call the core with organizationId + leadId + actorUserId

### Automatic public qualification

Public lead persisted
→ Schedule the core with `actorUserId = null` via Next.js `after()`
→ Runs after the visitor's success response
→ Skips when a qualification already exists (idempotent)

If the AI fails:

→ Persist a QUALIFICATION_FAILED Activity
→ Keep Lead intact and unmodified
→ Leave the manual "Run AI qualification" button available
→ Never expose provider internals or secrets to the visitor
→ Do not break the CRM

## AI PROVIDER ABSTRACTION

The application must not be tightly coupled to one runtime AI vendor.

Use a provider interface concept similar to:

LeadQualificationProvider

Method:

qualify(input)

Input should include approved lead information only.

Output must conform to the qualification schema.

The provider implementation should return:

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

Provider selection should be configurable using environment variables.

Recommended development provider:

mock

Possible later provider:

OpenAI-compatible API

## MOCK AI PROVIDER

Build the mock provider before requiring paid AI access.

Purpose:

- develop the entire CRM without AI billing
- test UI
- test persistence
- test qualification workflow
- create predictable demo data
- test failure handling

The mock provider should produce deterministic valid output.

It should also support a controlled failure mode for tests.

## DATABASE DESIGN

Primary database:

PostgreSQL

ORM:

Prisma

Core models:

- User
- Organization
- Membership
- Lead
- LeadQualification
- LeadNote
- FollowUpTask
- Activity

## TENANT ISOLATION

Workspace-owned tables should include organizationId whenever practical.

Recommended:

Lead.organizationId

LeadQualification.organizationId

LeadNote.organizationId

FollowUpTask.organizationId

Activity.organizationId

Benefits:

- easier secure filtering
- simpler indexing
- easier debugging
- easier audit review

Every protected database operation must use the authenticated user's organization context.

Never trust a client-provided organization ID by itself.

## AUTHORIZATION PRINCIPLE

Authentication answers:

Who is the user?

Membership answers:

Which organizations can they access?

Authorization answers:

Can this user perform this action in this organization?

AI answers none of those questions.

## VALIDATION BOUNDARIES

Use Zod for:

- public form input
- authenticated mutations
- search/filter parameters where needed
- AI structured output
- future webhook payloads
- future external integrations

Database types alone are not enough.

Runtime input must be validated.

## ERROR HANDLING

Expected error categories:

- validation error
- unauthenticated
- unauthorized
- not found
- conflict
- rate limited
- database error
- AI provider error
- AI timeout
- malformed AI response

User-facing errors should be useful but must not expose:

- stack traces
- database credentials
- SQL
- API keys
- auth secrets
- provider secrets

## ACTIVITY LOGGING

Meaningful changes should create Activity records.

Examples:

- lead created
- status changed
- note added
- follow-up created
- follow-up completed
- qualification generated
- qualification failed
- qualification retried
- AI draft edited
- AI draft approved
- AI draft rejected

Activity should be organization scoped.

## DASHBOARD DATA

Dashboard should efficiently retrieve:

- number of new leads
- high-priority leads
- urgent leads
- average qualification score
- follow-ups due
- leads by status
- recent activity
- top leads to contact

Avoid unnecessary client-side fetching when server rendering is sufficient.

## DATABASE INDEXING

Potential indexes:

organizationId + createdAt

organizationId + status

organizationId + assignedToUserId

organizationId + dueDate

leadId + createdAt

Indexes should be added based on actual query patterns.

Do not prematurely optimize.

## PAGINATION

Lead list should be designed so pagination can be introduced cleanly.

Avoid loading unlimited lead records.

For MVP demo data, simple pagination or a sensible limit is sufficient.

## DEPLOYMENT ARCHITECTURE

Frontend and server:

Vercel

Database:

Neon PostgreSQL

Runtime AI:

Configurable provider through environment variables

Potential future integrations:

- Resend
- Twilio
- Google Calendar
- external CRM APIs
- property listing APIs

These are not required for the MVP.

## SECURITY PRIORITIES

Before production/demo handoff verify:

- no secrets committed
- no cross-organization reads
- no cross-organization writes
- public input validated
- authenticated mutations validated
- AI responses validated
- no AI-generated authorization decisions
- no sensitive information in logs
- fictional demo data
- safe error responses
- protected routes protected
- public lead endpoint prepared for anti-abuse controls

## PERFORMANCE PRIORITIES

Focus on:

- fast lead list
- fast lead detail
- indexed organization queries
- avoiding N+1 database queries
- minimal unnecessary client JavaScript
- server-rendered data where appropriate

Do not optimize prematurely.

## TESTING STRATEGY

Minimum coverage:

- qualification schema validation
- public lead form validation
- organization isolation
- lead status update
- AI malformed response
- AI provider failure
- protected route behavior
- happy-path lead workflow

Later:

- browser smoke tests
- deployment smoke tests
- additional integration tests
- accessibility testing

## ARCHITECTURE PRINCIPLE

The CRM should continue functioning even when AI is unavailable.

CRM functionality is primary.

AI qualification is an enhancement.

This principle should influence all implementation decisions.