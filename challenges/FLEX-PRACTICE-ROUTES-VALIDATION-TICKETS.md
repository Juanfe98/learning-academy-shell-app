# Flex Practice Tickets — Routes & Validation

> Local-only learning challenges for `growth-life-client-api`.
> **Do not push.** These are practice tickets, not real work.
>
> Scoped to the **Routes & Validation** lesson:
> - The route layer's one job: validate + delegate (no business logic)
> - Anatomy of a V1 route (`flexRouteMiddleware`, Joi header/query/body, `.unknown()`)
> - The handler chain and `FlexContext`
> - V2 routes (POST, base64 resource filters, Datadog flow tags)
> - OpenAPI & the `build:swagger` contract
>
> Each ticket is written like a real Jira ticket so you practice reading a spec.
> **Discovery is part of the exercise** — hints point at a layer/file, not an exact line.
> Work top-to-bottom; difficulty ramps up.
>
> **Reality check vs the lesson:** the lesson's `SolutionReveal` uses shorthand
> (`koaRouter().route({...})` + `flexContextRouteHandler`). The **real repo** leaf routes
> use `new Router()` (koa-router) + `.get/.post(path, flexRouteMiddleware({...}))`, and
> mount via a `koaRouter()` area `index.ts`. **Follow the real repo**, not the shorthand.
> Gold reference files:
> - V1 GET: `src/routes/screens/v1/landing/hero.ts`
> - V1 POST: `src/routes/screens/v1/commerce/eligiblePlans.ts`
> - V2 POST (+Datadog): `src/routes/screens/v2/account/planSwitchLedger.ts`
> - Area mount: `src/routes/screens/v1/landing/index.ts`
> - Route test: `src/routes/screens/v1/landing/hero.test.ts` (supertest against `!app`)
>
> **Golden rule while practicing:** obey the repo's own `CLAUDE.md` / `src/routes/CLAUDE.md`
> and `TESTING.md`. Use `!` imports, alphabetical import order, JSDoc on the handler,
> `addOn` not `addon`, run `npm run build:swagger` after any route/openapi change and
> `npm run build:typeguards` after any type change.

---

## How to use these

1. Create a throwaway local branch: `git checkout -b practice/GLOW-2XX` (never push).
2. Read the ticket. Before touching code, write 2–3 sentences: *what is the current
   behavior, and what is the smallest safe change?* (Direct Mode habit.)
3. Implement using the **real repo patterns** above.
4. Prove it. The reliable local proof is a **supertest** route test (mirror `hero.test.ts`):
   assert a valid request returns `200`, and a request missing the required header/param
   returns `400`. Run `npm run test <yourfile>.test.ts`.
5. Self-review your diff. Then `git checkout develop && git branch -D practice/GLOW-2XX`.
6. Stuck? The "Reinforces" line tells you which lesson section to re-read.

---

## GLOW-201 — Add a validated query param to an existing V1 GET route

| | |
|---|---|
| **Type** | Task |
| **Priority** | Low |
| **Component** | Routes / Validation |
| **Difficulty** | ⭐ Warm-up (~45 min) |
| **Reinforces** | Anatomy of a V1 Route → Joi Validation & Why `.unknown()` |

### Background
The `hero` screen (`GET /landing/hero`) already validates a required `type` query param.
Product wants to optionally pass a `variant` param so the screen can branch later. For now
just make the **route accept and validate it** — no service behavior change yet.

### Acceptance Criteria
- [ ] `src/routes/screens/v1/landing/hero.ts` Joi `query` schema gains an **optional**
      `variant: Joi.string()`.
- [ ] `.unknown()` is preserved on the query object (explain in your PR note *why* removing
      it would 400 real requests).
- [ ] The handler reads `ctx.query.variant` and passes it into the `requestContext` object
      it already builds (typed, no `any`).
- [ ] A route test proves: request **with** `variant` → `200`; request **missing `type`**
      → `400`.

### Technical Notes
- Query values are `string | string[]`. Cast the same way the existing `type` read does
  (`ctx.query.variant as string`) — mirror the neighbor, don't invent a new pattern.
- No service edit required; `buildGatewayScreen` ignores unknown `requestContext` keys.

### Definition of Done
Route validates `variant`, test proves the 200/400 pair, nothing else changed.

---

## GLOW-202 — Wire up a new read-only `/gift-status` V1 GET screen

| | |
|---|---|
| **Type** | Story |
| **Priority** | Medium |
| **Component** | Routes / Validation / Screen Service |
| **Difficulty** | ⭐⭐⭐ Medium (~2.5 hr) |
| **Reinforces** | The Route Layer's One Job → Handler Chain → OpenAPI & `build:swagger` |

### Background
This is the lesson's `/gift-status` challenge, made **real and runnable locally**.
We need a new read-only screen `GET /landing/gift-status` that takes the account id (header)
and a `giftId` query param and returns a screen body. The **route** does validation +
delegation only; a thin **service** builds the body.

