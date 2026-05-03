---
name: react-interview-challenge-authoring
description: Use when creating or expanding interview challenges for learning paths in this repo, especially React/UI challenges that need realistic scenarios, strong interviewer-grade deliverables, and dense SVG mock targets with real data rather than placeholder boxes.
---

# React Interview Challenge Authoring

Create interview challenges that feel like real take-homes or onsite prompts, not toy exercises.

Use this skill when you need to:
- add a new challenge to an existing challenge bank
- expand a challenge section with more sub-items
- upgrade a weak challenge into an interviewer-grade one
- create a realistic SVG mock for a challenge
- add form validation, derived state, async edge cases, or debugging depth to a challenge

## Target Files In This Repo

For React Deep Dive challenges, the main files are:
- `src/modules/react-deep-dive/interview-challenges-data.ts`
- `src/components/hub/learn/react/ReactInterviewOverviewPage.tsx`
- `src/components/hub/learn/react/ReactInterviewChallengePage.tsx`
- `src/components/hub/learn/react/ReactInterviewSidebar.tsx`
- `public/react-challenges/*.svg`
- `src/modules/react-deep-dive/manifest.ts`
- `src/lib/mock-data.ts`

Read the existing challenge data first and follow the same structure unless there is a strong reason to evolve it.

## Quality Bar

Every challenge should sound like it came from a strong senior frontend interviewer.

The scenario should:
- describe a believable product surface
- include business constraints, not just UI tasks
- force tradeoffs in state modeling or async behavior
- expose common failure modes a candidate might hit

Good challenge themes:
- complex forms with conditional fields
- reactive pricing or totals
- line-item editors with draft-safe inputs
- tables with selection, bulk actions, and partial failures
- list/search/filter screens with URL sync and stale request bugs
- permission or settings matrices with derived and indeterminate state
- dashboards with rerender storms or expensive updates
- accessibility-sensitive UI like drawers, comboboxes, kanban boards, or scheduling tools

Avoid:
- pure CRUD with no real complexity
- challenges that can be solved by “just use a form library”
- empty design prompts with no state or validation nuance
- mocks that are only rectangles and labels

## Challenge Shape

Each challenge entry should include:
- `id`
- `moduleId`
- `title`
- `difficulty`
- `estimatedMinutes`
- `summary`
- `scenario`
- `targetImage`
- `deliverables`
- `commonPitfalls`
- `strongSignals`
- optional `starterBlocks`
- `tags`

Standards for each field:

### `title`
- make it specific and realistic
- name the real UI/problem, not the abstraction
- good: `Invoice Builder With Line Items`
- weak: `State Management Exercise`

### `summary`
- one sentence
- tell the candidate what makes it hard

### `scenario`
- 2-4 sentences
- include realistic business rules and product twists
- mention why users care, not just what the UI contains

### `deliverables`
- ask for architecture reasoning, not only implementation
- include stored-vs-derived state expectations when relevant
- include validation/error modeling when relevant
- include async/race-condition reasoning when relevant
- include accessibility expectations when the UI needs it

### `commonPitfalls`
- capture real shallow answers or fragile implementations
- prefer failure patterns senior interviewers actually see

### `strongSignals`
- describe what a strong candidate sounds like
- reward precise mental models, not buzzwords

### `starterBlocks`
- include only when a small type shape helps frame the problem
- keep it short and bias toward the true source-of-truth model

## Interviewer Standards

Strong challenges usually test at least 2 of these at once:
- source-of-truth vs derived state
- field-level vs form-level validation
- warnings vs blocking errors
- urgent vs deferred updates
- local draft state vs server truth
- optimistic updates vs reconciliation
- async validation vs stale responses
- accessibility invariants
- partial failure handling
- debugging and profiling judgment

When relevant, make the prompt force candidates to explain:
- what is stored in state
- what is derived at render time
- what needs cancellation or invalidation
- what should be optimistic
- what blocks submit and what only warns
- how the UI preserves user intent during refetches or transitions

## SVG Mock Standards

The mock must look like a real product screen.

Required properties:
- realistic names, values, labels, timestamps, badges, statuses, and helper text
- secondary metadata, not just primary headings
- error states where the challenge depends on validation
- summary panels where the challenge depends on derived state
- visible clues for async or draft state when relevant
- believable spacing and information hierarchy

Do not create mocks that are only:
- empty boxes
- generic cards with no data
- unlabeled panels
- purely decorative diagrams

Prefer these patterns:
- tables: rows, statuses, unsaved draft indicators, pagination, bulk selection clues
- forms: inline errors, helper text, pending validation, derived summaries, blocking notes
- dashboards: KPI values, legends, feed items, timestamps, performance clues
- permissions/settings: group labels, child rows, summaries, warnings, indeterminate states

## SVG Rules

SVGs must be valid standalone XML.

Be careful with:
- escape `&` as `&amp;`
- use valid entities only
- close all tags
- keep text readable at lesson width

Put challenge mocks in:
- `public/react-challenges/<challenge-id>.svg`

Reference them from `targetImage.src` as:
- `/react-challenges/<challenge-id>.svg`

## Workflow

1. Inspect the existing challenge bank and choose a gap to fill.
2. Pick a realistic product surface and define the interview twist.
3. Write the challenge entry in `interview-challenges-data.ts`.
4. Create a realistic SVG mock with real content density.
5. If the challenge bank duration meaningfully changes, update:
   - `src/modules/react-deep-dive/manifest.ts`
   - `src/lib/mock-data.ts`
6. Verify the challenge appears correctly in the overview and detail pages.
7. Run:
   - `./node_modules/.bin/tsc --noEmit --pretty false`

## Good Prompting Pattern

When asked to add a challenge, think like this:

- What real product would make this skill matter?
- What state transitions are easy to get wrong?
- What derived values must stay correct?
- Where would async work become stale?
- What error states should be visible to the user?
- What would a strong interviewer expect a senior candidate to talk about?

## Repo-Specific Notes

- The React challenge bank already supports challenge sub-items under one top-level lesson.
- The overview page and sidebar render from `REACT_DEEP_DIVE_INTERVIEW_CHALLENGES`, so new entries should appear automatically when the data shape is correct.
- If a mock does not render, inspect the SVG first before touching React code.
- If only one SVG breaks, suspect malformed XML or an unescaped character.

## Definition Of Done

A challenge is done when:
- it reads like a real interview prompt
- it tests meaningful state or UI judgment
- it has concrete deliverables, pitfalls, and strong-answer signals
- the SVG mock looks like a real product screen with data
- the detail page renders correctly
- `tsc` passes

## Reuse Pattern

For future challenge banks outside React, reuse this structure:
- realistic scenario
- real UI surface
- explicit deliverables
- pitfalls and strong signals
- dense mock with believable data

Only adapt the domain and file paths.
