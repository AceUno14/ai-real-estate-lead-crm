# AI Real Estate Lead CRM — AI_CONTEXT

## PROJECT GOAL

Build a portfolio-ready AI Real Estate Lead CRM that helps real estate agents and small teams capture, qualify, prioritize, and follow up with property leads.

Core workflow:

Lead → CRM → AI qualification → score + priority + intent → recommended next action → draft follow-up → human review → lead status update

The MVP should feel like a real tool an agent could use, not a generic AI demo.

## TARGET USERS

Primary users:
- Solo real estate agents
- Small real estate teams
- Property brokers
- Lead-generation agencies serving real estate clients

Secondary users:
- Property developers
- Rental/property management teams

## CORE MVP WORKFLOW

1. A lead submits a public inquiry form.
2. The lead is saved to the database.
3. The system creates an AI qualification request.
4. AI analyzes the lead using submitted lead data and approved business rules.
5. AI returns structured output:
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
6. AI output is validated before persistence.
7. The dashboard surfaces the most valuable leads first.
8. A human reviews the draft reply before anything is sent.
9. The agent updates the lead status and adds notes or follow-up tasks.

## MVP FEATURES

### Authentication and Workspace Isolation

- User authentication
- Organization/workspace
- Organization membership
- Workspace-scoped data access
- Protected dashboard routes
- No cross-workspace data leakage

### Lead Capture

Required fields:
- name
- email
- phone
- inquiry type
- preferred location
- message

Optional fields:
- budget range
- property type
- purchase/rent timeline
- financing or pre-approval status
- source

### CRM

- Lead list
- Lead detail
- Search
- Filters
- Sorting
- Status updates
- Agent notes
- Follow-up tasks
- Lead source tracking
- Activity history

### Lead Statuses

- NEW
- CONTACTED
- QUALIFIED
- NURTURING
- WON
- LOST

### AI Qualification

AI should return:
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

Priority values:
- LOW
- MEDIUM
- HIGH
- URGENT

Rules:
- Structured output only
- Validate AI output with Zod
- Never persist malformed AI output
- AI failure must not make the lead unusable
- AI results must belong to exactly one lead and organization
- Never allow AI to decide authorization

### Human Review

AI draft review states:
- GENERATED
- EDITED
- APPROVED
- REJECTED

The AI draft is a suggestion only.

The user must review or edit it before any future outbound messaging feature is allowed to use it.

### Dashboard

Show:
- Total leads
- New leads
- High-priority leads
- Urgent leads
- Average AI lead score
- Leads needing follow-up
- Leads by status
- Recent activity
- Top leads to contact first

The dashboard should immediately answer:

1. Who should I contact first?
2. Why is this lead important?
3. What should I do next?

## NON-GOALS FOR MVP

Do not add these unless a later task explicitly requests them:

- MLS integration
- Zillow scraping
- Realtor.com scraping
- Automatic SMS sending
- Automatic email sending
- Voice calling
- Calendar booking
- Complex drip campaigns
- Billing or subscriptions
- Multi-language support
- Advanced analytics
- Vector database
- RAG
- Autonomous agent loops
- Complex role permission systems
- Mobile application

## RECOMMENDED STACK

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

Prefer the simplest stable solution.

Do not introduce unnecessary dependencies.

## HIGH-LEVEL DATA MODEL

### User

Authenticated application user.

### Organization

Workspace that owns CRM data.

### Membership

Connects users to organizations.

MVP roles:
- OWNER
- MEMBER

### Lead

Core CRM record.

Suggested fields:
- id
- organizationId
- name
- email
- phone
- inquiryType
- propertyType
- preferredLocation
- budgetMin
- budgetMax
- timeline
- financingStatus
- message
- source
- status
- assignedToUserId
- createdAt
- updatedAt

### LeadQualification

Stores AI analysis.

Suggested fields:
- id
- organizationId
- leadId
- provider
- model
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
- reviewState
- errorMessage
- createdAt
- updatedAt

### LeadNote

Manual agent notes attached to a lead.

### FollowUpTask

Simple follow-up task associated with a lead.

### Activity

Audit-friendly history of meaningful lead changes.

## AI OUTPUT CONTRACT