> Scope guard: full template/dictionary rendering lives in `growth-life-client-templates`
> and is **out of scope**. Your service returns a minimal contract object that echoes the
> `giftId` (e.g. `{ giftId, status: 'PENDING' }`). The exercise is the **route + validation
> + delegation + mount + openapi** wiring — the same wiring every real screen needs.

### Acceptance Criteria
- [ ] **Route file** `src/routes/screens/v1/landing/giftStatus.ts`:
  - `new Router()` from `koa-router`, `export default giftStatus`.
  - `giftStatus.get('/gift-status', flexRouteMiddleware({ validate, handler }))`.
  - `validate.header` uses `commonJoiHeaders({ required: [StandardHeaderKeys.accountId] }).unknown()`.
  - `validate.query` is `Joi.object({ giftId: Joi.string().required() }).unknown()`.
  - Handler has a **JSDoc block** (`@param ctx`, `@param flexContext`) and contains **zero
    business logic** — it only reads `ctx.query.giftId` and calls the service.
- [ ] **Service** `src/domain/screen/landing/giftStatusService.ts`:
  - Exports `buildGiftStatus({ flexContext, requestData })` with JSDoc.
  - Returns the minimal contract described above. All the "logic" lives here, not the route.
- [ ] **Mount**: add `giftStatus` to `src/routes/screens/v1/landing/index.ts`
      (`import` alphabetically, then `landing.use(giftStatus.middleware())`).
- [ ] **OpenAPI**: add the `/gift-status` path to `src/routes/screens/v1/landing/openapi.yaml`,
      then run `npm run build:swagger`.
- [ ] **Test** `giftStatus.test.ts` (mirror `hero.test.ts`): valid header + `giftId` → `200`
      and body echoes `giftId`; missing `giftId` → `400`; missing `accountId` header → `400`.

### Technical Notes
- Imports: `flexRouteMiddleware` from `!routes/screens/common`, `commonJoiHeaders` from
  `!routes/commonJoiHeaders`, `StandardHeaderKeys` from `!middlewares/models/StandardHeaders`,
  your service from `!domain/screen/landing/giftStatusService`. All `!` imports, alphabetical.
- **Symptom drills — verify each failure yourself:**
  - Skip the `landing.use(...)` mount → every request `404`s (route file exists but is orphaned).
  - Drop `.unknown()` → real Disney headers make the request `400`.
  - Skip `build:swagger` → `openapi-check` / `build:openapi:ci` fails in CI.
- Keep the service typed (define a small `GiftStatusRequestData` / response type). Run
  `npm run build:typeguards` if you add types the typeguard config picks up.

### Definition of Done
`GET /landing/gift-status` returns `200` with the echoed `giftId` in a test, the two `400`
cases are proven, the route is mounted, and `openapi.yaml` + `build:swagger` are updated.

---

## GLOW-203 — (Stretch) V2 variant: POST body, resource filters, Datadog flow tag

| | |
|---|---|
| **Type** | Story |
| **Priority** | Low |
| **Component** | Routes / V2 / Observability |
| **Difficulty** | ⭐⭐⭐⭐ Hard (~3 hr) |
| **Reinforces** | V2 Routes: POST, Filters, Datadog → How V2 Connects to Services |

### Background
Reissue `/gift-status` as a V2 endpoint: `POST /account/gift-status`, taking a JSON body
instead of a query param, honoring base64 **resource filters**, and tagging the request
flow in **Datadog** — the three things that distinguish a V2 route from a V1 route.

### Acceptance Criteria
- [ ] **Route file** `src/routes/screens/v2/account/giftStatus.ts` using `new Router()` +
      `.post('/gift-status', flexRouteMiddleware({...}))`, `type: 'json'`.
- [ ] `validate.body` is a `Joi.object({ giftId: Joi.string().required(), ... }).unknown()`.
- [ ] Resource filters are read via `getFlexResourceFilters` (see
      `!domain/common/resourceFilter`) and passed to the service — **not** parsed inline in
      the route beyond that helper call.
- [ ] A Datadog flow tag is set — either `setDatadogTags(ctx, { flow: ... })` inside the
      handler or `createDatadogTagMiddleware(...)` in the handler chain (both from
      `!middlewares/datadogTags`; copy the pattern from `planSwitchLedger.ts` /
      `planSelector.ts`).
- [ ] Mounted in the V2 `account` area `index.ts`; `openapi.yaml` (v2/account) updated;
      `npm run build:swagger` run.
- [ ] Test proves: valid POST body → `200`; missing `giftId` in body → `400`.

### Technical Notes
- The handler destructures from `ctx.request.body`, not `ctx.query`. Look at
  `src/routes/screens/v2/account/planSwitchLedger.ts` for the exact body-read + service-call
  + `setDatadogTags` shape.
- Filters are opaque base64 in transit — you only need to *thread them through* the helper
  into the service, not decode them by hand.

### Out of Scope
Actually filtering the response by the resource filters (no new business rule). Prove the
filter object and Datadog tag reach the service/telemetry; that's the learning goal.

### Definition of Done
V2 POST route validates the body, threads filters + sets a Datadog flow tag, is mounted,
and `openapi.yaml` + `build:swagger` are updated with a passing 200/400 test pair.
