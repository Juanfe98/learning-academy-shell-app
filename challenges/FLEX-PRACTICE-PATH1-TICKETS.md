# Flex Practice Tickets — Path 1 (Foundations & Architecture)

> Local-only learning challenges for `growth-life-client-api`.
> **Do not push.** These are practice tickets, not real work.
>
> They are scoped to what **Path 1 — Foundations & Architecture** taught you:
> - Module 1: What the service is (template-driven Koa BFF)
> - Module 2: Server & request lifecycle (Koa middleware, `FlexContext`, standard headers)
> - Module 3: The two type systems (`GLO*` → `Flex*`) and the conversion wrappers
> - Module 4: Template-driven rendering (EJS, `fillTemplate`, cypher keys, dictionaries)
>
> Each ticket is written like a real Jira ticket so you practice reading a spec, not
> just writing code. The **discovery is part of the exercise** — hints point you at a
> layer, not an exact line. Work top-to-bottom; difficulty ramps up.
>
> **Golden rule while practicing:** obey the repo's own `CLAUDE.md` and `TESTING.md`.
> Use `!` imports, alphabetical import order, JSDoc on exported functions, `addOn` not
> `addon`, and run `npm run build:typeguards` after any type change.

---

## How to use these

1. Create a throwaway local branch: `git checkout -b practice/GLOW-XXX` (never push).
2. Read the ticket. Before touching code, write 2–3 sentences answering: *what is the
   current behavior, and what is the smallest safe change?* (Direct Mode habit.)
3. Implement. Run the smallest relevant validation (`npm run test` on the touched file,
   `npm run build:typeguards` if you changed a type).
4. Self-review your diff. Then `git checkout develop && git branch -D practice/GLOW-XXX`.
5. If you get stuck, the "Reinforces" line tells you which module to re-read.

---

## GLOW-101 — Trace the request lifecycle of a screen end-to-end

| | |
|---|---|
| **Type** | Investigation / Spike |
| **Priority** | Low |
| **Component** | Architecture / Request Lifecycle |
| **Difficulty** | ⭐ Warm-up (read-only, ~45 min) |
| **Reinforces** | Module 2 — Server & Request Lifecycle |

### Background
A new engineer needs a written mental model of how a GET screen request travels from
the HTTP boundary to a rendered JSON response. Pick **one** existing V1 screen (suggested:
the Membership Hub greeting screen, or `reacquisition`).

### Acceptance Criteria
- [ ] A short markdown doc (local, in your branch) that lists, in order, every hop a
      request makes: Koa server entry → route match → Joi validation → `flexContextRouteHandler`
      → service → backends fan-out → conversion → `fillTemplate` → response.
- [ ] For each hop, name the **actual file** in the repo that owns it.
- [ ] Explain in 2 sentences what `FlexContext` is and **where it gets injected** (which
      middleware/handler), and list 3 things it carries.
- [ ] Identify which standard **headers** the chosen route requires (look at its Joi schema).

### Technical Notes
- Start at the route under `src/routes/screens/v1/...` and follow the imports down.
- `flexContextRouteHandler` is the seam that auto-injects `FlexContext` — find its definition.
- You are not writing code. You are proving you can navigate the pipeline.

### Definition of Done
You can explain, without looking, the answer to: *"Where does `FlexContext` come from and
what's inside it?"*

---

## GLOW-102 — Add a defensive default to a GLO→Flex conversion wrapper

| | |
|---|---|
| **Type** | Task |
| **Priority** | Medium |
| **Component** | Domain / Conversion |
| **Difficulty** | ⭐⭐ Easy (~1 hr) |
| **Reinforces** | Module 3 — The Two Type Systems |

### Background
The raw `GLO*` backend types are looser than our domain `Flex*` types. When the
orchestrator omits an optional field, the conversion layer in `domain/common/` should
produce a **safe, explicit default** on the `Flex*` object rather than passing
`undefined` downstream.

Pick one optional field on a `GLO*` type that today flows through as `undefined` and give
it a defined default in its conversion wrapper.

### Acceptance Criteria
- [ ] In a wrapper under `src/domain/common/`, an optional GLO field now maps to a concrete
      default (e.g. empty string, empty array, or a documented sentinel) when absent.
- [ ] The `Flex*` type in `src/domain/models/` reflects the field as **required** (or keep
      it optional but guarantee the default — your call, justify it in a JSDoc/comment).
- [ ] A unit test asserts: *given a GLO response missing the field, the Flex object carries
      the default.* Use a **factory** (`build...Response()`), mock the **GLO client method**
      (`retrieveOffersV2` / `agreementDetails`) — NOT `getOffers`/`getAgreementDetails`.
- [ ] `npm run build:typeguards` run after the type change.

### Technical Notes
- Remember: mock the client, run the real conversion. That's the whole point of the test.
- Behavioral assertion, not a snapshot. Assert the one field.

### Out of Scope
Changing any screen service or template. Just the conversion + its test.

---

## GLOW-103 — Add a localized copy line to an existing screen

| | |
|---|---|
| **Type** | Story |
| **Priority** | Medium |
| **Component** | Templates / Rendering |
| **Difficulty** | ⭐⭐ Easy–Medium (~1.5 hr) |
| **Reinforces** | Module 4 — Template-Driven Rendering |

### Background
Product wants an existing screen to render one extra line of localized text (e.g. a
reassurance subtitle under a header). The copy comes from a **cypher key** in a dictionary,
not a hardcoded string.

### Acceptance Criteria
- [ ] The screen's **contract type** in `src/domain/models/screens/v1/...` gains one new
      optional field for the new text element.
- [ ] The screen **service** builds that field with `toCopy({ text: '<cypher_key>',
      dictionary: '<dictionary>' })` wrapped in the correct element builder, and passes it
      through `fillTemplate`.
