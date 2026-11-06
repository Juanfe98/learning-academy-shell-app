import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const guardDiagram = String.raw`flowchart TD
  REQ["GET /plan-switch-ledger"] --> GA{"Guard A (pre-preview):<br/>agreement has paymentMethod<br/>OR gift card balance?"}
  GA -->|no| REDIR["redirect screen →<br/>account-change-payment"]
  GA -->|yes| PREVIEW["PUT /v3/switch/preview<br/>(GLO)"]
  PREVIEW --> GB{"Guard B: preview's current sub<br/>paymentMethod supported?"}
  GB -->|"missing or Venmo"| REDIR
  GB -->|yes| LEDGER["render the ledger"]
  style REDIR fill:#7c2d12,color:#fff
  style LEDGER fill:#113ccf,color:#fff`;

const mappingDiagram = String.raw`flowchart LR
  subgraph RAW["raw GLO offer (what the profile patches)"]
    L["labels + 'l4l'"]
    BF["prices.retailPrice<br/>.billingFrequency = 6"]
    TP["prices.retailPrice<br/>.termPrice = 59994"]
    DP["prices.destinationPrices<br/>reason L4L_EXPIRATION<br/>money 11999"]
  end
  subgraph FLEX["Flex offer (after conversion)"]
    FL["labels → isLower4LongerOffer()"]
    FBF["retailPrice.billingFrequency"]
    FTP["retailPrice.termPrice"]
    FRP["recurringPrice<br/>(via getRecurringPrice)"]
  end
  subgraph OUT["rendered card"]
    RC["REPEAT_COUNT: 6"]
    TOT["TOTAL_PRICE: 59,994"]
    TRAN["TRANSITION_PRICE: 11,999"]
    KEY["legal key:<br/>billing_standalone_subcopy_2_l4l"]
  end
  L --> FL --> KEY
  BF --> FBF --> RC
  TP --> FTP --> TOT
  DP --> FRP --> TRAN
  style RAW fill:#1a1a2e,color:#fff
  style OUT fill:#113ccf,color:#fff`;

const case1Sequence = String.raw`sequenceDiagram
  participant B as Bruno #4
  participant F as flex :3200 (worktree)
  participant M as experimentation middleware
  participant P as qa-proxy :4300
  participant G as staging GLO
  B->>F: GET /plan-switch-ledger<br/>+ x-qa-profile: gciex18128-l4l<br/>+ x-bamtech-weaponx-assignments (base64 t1)
  F->>M: resolve assignments
  M-->>F: experiments: l4l-switch-latam-t1<br/>(client header trusted — Choices flags off)
  F->>P: GET /v1/agreements (headers forwarded)
  P->>G: passthrough
  G-->>F: real agreement (real card!)
  F->>P: PUT /v3/switch/preview
  P->>G: passthrough() inside the profile
  G-->>P: real preview (Premium offer)
  P->>P: patch: +l4l label, termPrice,<br/>billingFrequency 6, L4L_EXPIRATION
  P-->>F: mutated preview [override]
  F->>F: conversion → guards ALL pass →<br/>platform buildPlanCardLowerForLonger
  F-->>B: card + priceDetails + legal (subcopy_2_l4l)`;

