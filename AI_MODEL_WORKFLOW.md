# WATTWISE — Multi-Model Execution Workflow & Handoff Protocol

> **Read This First Before Starting Any Task**  
> This project is built using a multi-model AI workflow (**Gemini 4 Argon**, **Orchestrator (Argon)**, **Gemini 4 Hydrogen**, **Claude Opus 5.5**, **Claude Sonnet 5.5**, and **Gemini 3.8 Flash**). To guarantee zero confusion, zero information loss, and 100% architectural consistency when switching models at any point, every model MUST adhere to the rules below.

---

## 1. Mandatory Rules for Every AI Model

1. **Always Ask Permission First:**
   * Before starting any task, creating any files, or modifying any code, **ask the user for explicit permission and wait for approval** (unless the user's prompt explicitly instructs you to execute a specific task right now).
2. **Never Deviate from `ARCHITECTURE.md`:**
   * All field names, collection schemas, enum values (`New | Acknowledged | Resolved`, `org_admin | facility_manager | department_manager | viewer`), API routes (`/api/v1/...`), and JSON response envelopes (`{ success, data, meta, error }`) are locked in `ARCHITECTURE.md`.
   * Do not invent alternative field names (e.g., use `consumptionKwh`, not `usage` or `value`; use `estimatedCost`, not `cost`).
3. **Always Read Context Files Before Writing Code:**
   * At the start of any task, read:
     1. `PROJECT_STATUS.md` (to see what is already completed and any notes left by the previous model)
     2. `IMPLEMENTATION_PLAN.md` (to read the exact specification for your assigned task ID)
     3. `ARCHITECTURE.md` (for schemas, interfaces, and API contracts)
4. **Verify Before Declaring a Task Done:**
   * Run TypeScript compiler validation (`npx tsc --noEmit`) in the modified workspace (`server/` or `client/`) and fix any type or lint issues before marking a task complete.
5. **Update `PROJECT_STATUS.md` After Every Completed Task:**
   * Mark the completed task ID as `[x] DONE`, record which AI model completed it, list the created/updated files, and note the next ready task(s).
6. **Maintain 100% Vercel Serverless Compatibility (Frontend & Backend):**
   * Both `client/` (Next.js 16) and `server/` (Express v5 API) will be deployed on **Vercel**.
   * **Backend (`server/`):**
     * Always rely on the `globalThis._wattwiseMongooseCache` connection helper in `server/src/config/db.ts` and the `/api/v1` pre-route connection middleware in `server/src/app.ts`.
     * Never start persistent OS-level background loops, cron daemons, or local disk writes; all features (including Real-Time Simulation ticks and Scheduled Report runs) must be stateless, request-driven, or memory-bounded.
     * Keep `export default app` in `server/src/index.ts` and `server/api/index.ts` intact, and guard `app.listen(...)` with `if (!process.env.VERCEL)`.
   * **Frontend (`client/`):**
     * Always read the backend URL from `process.env.NEXT_PUBLIC_API_URL` via `client/src/lib/api.ts`.
     * Ensure all client hooks (`useSearchParams`, `localStorage`, browser APIs) are properly wrapped in `'use client'` components and `<Suspense>` boundaries so `next build` on Vercel succeeds with zero prerender errors.

---

## 2. Standard Handoff Checklist (Model A -> Model B)

Whenever an AI model finishes an approved task (or batch of tasks):
1. Ensure all created/edited files compile cleanly with `npx tsc --noEmit`.
2. Update `PROJECT_STATUS.md`:
   * Change task status from `[ ] PENDING` or `[-] IN_PROGRESS` to `[x] DONE`.
   * Add a brief entry to the **Handoff Log** at the bottom of `PROJECT_STATUS.md`.
3. Report completion concisely to the user, mention which task is next in `IMPLEMENTATION_PLAN.md` (along with the recommended AI model for that task), and **ask for the user's permission before proceeding**.

---

## 3. Ready-to-Use Prompt Templates When Switching Models

You can copy and paste this prompt whenever you switch to a new AI model (e.g., Hydrogen, Opus 5.5, Sonnet 5.5, Flash 3.8, or Orchestrator):

```text
Please read @PROJECT_STATUS.md, @ARCHITECTURE.md, and @IMPLEMENTATION_PLAN.md.
Check which tasks are completed and review the specification for Task [INSERT TASK ID, e.g. T1.1].
Confirm your understanding and ask for my permission before executing Task [INSERT TASK ID] (or execute Task [INSERT TASK ID] now following all rules in @AI_MODEL_WORKFLOW.md).
```