- [ ] The cypher key is added following **Pattern 1** (key + dictionary object), per
      `CLAUDE.md` — not a flat key string.
- [ ] A unit test asserts the new field is present and points at the right cypher key.
- [ ] `npm run build:typeguards` run.

### Technical Notes
- You won't have the real template JSON locally rendering the field — that lives in the
  `growth-life-client-templates` repo. That's fine: the exercise is the **contract + service
  + cypher wiring**, which is all in *this* repo.
- Look at how a neighboring text element on the same screen is built and mirror it.

### Definition of Done
The service returns the new localized element; the test proves the cypher key/dictionary.

---

## GLOW-104 — Surface a new standard header through FlexContext

| | |
|---|---|
| **Type** | Task |
| **Priority** | Medium |
| **Component** | Request Lifecycle / Headers |
| **Difficulty** | ⭐⭐⭐ Medium (~2 hr) |
| **Reinforces** | Module 2 — Server & Request Lifecycle |

### Background
A downstream feature needs to read an incoming HTTP header that the service currently
ignores. Trace how `standardHeaders` are parsed from the raw request and made available on
`FlexContext`, then thread one additional header through.

### Acceptance Criteria
- [ ] Identify where raw headers are mapped into `StandardHeaders` (the `StandardHeaderKeys`
      mapping) and add one new (real or plausible) header to that mapping.
- [ ] The header is validated in a route's Joi `header` schema (remember `.unknown()`).
- [ ] The value is reachable via `flexContext.standardHeaders` inside a service.
- [ ] A unit/integration test proves: *given the header on the request, the service sees it.*

### Technical Notes
- `id-denylist`: if the header relates to add-ons, spell it `addOn`, never `addon`.
- Don't put business logic in the route — validation only. Reading/using the value belongs
  in the service.

### Out of Scope
Actually acting on the header value (no new business rule). Just prove it flows through.

---

## GLOW-105 — Bugfix: conversion wrapper throws on a null agreement

| | |
|---|---|
| **Type** | Bug |
| **Priority** | High |
| **Component** | Domain / Conversion |
| **Difficulty** | ⭐⭐⭐ Medium (~2 hr) |
| **Reinforces** | Module 3 — The Two Type Systems |

### Background
*(Simulated defect — you will introduce and then fix it, or find a real thin spot.)*
When the orchestrator returns an agreement with a missing nested object (e.g. no pricing
block, or an empty subscriptions array), a `Flex*` conversion wrapper reads a property off
`undefined` and blows up instead of degrading gracefully.

### Repro
1. Build a GLO agreement-details response with the nested object absent (use a factory +
   `deepMerge` to strip it).
2. Call the real `getAgreementDetails()` path (mock only `GrowthLifeOrchestratorClient.agreementDetails`).
3. Observe the throw / undefined access.

### Acceptance Criteria
- [ ] The wrapper guards the nested access and returns a safe `Flex*` shape (documented
      default) instead of throwing.
- [ ] A regression test reproduces the missing-nested-object case and asserts the graceful
      result. **Behavioral** assertion on the specific field.
- [ ] No change to the happy-path behavior (add a second test or reuse an existing one to
      prove the populated case still works).
- [ ] `npm run build:typeguards` if any type changed.

### Technical Notes
- This is the classic "GLO is loose, Flex must be safe" lesson. The fix belongs in
  `domain/common/`, not in the caller.
- `deepMerge` replaces arrays wholesale and ignores `undefined` — know that when building
  the broken fixture.

---

## GLOW-106 — (Stretch) Compute a boolean contract field from offers data

| | |
|---|---|
| **Type** | Story |
| **Priority** | Low |
| **Component** | Domain / Screen Contract |
| **Difficulty** | ⭐⭐⭐⭐ Stretch — peeks into Path 2 (~2.5 hr) |
| **Reinforces** | Module 3 + 4, bridges into Screen Services (Path 2) |

### Background
This one leans one step past Foundations on purpose. A screen contract should expose a
derived boolean (e.g. `hasPromoOffer`, `isSingleSubscription`) computed from the converted
`Flex` offers/agreement data, so the template can branch on it.

### Acceptance Criteria
- [ ] The screen **contract type** gains a boolean field.
- [ ] A small, pure **selector** (in the domain layer, not the route) computes it from the
      `Flex*` data.
- [ ] The service calls the selector and passes the boolean into `fillTemplate`.
- [ ] Independent fetches (if you add any) use `Promise.all` — never sequential awaits.
- [ ] Unit tests for the selector cover true and false cases using factories + traits
      (e.g. `promoOfferTrait`).
- [ ] `npm run build:typeguards` run.

### Technical Notes
- Keep the selector pure and unit-testable in isolation — that's the senior-engineer habit.
- If you find yourself wanting a per-screen function registry, stop: `CLAUDE.md` forbids it
  (`no-screen-function-registry`). Use the canonical domain registry instead. (You'll fully
  meet this in Path 3 — for now just don't fight the rule.)

---

## Suggested order & what each proves

| Ticket | Proves you can… | Layer |
|--------|-----------------|-------|
| GLOW-101 | navigate the whole pipeline | lifecycle (read-only) |
| GLOW-102 | make GLO→Flex safe with a default + test it right | type systems |
| GLOW-103 | wire localized copy via cypher + contract type | templates |
| GLOW-104 | thread a header through FlexContext | lifecycle |
| GLOW-105 | debug a conversion defect and guard it | type systems |
| GLOW-106 | derive contract data with a pure selector | bridge to Path 2 |

When GLOW-101→105 feel easy, you're ready for **Path 2 — The Screen Pipeline**.