export const toc: TocItem[] = [
  { id: "mission", title: "The Mission", level: 2 },
  { id: "case0", title: "Case 0: Earn the Baseline With Zero Mocks", level: 2 },
  { id: "account-traps", title: "The Account-Setup Traps", level: 3 },
  { id: "profile", title: "The Profile, Line by Line", level: 2 },
  { id: "treatment", title: "Forcing the Treatment Locally", level: 2 },
  { id: "case1", title: "Case 1: The Delta", level: 2 },
  { id: "debugging", title: "The Debugging Detour (Worth Its Own Scars)", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function CaseStudyL4lSwitchLedger() {
  return (
    <div className="article-content">
      <p>
        Theory done — this module replays a real ticket, GCIEX-18128 (Disney+ LATAM Web L4L Switch,
        the Switch Ledger page), from &ldquo;the feature is coded and unit-tested&rdquo; to
        &ldquo;here is the curl showing it render&rdquo;. Everything below actually happened,
        including the traps. The shape of the exercise: <strong>Case 0</strong> proves the whole
        chain works with zero mocks; <strong>Case 1</strong> adds exactly two things (one proxy
        profile, one header) and shows the feature as the only delta.
      </p>

      <h2 id="mission">The Mission</h2>
      <p>
        The feature: when a LATAM user in the <code>wpnx-l4l-switch-latam</code> treatment switches{" "}
        <em>into</em> an L4L offer, the ledger&apos;s plan card must gain a renewal-cadence{" "}
        <code>priceDetails</code> line and a total-cost <code>legal</code> line (
        <code>billing_standalone_subcopy_2_l4l</code>). The blocker: LATAM L4L <em>switch</em>{" "}
        offers were not configured upstream (BizOps ticket COMOPS-6369 pending), so no real request
        could ever carry the trigger data. Evidence plan: real account for everything else, proxy
        profile for the one impossible response.
      </p>

      <h2 id="case0">Case 0: Earn the Baseline With Zero Mocks</h2>
      <p>
        Before mocking anything, prove the boring 80%: server, route params, auth headers, real GLO,
        template fill. The discovery chain used three Bruno requests (no Bearer token needed
        locally — account/identity headers suffice): <code>subscription-details</code> to confirm
        the sub, the <code>plan-switch</code> picker to harvest a real target (its cards carry{" "}
        <code>previewSubscriptionChanges</code> action payloads with{" "}
        <code>subscriptionId / offerId / campaignId</code> — exactly what the ledger route wants),
        then the ledger itself. The baseline verdict is a card with <strong>no</strong>{" "}
        <code>legal</code> and <strong>no</strong> <code>priceDetails</code> — the
        &ldquo;before&rdquo; photo Case 1 diffs against.
      </p>

      <h3 id="account-traps">The Account-Setup Traps</h3>
      <p>
        Getting a testable account took longer than the mocking. Every trap below is real, and each
        one teaches something about how the ledger defends itself:
      </p>
      <ArticleTable caption="Four traps between you and a working Case 0 account." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Trap</th>
              <th>Symptom</th>
              <th>Lesson</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Overrider-granted sub (Source Provider ACP)</td>
              <td>Ledger returns a redirect screen to <code>account-change-payment</code></td>
              <td>ACP-billed grants leave the GLO agreement&apos;s <code>paymentMethod: null</code> — wallet cards ≠ agreement binding</td>
            </tr>
            <tr>
              <td>OPS-sourced grant</td>
              <td>Payment dropdown disabled at &ldquo;Without payment&rdquo;</td>
              <td>Ops grants are paymentless by design; no card can ever bind</td>
            </tr>
            <tr>
              <td>Real checkout, wrong card... I mean plan</td>
              <td>Sub carries an <code>l4l</code> label; picker shows ZERO switch targets</td>
              <td>The AR signup page&apos;s cheap &ldquo;final price&rdquo; card IS the live L4L SUF offer — and users ON L4L are locked out of switching (that lockout is itself a regression case)</td>
            </tr>
            <tr>
              <td>Real checkout, regular plan</td>
              <td>Everything works</td>
              <td>Only checkout-purchased subs carry a bound payment method into GLO agreements</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The redirect trap is worth reading in code, because it is the ledger&apos;s first line of
        defense and the thing your test account must satisfy:
      </p>
      <CodeBlock
        code={`// ledgerService.ts (abridged) — Guard A, evaluated BEFORE the preview call
if (
  !isApprovedThirdPartyProvider &&
  (hasBillingGraceSubscription ||
    (!activeAgreement.paymentMethod &&
      !activeAgreement.giftCardInfo?.giftCardBalance))
) {
  return redirectToAccountChangePayment({ entitlementId, previewOffers });
}

// utils.ts — Guard B, on the preview's current subscription
export const isUnsupportedPaymentMethod = (paymentMethod) => {
  if (!paymentMethod) return true;
  return paymentMethod.brand === 'VenmoPayment';
};`}
        lang="typescript"
        filename="the payment guards"
      />
      <MermaidDiagram
        chart={guardDiagram}
        title="Why the Ledger Kept Redirecting"
        caption="Guard A fires before the preview is even requested — which is also why the proxy recordings showed agreements+offers calls but no preview call during the redirect phase."
        minHeight={380}
      />
      <p>
        The diagnosis that ended the guessing was the proxy&apos;s <strong>record mode</strong>:
        one look at the recorded <code>GET /v1/agreements</code> body showed{" "}
        <code>paymentMethod: null</code> on every overrider-created agreement and a full{" "}
        <code>PaymentCard</code> object on the checkout-purchased one. Ground truth beats theory.
      </p>

      <h2 id="profile">The Profile, Line by Line</h2>
      <p>
        With Case 0 green, the profile fakes exactly one thing: the switch-preview&apos;s potential
        offer becomes an L4L offer. It uses the live-mutation pattern, and every patched field maps
        one-to-one onto something the flex conversion layer reads:
      </p>
      <CodeBlock
        code={`export default {
  name: 'gciex18128-l4l',
  routes: [
    {
      match: (pathname, method) => method === 'PUT' && pathname === '/v3/switch/preview',
      handle: async ({ passthrough }) => {
        const upstream = await passthrough();               // real preview, live proration
        const body = JSON.parse(upstream.body.toString('utf8'));

        // The target offer appears in potentialAgreement.subscriptions[].offer
        // AND productOfferChanges[].offer — patch every copy identically.
        const patchOffer = (offer) => {
          if (!offer?.prices || !Array.isArray(offer.labels)) return;
          if (!offer.labels.includes('l4l')) offer.labels.push('l4l');
          const rp = offer.prices.retailPrice;
          if (rp) {
            rp.money = { amount: 9999.0, currency: 'ARS' };
            rp.billingFrequency = 6;   // -> Flex retailPrice.billingFrequency -> REPEAT_COUNT
            rp.termPrice = 59994.0;    // -> Flex retailPrice.termPrice       -> TOTAL_PRICE
          }
          offer.prices.destinationPrices = [
            {
              reason: 'L4L_EXPIRATION', // -> getRecurringPrice -> Flex recurringPrice
              money: { amount: 11999.0, currency: 'ARS' },   // -> TRANSITION_PRICE
              frequency: 'MONTH',
              billingCadence: { unit: 'MONTH', length: 1 },
            },
          ];
        };
        (body.potentialAgreement?.subscriptions ?? []).forEach((s) => patchOffer(s.offer));
        (body.productOfferChanges ?? []).forEach((c) => patchOffer(c.offer));

        return { status: upstream.status, headers: { ...upstream.headers },
                 body: Buffer.from(JSON.stringify(body)) };
      },
    },
  ],
};`}
        lang="javascript"
        filename="profiles/gciex18128-l4l.mjs"
      />
      <p>
        Three authoring decisions to internalize. <strong>The values are verbatim from the real
        product</strong> — ARS 9,999 × 6 = 59,994 transitioning to 11,999 were read off the live AR
        L4L signup offer, so the rendered evidence reads like the real thing.{" "}
        <strong>The L4L_EXPIRATION entry is not decoration</strong> — it is the exact mechanism{" "}
        <code>getRecurringPrice</code> uses to derive <code>recurringPrice</code> for L4L offers,
        and both the legacy and platform guards require <code>retailPrice &amp;&amp; recurringPrice</code>;
        without it the arm never fires. <strong>Patch every copy</strong> — the offer object is
        repeated across the payload, and guessing which copy the code reads is how mocks half-work.
      </p>
      <MermaidDiagram
        chart={mappingDiagram}
        title="From Patched Raw Fields to Rendered Copy"
        caption="Each mutation exists because a specific conversion reads it — nothing in the profile is arbitrary. This mapping came from reading agreementsUpdatePreviewConversion, convertToFlexBasePrice, and getRecurringPrice."
        minHeight={420}
      />

      <h2 id="treatment">Forcing the Treatment Locally</h2>
      <p>
        Mutated data alone is not enough — the gate is{" "}
        <code>treatment &amp;&amp; isLower4LongerOffer(potentialOffer)</code>. Locally, the
        experimentation middleware trusts the client header (the GLO Choices flags default off), so
        one header forces the assignment:
      </p>
      <CodeBlock
        code={`# header value = base64 of:
# {"experiments":{"wpnx-l4l-switch-latam":{"variant_id":"l4l-switch-latam-t1","version":1}}}

x-bamtech-weaponx-assignments: eyJleHBlcmltZW50cyI6eyJ3cG54LWw0bC1zd2l0Y2gtbGF0YW0i...

# generate it:
python3 -c "import base64,json; print(base64.b64encode(json.dumps(
  {'experiments':{'wpnx-l4l-switch-latam':{'variant_id':'l4l-switch-latam-t1','version':1}}},
  separators=(',',':')).encode()).decode())"`}
        lang="bash"
        filename="forced-assignment header (local only)"
      />
      <p>
        This works <em>locally</em> because both <code>enable-choices-assignments</code> and{" "}
        <code>enable-choices-shadow-comparison</code> resolve false, putting the middleware on the
        legacy path that decodes the client header. On the staging edge the header is stripped —
        forced assignments there go through WeaponX tooling instead. Know which world you are in.
      </p>

      <h2 id="case1">Case 1: The Delta</h2>
      <p>
        Bruno request #4 is request #3 plus exactly two headers —{" "}
        <code>x-qa-profile: gciex18128-l4l</code> and the assignments header. The response is the
        same ledger with the plan card gaining exactly the two fields the ticket exists to add:
      </p>
      <CodeBlock
        code={`// Case 0 card keys:
["changePlan", "description", "offerId", "offerType", "price", "style", "title", "type"]

// Case 1 card keys — the delta IS the feature:
["changePlan", "description", "legal", "offerId", "offerType", "price", "priceDetails", "style", "title", "type"]

// priceDetails: renewal_cadence_details
//   REPEAT_COUNT: 6, TRANSITION_PRICE: ARS 11,999 /month
// legal: billing_standalone_subcopy_2_l4l   (unified-commerce-onboarding)
//   REPEAT_COUNT: 6, TOTAL_PRICE: ARS 59,994`}
        lang="json"
        filename="the before/after that goes in the PR"
      />
      <MermaidDiagram
        chart={case1Sequence}
        title="Case 1, End to End"
        caption="Two additions over Case 0 — the forced-assignment header (left side) and the profile mutation (right side). Everything else, including the payment method and proration, is live staging data."
        minHeight={520}
      />

      <h2 id="debugging">The Debugging Detour (Worth Its Own Scars)</h2>
      <p>
        The first Case 1 run returned the mutated price (9,999 on the card — the profile fired!)
        but no L4L fields. The eventual cause is the best lesson in this path:{" "}
        <strong>the server on :3200 was a different worktree</strong> — an old ticket&apos;s
        checkout, running old code with no LATAM feature in it at all. The mutation flowed through
        that old code&apos;s BAU rendering perfectly, producing a convincingly wrong result.
        Diagnose in seconds instead of thirty minutes:
      </p>
      <CodeBlock
        code={`# WHICH code is actually serving :3200?
lsof -ti :3200 | head -1          # → PID
lsof -p <PID> | grep cwd          # → the running worktree. Verify BEFORE testing.`}
        lang="bash"
        filename="the wrong-worktree check"
      />
      <p>
        Two more techniques from the detour that generalize. First, <strong>temporary gate
        instrumentation</strong>: a tagged <code>debugLog</code> dropped inside the guard printed
        every input in one line (treatment detected? labels? hasRecurring?) — the moment it ran on
        the right worktree, every boolean read true and the mystery was over; the instrumentation
        was then removed to zero traces. Second, <strong>read the proxy log line</strong>:{" "}
        <code>[gciex18128-l4l:override]</code> vs <code>[passthrough]</code> separates
        &ldquo;my mock did not fire&rdquo; from &ldquo;my code did not react&rdquo; — two very
        different investigations.
      </p>
      <p>
        One more discovery from the same detour: the debug line came from the{" "}
        <em>platform</em> registry, not the legacy service — locally, LaunchDarkly serves this
        migrating screen through the platform pipeline. The curl therefore validated the platform
        side; the legacy side stands on the unit and parity suites. On a migrating screen, always
        know which implementation your evidence exercised.
      </p>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Case 0 before Case 1, always:</strong> prove the unmocked chain first, so the
          treatment run has exactly two variables (one profile, one header) and the diff IS the
          feature.
        </li>
        <li>
          Test accounts for the ledger must be <strong>checkout-purchased</strong> — granted subs
          (ACP/OPS) carry no agreement payment method and die on Guard A.
        </li>
        <li>
          A mutation profile is a <strong>map of the conversion layer</strong>: label →
          detection, billingFrequency → REPEAT_COUNT, termPrice → TOTAL_PRICE, L4L_EXPIRATION
          destination price → recurringPrice → TRANSITION_PRICE.
        </li>
        <li>
          Force treatments locally with the base64{" "}
          <code>x-bamtech-weaponx-assignments</code> header — it works only because the Choices
          flags are off locally; the staging edge strips it.
        </li>
        <li>
          Before any local testing: <code>lsof</code> the port and verify the serving worktree.
          Convincingly wrong beats obviously broken every time.
        </li>
        <li>
          Diagnose with ground truth, not theory: recordings for what backends really returned,
          the proxy log line for whether the mock fired, tagged temporary instrumentation for
          which gate said no — then remove it to zero traces.
        </li>
      </ul>
    </div>
  );
}