The qualification result must contain:

score: integer from 0 to 100

priority:
- LOW
- MEDIUM
- HIGH
- URGENT

intent: string

summary: string

timeline: string

budgetReadiness: string

financingStatus: string

recommendedAction: string

draftReply: string

confidence: number from 0 to 1

## AI RULES

- Parse and validate every AI response with Zod.
- Never persist invalid structured output.
- Never trust model-generated IDs.
- Never trust model-generated organization IDs.
- Never trust model-generated user IDs.
- Never allow AI to make authorization decisions.
- Sensitive identifiers must be supplied by trusted server-side code.
- Store provider and model metadata.
- Keep prompts versioned in code.
- AI failures must be recoverable.
- The lead must remain usable if qualification fails.

## SECURITY RULES

- Every protected query must enforce organizationId on the server.
- Never trust organization IDs coming only from the browser.
- Never expose secrets to client components.
- Never log API keys.
- Never log raw .env values.
- Avoid logging full lead PII.
- Validate every mutation.
- Validate public form submissions.
- AI must never control authentication or authorization.
- Use fictional data for seeds and demos.
- Do not commit real secrets.
- Public lead endpoints should be designed for future rate limiting and spam protection.

## UX DIRECTION

Use a professional real-estate SaaS design.

Prefer:
- clean layout
- strong information hierarchy
- fast scanning
- useful dashboard cards
- clear status badges
- clear priority indicators
- polished lead tables
- mobile-friendly layouts
- accessible forms
- minimal animations
- neutral professional styling

Avoid:
- futuristic AI styling
- excessive gradients
- neon colors
- unnecessary animation
- generic chatbot-first interfaces

AI should feel like an assistant inside the CRM, not the entire product.

## CODING AI

### Primary Coding AI

DeepSeek V4 Flash

Use DeepSeek V4 Flash as the primary coding AI for this entire project.

Use it for:
- project setup
- Next.js implementation
- TypeScript
- UI
- forms
- CRUD
- Prisma
- database logic
- API routes
- Server Actions
- AI integration
- tests
- debugging
- documentation
- deployment preparation

### Fallback / Escalation AI

GLM 5.3 Flash

Use GLM only when:
- DeepSeek is stuck after one focused retry
- authentication has a difficult issue
- tenant isolation needs deeper reasoning
- a security-sensitive bug appears
- a bug spans multiple layers
- an independent review would materially help

Do not switch models routinely.

The goal is to keep one primary AI working on the project for consistency and efficient Freebuff usage.

## PRIVACY RULE FOR CODING AI

Never provide a coding model with:
- API keys
- passwords
- authentication secrets
- raw .env contents
- production customer information
- real lead PII
- private client documents
- proprietary secrets

Use fictional or sanitized data during development.

## CODING RULES

Before making changes:

1. Read AI_CONTEXT.md.
2. Read ARCHITECTURE.md.
3. Read DECISIONS.md.
4. Read the relevant section of TASKS.md.
5. Inspect relevant existing project files.

During implementation:

- Work on one bounded task at a time.
- Prefer the smallest correct implementation.
- Do not perform unrelated refactors.
- Do not add features outside the current task.
- Preserve tenant isolation.
- Validate external input.
- Keep TypeScript strict.
- Keep AI output schema-validated.
- Never hard-code secrets.
- Follow existing project conventions.
- Do not rewrite working code without a reason.

After completing a task:

- Run relevant checks.
- Update TASKS.md.
- Mark the task complete only if it actually works.
- Continue to the next clearly defined task when no user input or blocker is required.

## CONTINUOUS WORK RULE

The coding AI may continue through TASKS.md during the same session.

After completing a task, continue to the next task when:

- the current task is complete
- the next task is clearly defined
- no user decision is required
- no external credential is required
- there is no blocker

Do not stop after every small task just to ask whether to continue.

Stop when:
- user input is required
- credentials are required
- a destructive decision needs approval
- project requirements are unclear
- a blocker cannot be resolved safely

## CURRENT PROJECT PHASE

Phase 1 — Planning complete.

## NEXT ACTION

Start from the first incomplete task in TASKS.md.

Current expected next task:

T010 — Initialize the Next.js application.