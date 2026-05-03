export type ReactDeepDiveChallengeDifficulty = "easy" | "medium" | "hard";

export interface ReactDeepDiveChallengeCodeBlock {
  label: string;
  code: string;
}

export interface ReactDeepDiveChallengeTargetImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface ReactDeepDiveChallenge {
  id: string;
  moduleId: "interview-challenges";
  title: string;
  difficulty: ReactDeepDiveChallengeDifficulty;
  estimatedMinutes: number;
  summary: string;
  scenario: string;
  targetImage?: ReactDeepDiveChallengeTargetImage;
  deliverables: string[];
  commonPitfalls: string[];
  strongSignals: string[];
  starterBlocks?: ReactDeepDiveChallengeCodeBlock[];
  tags: string[];
}

export interface ReactDeepDiveChallengeModule {
  id: "interview-challenges";
  title: string;
  description: string;
  estimatedMinutes: number;
  challenges: ReactDeepDiveChallenge[];
}

export const REACT_DEEP_DIVE_INTERVIEW_CHALLENGES: ReactDeepDiveChallenge[] = [
  {
    id: "editable-table-bulk-actions",
    moduleId: "interview-challenges",
    title: "Editable Table With Bulk Actions",
    difficulty: "medium",
    estimatedMinutes: 40,
    summary:
      "Design an admin table with inline editing, selection, bulk actions, and server-backed pagination without losing state consistency.",
    scenario:
      "You are building an admin users table with sorting, filtering, row selection, inline role editing, and a bulk deactivate action. Product adds two twists: unsaved inline edits must survive pagination changes, and 'select all' should apply to the filtered dataset rather than just the visible page.",
    targetImage: {
      src: "/react-challenges/editable-table-bulk-actions.svg",
      alt: "Admin users table mock with filters, row selection, inline role editing, and bulk action toolbar.",
      caption:
        "Read this as a real admin product screen: table shell, filter controls, selection state, inline editable cells, and bulk actions that depend on stable row identity.",
    },
    deliverables: [
      "Explain the source-of-truth state model for rows, filters, drafts, selection, and pending operations.",
      "Separate stored state from derived projections like visible rows, selected counts, and all-selected indicators.",
      "Describe how optimistic edits and bulk mutations should reconcile with refetches and partial failures.",
      "Defend whether useState remains enough or whether a reducer makes the transitions easier to reason about.",
    ],
    commonPitfalls: [
      "Tracking selection by array index instead of stable row ids.",
      "Keeping filtered rows or sorted rows in state and then fighting synchronization bugs.",
      "Mutating nested row data directly, which makes rollback and diffing fragile.",
    ],
    strongSignals: [
      "Uses stable row identity everywhere and derives projections during render.",
      "Models drafts separately from fetched data so refetches do not erase local intent.",
      "Talks about partial failure handling for bulk actions instead of assuming an all-or-nothing happy path.",
    ],
    starterBlocks: [
      {
        label: "Starter data model",
        code: `type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  active: boolean;
};

type TableQuery = {
  search: string;
  sortBy: "name" | "email" | "role";
  sortDirection: "asc" | "desc";
  page: number;
};
`,
      },
    ],
    tags: ["tables", "state", "reducers", "optimistic-ui"],
  },
  {
    id: "complex-form-wizard",
    moduleId: "interview-challenges",
    title: "Complex Form Wizard",
    difficulty: "hard",
    estimatedMinutes: 45,
    summary:
      "Model a multi-step React form with conditional fields, async validation, and submission states without boolean soup.",
    scenario:
      "Build a multi-step onboarding or checkout wizard with conditional fields, async validation, a review step, and final submission. One step depends on a previous answer, some inputs validate against the server, and users need clear feedback for validating, saving, and submitting states.",
    targetImage: {
      src: "/react-challenges/complex-form-wizard.svg",
      alt: "Multi-step onboarding form mock with progress indicator, grouped inputs, and a summary sidebar.",
      caption:
        "This is both a UI challenge and a state-modeling challenge: multiple steps, grouped fields, progressive validation, and a supporting summary area.",
    },
    deliverables: [
      "Choose a state shape that makes impossible combinations hard to represent.",
      "Separate field-level validation, step-level gating, autosave state, and final submission errors.",
      "Explain when controlled fields are required and when uncontrolled fields are still a reasonable simplification.",
      "Describe how you would structure the UI so nested components can respond to form state without prop drilling chaos.",
    ],
    commonPitfalls: [
      "One giant form object plus many booleans like isDirty, isValid, isSaving, and isSubmitted with no real state machine.",
      "Using effects for validation that belongs in handlers or explicit async actions.",
      "Treating all form state as global context when most of it only matters inside the wizard.",
    ],
    strongSignals: [
      "Frames the problem as a state machine, not just a bag of inputs.",
      "Separates validation concerns from submission concerns.",
      "Explains user-facing pending states precisely instead of collapsing everything into 'loading'.",
    ],
    starterBlocks: [
      {
        label: "Starter shape",
        code: `type StepId = "account" | "profile" | "preferences" | "review";

type WizardDraft = {
  email: string;
  password: string;
  fullName: string;
  company?: string;
  wantsTeamPlan: boolean;
};`,
      },
    ],
    tags: ["forms", "validation", "state-machine", "react-19"],
  },
  {
    id: "search-filters-lists",
    moduleId: "interview-challenges",
    title: "Search + Filters + Lists",
    difficulty: "medium",
    estimatedMinutes: 35,
    summary:
      "Handle debounced search, faceted filters, URL sync, stale requests, and rendering responsiveness in one realistic list screen.",
    scenario:
      "Implement a searchable marketplace or people directory with text search, category filters, sort order, result counts, empty states, and query-string synchronization. The bug version of the prompt is common too: old requests overwrite fresh ones, typing feels laggy, and filter changes create refetch loops.",
    targetImage: {
      src: "/react-challenges/search-filters-lists.svg",
      alt: "Marketplace search UI mock with left filter sidebar, search input, results header, and responsive result cards.",
      caption:
        "Treat this as a mixed async-and-rendering problem: faceted filters, debounced search, result counts, and a list that must stay responsive while data and UI state change together.",
    },
    deliverables: [
      "Separate local UI state, server state, and derived list state.",
      "Explain how you would debounce input, cancel stale requests, and keep the URL in sync without one mega-effect.",
      "Call out where useTransition or useDeferredValue helps and where the real issue is rendering cost rather than fetch timing.",
      "Describe how you would test race conditions and stale-closure bugs.",
    ],
    commonPitfalls: [
      "One effect that debounces, fetches, parses, updates URL state, and resets pagination all at once.",
      "Using transitions as a cover for wasteful rendering instead of reducing work.",
      "Treating all lag as networking when the result list itself is the expensive part.",
    ],
    strongSignals: [
      "Uses cancellation and clear ownership boundaries for async work.",
      "Keeps input responsiveness urgent while deferring only the expensive work.",
      "Mentions virtualization or list-windowing when result sets become large.",
    ],
    tags: ["effects", "lists", "debounce", "performance"],
  },
  {
    id: "rendering-bug-hunt",
    moduleId: "interview-challenges",
    title: "Rendering Bug Hunt",
    difficulty: "hard",
    estimatedMinutes: 35,
    summary:
      "Diagnose re-render storms and lag in a React dashboard using evidence instead of ritual memoization.",
    scenario:
      "You inherit a dashboard where typing into one widget re-renders unrelated panels, websocket notifications cause frame drops, and the team has already wrapped half the codebase in useMemo and useCallback. You need to identify the actual bottleneck and propose the smallest architectural fix that matters.",
    targetImage: {
      src: "/react-challenges/rendering-bug-hunt.svg",
      alt: "Analytics dashboard mock with filters, KPI cards, live feed, charts, and supporting panels.",
      caption:
        "The visual target matters because performance bugs often come from screen shape: many panels, shared dependencies, frequent updates, and expensive chart or list regions.",
    },
    deliverables: [
      "Walk through how you would use the React DevTools Profiler to identify the hot path.",
      "Differentiate prop churn, context churn, expensive rendering, and too many mounted nodes.",
      "Choose the highest-leverage fixes first: state colocation, split contexts, virtualization, memoization, or server-side work reduction.",
      "Explain how you would keep the codebase from over-optimizing after the immediate bug is fixed.",
    ],
    commonPitfalls: [
      "Adding memoization before proving where the wasted work comes from.",
      "Moving everything to a global store because the current state placement is messy.",
      "Talking about performance only as a hooks problem instead of an ownership and rendering-cost problem.",
    ],
    strongSignals: [
      "Treats profiling as the first step, not the last.",
      "Knows that context and list size can dominate even when hooks are 'optimized'.",
      "Pairs each suggested fix with the specific waste it removes.",
    ],
    tags: ["debugging", "profiler", "context", "performance"],
  },
  {
    id: "component-api-design",
    moduleId: "interview-challenges",
    title: "Component API Design",
    difficulty: "medium",
    estimatedMinutes: 30,
    summary:
      "Design a reusable React component API for a complex UI primitive without creating a prop explosion.",
    scenario:
      "You are asked to design a reusable combobox, drawer, modal, or dashboard card system that will support several layouts and variants later. The challenge is less about rendering boxes and more about designing an API that is accessible, composable, and realistically maintainable.",
    targetImage: {
      src: "/react-challenges/component-api-design.svg",
      alt: "Reusable component system mock showing cards, a drawer, a combobox, and composable supporting UI elements.",
      caption:
        "Use the mock to reason about API surface, not just visuals: what should be slots, what should be controlled, and what invariants the component should own.",
    },
    deliverables: [
      "Choose between compound components, slots, controlled props, and local state, and explain why.",
      "Define the minimum API surface that still supports future product variants.",
      "Call out accessibility requirements like focus management, keyboard support, and ARIA semantics.",
      "Explain what invariants the component should guarantee and what responsibilities remain with consuming app code.",
    ],
    commonPitfalls: [
      "Building a giant prop API to cover every imagined use case.",
      "Ignoring keyboard and focus behavior while optimizing only for visual flexibility.",
      "Using context for simple composition when explicit props would be clearer.",
    ],
    strongSignals: [
      "Sounds like a library author, not just a feature implementer.",
      "Protects invariants while still leaving room for composition.",
      "Treats accessibility as part of the API, not an afterthought.",
    ],
    tags: ["component-patterns", "api-design", "accessibility", "composition"],
  },
  {
    id: "kanban-board-features",
    moduleId: "interview-challenges",
    title: "Complex UI: Kanban Board Features",
    difficulty: "hard",
    estimatedMinutes: 45,
    summary:
      "Add drag-and-drop, optimistic creation, keyboard support, and background syncing to a complex interactive board.",
    scenario:
      "You need to extend a Kanban-style board with column filtering, optimistic card creation, drag-and-drop reordering, and keyboard-accessible interactions. The board also needs to sync with the server in the background without jumping cards around unexpectedly when fresh data arrives.",
    targetImage: {
      src: "/react-challenges/kanban-board-features.svg",
      alt: "Kanban board mock with multiple columns, draggable cards, add-card button, and side filters.",
      caption:
        "This challenge combines complex UI structure, optimistic actions, ordering metadata, and accessible interaction patterns in one realistic product surface.",
    },
    deliverables: [
      "Explain how you would structure board state so local reordering and server truth can coexist.",
      "Call out which interactions must be optimistic and which should wait for confirmation.",
      "Describe how to keep drag-and-drop logic isolated from rendering concerns so the board stays testable.",
      "Include an accessibility plan for keyboard users, focus handling, and announcements.",
    ],
    commonPitfalls: [
      "Using raw array positions as durable identity during reordering.",
      "Letting background refetches blow away local drag or creation intent.",
      "Treating complex interaction logic as UI-only and forgetting accessible equivalents.",
    ],
    strongSignals: [
      "Separates identity, ordering metadata, and rendered grouping clearly.",
      "Talks about reconciling server snapshots with local optimistic actions.",
      "Includes accessibility in the design instead of bolting it on later.",
    ],
    tags: ["complex-ui", "drag-drop", "optimistic-ui", "accessibility"],
  },
  {
    id: "checkout-pricing-form",
    moduleId: "interview-challenges",
    title: "Reactive Checkout: Pricing, Validation, and Derived Totals",
    difficulty: "hard",
    estimatedMinutes: 50,
    summary:
      "Build a checkout flow where promo codes, shipping, tax, payment validation, and async inventory checks all affect what the user can submit.",
    scenario:
      "You are implementing a production checkout form for a B2B storefront. Quantity changes update line totals, shipping options affect tax, promo codes validate asynchronously, and some payment fields only appear for certain regions or invoice amounts. The user must always understand why the total changed and why submission is blocked.",
    targetImage: {
      src: "/react-challenges/checkout-pricing-form.svg",
      alt: "Checkout form mock with customer fields, payment details, inline errors, order summary, and derived totals.",
      caption:
        "This is a classic senior-front-end interview prompt: reactive form dependencies, async validation, derived pricing, and clear error states across the form and summary panel.",
    },
    deliverables: [
      "Model the form so raw inputs, validation state, and derived pricing are clearly separated.",
      "Explain which values are stored versus derived, including subtotal, discounts, shipping, tax, and grand total.",
      "Describe how async promo-code validation and inventory checks should avoid race conditions or stale confirmation messages.",
      "Show how input-level errors, step-level blocking reasons, and order-summary warnings should coexist without conflicting state.",
    ],
    commonPitfalls: [
      "Storing every derived monetary value in state and then struggling to keep totals in sync.",
      "Letting async validations overwrite newer user input after the field has changed.",
      "Collapsing all errors into one top-level message instead of attaching the right feedback to the right field or summary rule.",
    ],
    strongSignals: [
      "Keeps source inputs minimal and computes totals from normalized line items plus pricing rules.",
      "Treats async field validation as cancellable request state tied to the current input revision.",
      "Explains submission gating in terms of explicit blocking conditions rather than a vague isValid flag.",
    ],
    starterBlocks: [
      {
        label: "Starter checkout model",
        code: `type LineItem = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

type CheckoutDraft = {
  email: string;
  country: string;
  promoCode: string;
  shippingMethodId: string | null;
  cardNumber: string;
  expiration: string;
  cvc: string;
};`,
      },
    ],
    tags: ["forms", "derived-state", "validation", "checkout"],
  },
  {
    id: "permissions-matrix-editor",
    moduleId: "interview-challenges",
    title: "Permissions Matrix Editor",
    difficulty: "hard",
    estimatedMinutes: 45,
    summary:
      "Design a role-permission matrix with cascading toggles, indeterminate states, unsaved changes, and derived access summaries.",
    scenario:
      "You are building an admin permissions editor for enterprise accounts. Permissions are grouped by domain, toggling a group may update child permissions, some actions imply others, and the UI must show indeterminate states when only some permissions in a group are enabled. Admins can compare roles side by side and save only the changed permissions.",
    targetImage: {
      src: "/react-challenges/permissions-matrix-editor.svg",
      alt: "Permissions matrix mock with grouped modules, role columns, access toggles, indeterminate parent states, and unsaved-change summary.",
      caption:
        "The hard part is not the checkboxes themselves. It is the dependency graph, derived summaries, partial selection states, and keeping the mental model clear for the user.",
    },
    deliverables: [
      "Choose a normalized state shape for permissions, roles, implied access rules, and pending changes.",
      "Explain how parent rows, child rows, and indeterminate states are derived instead of stored redundantly.",
      "Describe how you would surface unsaved diffs, inherited permissions, and risky changes like removing billing access.",
      "Defend the event model for cascading updates so one toggle does not create impossible or contradictory states.",
    ],
    commonPitfalls: [
      "Storing parent checkbox state separately from child permissions and drifting out of sync.",
      "Ignoring implied permissions like 'edit' requiring 'view'.",
      "Recomputing the whole matrix imperatively in handlers instead of deriving summaries from a normalized model.",
    ],
    strongSignals: [
      "Talks about permission graphs and invariants, not just booleans in nested objects.",
      "Derives group summaries and indeterminate states from the canonical leaf permissions.",
      "Separates display concerns from mutation rules so the matrix stays maintainable.",
    ],
    starterBlocks: [
      {
        label: "Starter permission model",
        code: `type PermissionKey =
  | "users.view"
  | "users.edit"
  | "billing.view"
  | "billing.manage";

type RolePermissions = Record<PermissionKey, boolean>;

type RoleDrafts = Record<string, RolePermissions>;`,
      },
    ],
    tags: ["tables", "derived-state", "access-control", "complex-ui"],
  },
  {
    id: "invoice-builder-line-items",
    moduleId: "interview-challenges",
    title: "Invoice Builder With Line Items",
    difficulty: "medium",
    estimatedMinutes: 45,
    summary:
      "Implement an invoice editor where line items, discounts, tax rules, and validation errors update live without corrupting user intent.",
    scenario:
      "Finance needs a browser-based invoice builder. Users can add and reorder line items, edit quantities and unit prices inline, apply percentage or fixed discounts, and switch tax behavior by customer region. Invalid rows should show precise errors, the summary should always reconcile, and draft invoices must survive temporary network failures.",
    targetImage: {
      src: "/react-challenges/invoice-builder-line-items.svg",
      alt: "Invoice builder mock with editable line items, row errors, discount controls, tax summary, and draft status.",
      caption:
        "This challenge tests table editing plus reactive form design: line-level validation, derived financial summaries, and error handling that does not destroy partially entered drafts.",
    },
    deliverables: [
      "Define the boundary between editable row inputs, normalized invoice state, and derived summary numbers.",
      "Explain how you would validate line items incrementally without preventing users from typing intermediate invalid values.",
      "Describe how row-level errors and invoice-level business rules should be presented together.",
      "Talk through autosave or draft persistence so flaky network behavior does not wipe partially built invoices.",
    ],
    commonPitfalls: [
      "Forcing every field into a fully valid number on every keystroke and making input frustrating.",
      "Computing invoice totals in multiple places instead of one deterministic path.",
      "Treating reorder state as array position identity and losing the right row after edits.",
    ],
    strongSignals: [
      "Allows temporary input states while still producing deterministic validation on blur or submit.",
      "Normalizes line items by id and derives totals from one calculation pipeline.",
      "Separates UI editing affordances from persistence concerns like autosave and retry.",
    ],
    starterBlocks: [
      {
        label: "Starter invoice row",
        code: `type InvoiceLineDraft = {
  id: string;
  description: string;
  quantityInput: string;
  unitPriceInput: string;
};

type DiscountDraft =
  | { type: "none" }
  | { type: "percentage"; valueInput: string }
  | { type: "fixed"; valueInput: string };`,
      },
    ],
    tags: ["tables", "forms", "derived-state", "finance-ui"],
  },
  {
    id: "scheduling-availability-form",
    moduleId: "interview-challenges",
    title: "Scheduling Form With Reactive Availability",
    difficulty: "hard",
    estimatedMinutes: 40,
    summary:
      "Build a scheduling form where timezone, duration, participant availability, and recurring rules all react to each other without confusing the user.",
    scenario:
      "You are building a meeting scheduler for a distributed team. Changing timezone updates available time slots, meeting duration changes valid start times, recurring meetings enable extra fields, and participant conflicts must be shown inline before the user submits. The interviewer wants to hear how you avoid stale availability, race conditions, and impossible recurrence combinations.",
    targetImage: {
      src: "/react-challenges/scheduling-availability-form.svg",
      alt: "Scheduling form mock with timezone selector, slot picker, recurrence settings, participant availability, and conflict warnings.",
      caption:
        "This challenge is really about reactive dependencies. Every field changes what other fields mean, so the form model has to be deliberate and user-friendly.",
    },
    deliverables: [
      "Explain how timezone, date, duration, and recurrence rules influence derived availability options.",
      "Describe how you would fetch and invalidate slot availability without showing stale results after quick changes.",
      "Show where inline field errors, conflict warnings, and submission-blocking conditions belong in the UI.",
      "Defend a structure that makes recurring-rule validation understandable instead of buried in one giant effect.",
    ],
    commonPitfalls: [
      "Treating fetched availability as permanently valid after the user changes duration or timezone.",
      "Encoding recurrence validation as scattered booleans rather than explicit rule checks.",
      "Resetting too much user input when one dependency changes and making the form feel hostile.",
    ],
    strongSignals: [
      "Separates user-selected inputs from derived slot options and server availability responses.",
      "Understands invalidation boundaries when dependencies like duration or timezone change.",
      "Uses precise language about warnings versus blockers so the form can guide without surprising.",
    ],
    starterBlocks: [
      {
        label: "Starter scheduling draft",
        code: `type RecurrenceDraft =
  | { type: "none" }
  | { type: "weekly"; interval: number; days: string[] };

type SchedulerDraft = {
  timezone: string;
  date: string;
  durationMinutes: number;
  selectedSlotId: string | null;
  recurrence: RecurrenceDraft;
};`,
      },
    ],
    tags: ["forms", "async-state", "derived-state", "scheduling"],
  },
];

export const REACT_DEEP_DIVE_INTERVIEW_MODULE: ReactDeepDiveChallengeModule = {
  id: "interview-challenges",
  title: "Interview Challenges",
  description:
    "A dedicated React challenge bank focused on the kinds of real interview prompts that mix state modeling, reactive forms, validation, derived state, tables, performance, and complex UI decisions.",
  estimatedMinutes: REACT_DEEP_DIVE_INTERVIEW_CHALLENGES.reduce(
    (sum, challenge) => sum + challenge.estimatedMinutes,
    0,
  ),
  challenges: REACT_DEEP_DIVE_INTERVIEW_CHALLENGES,
};

export function getReactDeepDiveChallenge(id: string) {
  return REACT_DEEP_DIVE_INTERVIEW_CHALLENGES.find((challenge) => challenge.id === id);
}
