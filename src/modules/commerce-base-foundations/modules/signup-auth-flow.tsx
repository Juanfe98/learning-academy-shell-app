import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const bigPictureDiagram = String.raw`flowchart TD
  MKT["Marketing site / deep link"] --> SU["/identity/sign-up/enter-email<br/>(create-account flow)"]
  MKT --> LI["/identity/login/enter-email<br/>(login flow)"]
  TV["TV device shows code"] --> BEGIN["/identity/begin<br/>(license-plate login)"]
  TV --> START["/identity/start<br/>(license-plate create account)"]

  SU -->|"email already registered"| LI
  SU -->|"new email"| PW["create-password"]
  PW --> VERIFY["OTP / magic-link / skip"]
  VERIFY --> MI["missing-info (DOB)"]
  LI --> AUTH["authenticated"]
  MI --> AUTH
  BEGIN --> AUTH
  START --> AUTH

  AUTH --> LOAD["/identity/loading<br/>useNavigationRedirect"]
  LOAD --> CHAIN{"ordered handler chain"}
  CHAIN -->|"entitled user"| APP["profiles / stream app"]
  CHAIN -->|"needs purchase"| BILL["/commerce/billing"]
  BILL --> GUARDS{"useBillingRedirects"}
  GUARDS -->|"no DOB"| MI2["/identity/sign-up/missing-info"]
  GUARDS -->|"marketing opt-in pending"| RAA["/identity/review-and-accept"]
  GUARDS -->|"SA review required"| SA["/identity/subscriber-agreement"]
  GUARDS -->|"all clear"| PAY["plan + payment (SUF ledger)"]
  MI2 --> BILL
  RAA --> BILL
  SA -->|"Agree & Continue"| BILL`;

const createAccountMachineDiagram = String.raw`stateDiagram-v2
  [*] --> start
  start --> accountBlocked: intended accountBlocked
  start --> enterPasscode: intended passcode + has email
  start --> enterEmail: needs email / needs email check
  start --> createPassword: intended password
  start --> missingInfo: hasRegistered (password set)

  enterEmail --> createPassword: SUBMIT_EMAIL (canRegister)
  enterEmail --> enterEmail: confirmation / error-reduction modal

  createPassword --> missingInfo: CONTINUE
  createPassword --> verifyEmailWithMagicLink: VERIFY_EMAIL
  createPassword --> enterPasscode: OTP
  createPassword --> done: DONE_REDIRECT
  createPassword --> enterEmail: BACK

  verifyEmailWithMagicLink --> missingInfo: SKIP_VERIFY
  enterPasscode --> missingInfo: CONTINUE
  enterPasscode --> done: DONE_REDIRECT

  missingInfo --> accountBlocked: INELIGIBLE
  missingInfo --> done: DONE_REDIRECT
  done --> [*]`;

const loginMachinePagesDiagram = String.raw`flowchart LR
  EE["enterEmail"] --> PWL["passwordlessLogin<br/>(OTP email code)"]
  EE --> EP["enterPassword"]
  PWL --> PC["enterPasscode"]
  EE --> RL["rateLimited"]
  EP --> CP["changePassword"]
  EE --> AB["accountBlocked"]
  PC --> MIL["missingInfoLogin"]
  EP --> MIL
  PK["passkey (V5 SDK callback page)"] --> LOAD["/identity/loading"]
  PC --> LOAD
  EP --> LOAD
  MIL --> LOAD`;

const subscriberAgreementDiagram = String.raw`flowchart TD
  BILL["/commerce/billing renders"] --> Q1{"DOB on profile?"}
  Q1 -->|"no"| DOB["/identity/sign-up/missing-info"]
  Q1 -->|"yes"| Q2{"eligibleForOnboarding<br/>&& !isOnboarded?"}
  Q2 -->|"yes"| RAA["/identity/review-and-accept<br/>(marketing opt-in)"]
  Q2 -->|"no"| Q3{"forced-SA region (remote config)<br/>OR legal doc requiresActiveReview?"}
  Q3 -->|"yes"| SA["/identity/subscriber-agreement"]
  Q3 -->|"no"| STAY["stay on billing"]
  SA --> CLICK["Agree & Continue click"]
  CLICK --> Q4{"activation / redemption /<br/>extra-member flow?"}
  Q4 -->|"yes"| LOAD["/identity/loading"]
  Q4 -->|"no"| REF["startRedirect: referrer atom,<br/>falls back to /commerce/billing"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "page-map", title: "The Page Map (With Real Traffic)", level: 2 },
  { id: "two-stacks", title: "Two Implementations: Edna vs Identity V5 SDK", level: 2 },
  { id: "signup-machine", title: "The Create-Account Machine", level: 2 },
  { id: "email-branch", title: "The Enter-Email Branch Point", level: 3 },
  { id: "login-machine", title: "The Login Machine & Passwordless", level: 2 },
  { id: "license-plate", title: "License-Plate Flows (TV Devices)", level: 2 },
  { id: "post-auth", title: "Post-Auth Routing: /identity/loading", level: 2 },
  { id: "onboarding-guards", title: "Onboarding Guards on Billing", level: 2 },
  { id: "subscriber-agreement", title: "Deep Dive: Subscriber Agreement", level: 3 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function SignupAuthFlow() {
  return (
    <div className="article-content">
      <p>
        Sign-up looks like one funnel from the outside, but on the web it is a graph: two entry
        products (web and TV license-plate), two parallel implementations (the in-repo
        &quot;edna&quot; flows and the hosted Identity V5 SDK), two XState machines (create-account
        and login) that hand users to each other, a post-auth routing hub, and a set of onboarding
        guard pages that only some markets ever see. This module traces every branch using the real
        Disney+ routes, machines, and hooks — so when a ticket says &quot;the consent page&quot; or
        &quot;the passcode screen&quot;, you know exactly which node of the graph it means.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        Almost every growth experiment, monitoring dashboard, and identity bug report references
        one of these pages. Reading a funnel drop correctly requires knowing the graph: a
        &quot;loss&quot; between enter-email and create-password includes users who were{" "}
        <em>diverted to login</em> because their email already existed — not just abandonment.
        Similarly, the subscriber-agreement page is regional: most markets never render it, so a
        US-filtered query against it returns near-zero and looks like an outage when it is not.
      </p>

      <h2 id="page-map">The Page Map (With Real Traffic)</h2>
      <p>
        All identity pages live under <code>apps/commerce/disneyPlus/pages/identity/</code> as thin
        Next.js wrappers that re-export feature components from{" "}
        <code>@solo/commerce-base/src/identity/*</code>. The table below shows real production RUM
        page-view counts for a 2-day window (Aug 17–19, 2026,{" "}
        <code>service:web-solo-commerce-disneyplus env:prod</code>) — the relative sizes tell you
        instantly which pages are shared hubs and which are niche branches.
      </p>
      <ArticleTable
        caption="Production page views over 2 days. Note that login dwarfs sign-up, and /identity/loading sees nearly every authenticated user."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Views (2d)</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>/identity/login/enter-email</code></td>
              <td>1,920,646</td>
              <td>Login entry (also receives sign-up diverts)</td>
            </tr>
            <tr>
              <td><code>/identity/loading</code></td>
              <td>1,920,465</td>
              <td>Post-auth routing hub</td>
            </tr>
            <tr>
              <td><code>/identity/begin</code></td>
              <td>1,613,761</td>
              <td>TV license-plate login</td>
            </tr>
            <tr>
              <td><code>/identity/start</code></td>
              <td>1,271,299</td>
              <td>TV license-plate create-account</td>
            </tr>
            <tr>
              <td><code>/identity/login/passwordless</code></td>
              <td>1,231,587</td>
              <td>OTP-first login (experiment at 100%)</td>
            </tr>
            <tr>
              <td><code>/identity/login/enter-passcode</code></td>
              <td>879,008</td>
              <td>OTP code entry</td>
            </tr>
            <tr>
              <td><code>/identity/login/enter-password</code></td>
              <td>630,904</td>
              <td>Classic password login</td>
            </tr>
            <tr>
              <td><code>/identity/sign-up/enter-email</code></td>
              <td>132,570</td>
              <td>Sign-up entry</td>
            </tr>
            <tr>
              <td><code>/identity/subscriber-agreement</code></td>
              <td>112,312</td>
              <td>Forced SA review (regional — ~0.4% US)</td>
            </tr>
            <tr>
              <td><code>/identity/sign-up/create-password</code></td>
              <td>95,314</td>
              <td>New-account password creation</td>
            </tr>
            <tr>
              <td><code>/identity/magic</code></td>
              <td>57,469</td>
              <td>Magic-link landing</td>
            </tr>
            <tr>
              <td><code>/identity/review-and-accept</code></td>
              <td>14,635</td>
              <td>Marketing opt-in onboarding</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <MermaidDiagram
        chart={bigPictureDiagram}
        title="The Full Sign-Up & Auth Graph"
        caption="Notice the two funnels (web sign-up vs TV license-plate) converging on /identity/loading, and the guard loop that bounces users between billing and the onboarding pages."
        minHeight={620}
      />

      <h2 id="two-stacks">Two Implementations: Edna vs Identity V5 SDK</h2>
      <p>
        Before any machine runs, <code>SignUpWrapper</code> (in{" "}
        <code>commerce-base/src/identity/sign-up/pages/sign-up-wrapper-page.tsx</code>) decides
        which of two stacks handles the user. The legacy in-repo flows are code-named{" "}
        <strong>edna</strong>. The replacement is the hosted{" "}
        <strong>Identity V5 SDK</strong> (config code-name <em>Sparrow</em>): an OAuth-style
        launch that leaves the page, runs the flow on hosted identity UI, and returns via the{" "}
        <code>/identity/login/passkey</code> callback page, which forwards preserved query params
        to <code>/identity/loading</code>.
      </p>
      <CodeBlock
        code={`// sign-up-wrapper-page.tsx (abridged)
const isMystiqueLoginEnabled =
  mystiqueFlags?.['wpnx-web-identity-v5-sdk-signup-enabled'] === true;

const shouldLaunchIdentitySDK = useLaunchIdentityFlow(
  sparrowFlowGatingConfig,   // remote config: enabled + rolloutPercentage
  isMystiqueLoginEnabled,    // feature flag
  isIdentitySDKEnabledApp    // app-level atom
);

identitySDK?.launchIdentityFlow().catch((error) => {
  datadogRum.addError(new Error('IDENTITY V5 SDK – LAUNCH IDENTITY FLOW ERROR'), ...);
  setHasLaunchError(true);   // fall back to edna flows
});`}
        lang="typescript"
        filename="packages/cgi/commerce-base/src/identity/sign-up/pages/sign-up-wrapper-page.tsx"
      />
      <p>
        Three gates must all pass — remote config rollout, the Mystique flag, and the app-level
        enablement atom — and even then a launch error silently degrades to edna. When you debug
        &quot;why did this user see the old screens?&quot;, check all three gates plus the RUM
        action <code>launch_identity_flow_started</code>.
      </p>

      <h2 id="signup-machine">The Create-Account Machine</h2>
      <p>
        The edna sign-up flow is an XState machine in{" "}
        <code>packages/identity-auth/src/features/create-account/create-account-machine/</code>.
        Each state assigns a <code>pageName</code> (used for analytics page views) and a{" "}
        <code>stateGlobalizedPathname</code>, then calls an <code>updateURL</code> action — so the
        URL is a <em>projection of machine state</em>, not the source of truth. Browser
        back/forward fires a <code>RESET</code> event carrying an <code>intendedState</code>, and
        the <code>start</code> state re-resolves where the user is allowed to be via guards.
      </p>
      <MermaidDiagram
        chart={createAccountMachineDiagram}
        title="create-account Machine States"
        caption="Every arrow is a typed event. Note the three exits from createPassword (plain continue, magic-link verify, OTP) all converging on missingInfo, and INELIGIBLE routing to accountBlocked."
        minHeight={520}
      />
      <CodeBlock
        code={`// The guard resolution order in the 'start' state — blocking logic first:
always: [
  { target: 'accountBlocked', cond: 'intendedAccountBlockedScreen' },
  { target: 'enterPasscode', cond: 'intendedEnterPasscodeScreen' },
  { target: 'enterEmail', cond: 'intendedEmailScreen' },
  { target: 'enterEmail', cond: 'needsEmail' },
  { target: 'enterEmail', cond: 'needsEmailCheck' },
  { target: 'createPassword', cond: 'intendedPasswordScreen' },
  { target: 'missingInfo', cond: 'hasRegistered' },
],`}
        lang="typescript"
        filename="packages/identity-auth/src/features/create-account/create-account-machine/create-account-machine.ts"
      />
      <p>
        The <code>missingInfo</code> state collects the date of birth (and any other required
        personal info). Its <code>INELIGIBLE</code> event exists because DOB collection doubles as
        an age gate — an underage user transitions to <code>accountBlocked</code>, which is a dead
        end by design.
      </p>

      <h3 id="email-branch">The Enter-Email Branch Point</h3>
      <p>
        <code>enterEmail</code> runs a &quot;check&quot; query against the identity backend. The
        result populates <code>email.canRegister</code>: <code>true</code> means the backend
        offered the <em>Register</em> operation (fresh email → proceed to{" "}
        <code>createPassword</code>); anything else means the account already exists and the
        feature redirects the user to the <em>login</em> flow. This is the single most important
        fact for reading sign-up funnels: step-2 &quot;loss&quot; is partly successful login
        diverts. The state also hosts two modals — <code>emailConfirmation</code> and{" "}
        <code>emailErrorReduction</code> (the typo-catching experiment{" "}
        <code>wpnx-web-identity-email-error-reduction</code>, rolled out at 100%).
      </p>

      <h2 id="login-machine">The Login Machine & Passwordless</h2>
      <p>
        The login flow has its own machine (<code>features/login/state-machine/login-machine.ts</code>)
        with eight page states: <code>enterEmail</code>, <code>passwordlessLogin</code>,{" "}
        <code>enterPasscode</code>, <code>enterPassword</code>, <code>changePassword</code>,{" "}
        <code>missingInfoLogin</code>, <code>rateLimited</code>, and <code>accountBlocked</code>.
        In production, the passwordless experiment (<code>WithOptOutButton</code> variant at 100%)
        makes OTP-by-email the default path — which is why{" "}
        <code>/identity/login/enter-passcode</code> outranks{" "}
        <code>/identity/login/enter-password</code> in traffic. A separate{" "}
        <code>passkey.page.tsx</code> exists outside the machine: it is the V5 SDK&apos;s return
        callback, not an edna state.
      </p>
      <MermaidDiagram
        chart={loginMachinePagesDiagram}
        title="Login Pages and Their Handoffs"
        caption="OTP (passwordless → enter-passcode) is the mainstream path; enter-password is the fallback. All successful exits funnel into /identity/loading."
        minHeight={380}
      />

      <h2 id="license-plate">License-Plate Flows (TV Devices)</h2>
      <p>
        TV and console apps cannot render this web flow, so they show an activation code and send
        the user to the web: <code>/identity/begin</code> (login variant) and{" "}
        <code>/identity/start</code> (create-account variant), both gated by{" "}
        <code>enableIdentityUnifiedLicensePlateFlow</code>. Each has a small dedicated machine
        (<code>features/license-plate/state-machines/</code>) with three page states —{" "}
        <code>licensePlateLogin</code>/<code>licensePlateCreateAccount</code>,{" "}
        <code>confirmPassword</code>, and <code>enterPasscode</code>. Combined they carry{" "}
        <em>more traffic than the entire web sign-up flow</em> (2.9M vs 133k views per 2 days) —
        remember that when a &quot;sign-up&quot; incident is reported: ask which surface.
      </p>

      <h2 id="post-auth">Post-Auth Routing: /identity/loading</h2>
      <p>
        After any successful auth, the user lands on <code>/identity/loading</code> — a page that
        renders nothing and exists purely to run <code>useNavigationRedirect()</code>. The hook
        evaluates an ordered array of handlers; the first one that claims the user wins. Order is
        load-bearing and documented in the source:
      </p>
      <CodeBlock
        code={`export const orderedNavigationRedirectHandlers: Array<NavigationRedirectHandler> = [
  oAuthRedirectHandler,
  marketingPreferencesRedirectHandler,
  subscriberAgreementRedirectHandler,
  consumeAndTransferRedirectHandler,
  ednaRedemptionByCodeRedirectHandler,
  ednaActivationRedirectHandler,
  licensePlateFlowRedirectHandler,
  addOnsExperimentRedirectHandler,
  referrerRedirectHandler,        // returns user to a stashed anchor (e.g. billing)
  entitledUserRedirectHandler,    // already-paying user -> app
  skipWelcomeBackExperimentHandler,
  defaultRedirectHandler,         // fallback
];`}
        lang="typescript"
        filename="packages/cgi/commerce-base/src/common/hooks/use-navigation-redirect.tsx"
      />
      <p>
        Redirect targets are validated against an internal route allowlist before navigation —
        anything that parses as an absolute URL is rejected and reported to Datadog as potential
        redirect tampering. The <code>wpnx-web-identity-remove-loading-page</code> flag is
        gradually replacing some hops through this page with direct{" "}
        <code>startRedirect</code> calls, so expect its traffic share to change over time.
      </p>

      <h2 id="onboarding-guards">Onboarding Guards on Billing</h2>
      <p>
        Reaching <code>/commerce/billing</code> does not mean the user checks out immediately.
        <code>useBillingRedirects()</code> (in <code>commerce-base/src/signup/lib/</code>) runs
        three guards in a fixed sequence, each bouncing the user to an identity page and back:
      </p>
      <MermaidDiagram
        chart={subscriberAgreementDiagram}
        title="Billing Guard Sequence and the Subscriber Agreement Loop"
        caption="Guards run in order: DOB, then marketing opt-in, then subscriber agreement. The SA page stashes /commerce/billing as the referrer before redirecting, so Agree & Continue returns the user to checkout."
        minHeight={520}
      />
      <ArticleTable caption="The three billing guards." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Guard</th>
              <th>Condition (from real selectors)</th>
              <th>Redirect target</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>DOB</td>
              <td>
                <code>isDOBCollectionRequired(personalInfo)</code> — profile has no date of birth
              </td>
              <td><code>/identity/sign-up/missing-info</code></td>
            </tr>
            <tr>
              <td>Review &amp; Accept</td>
              <td>
                <code>eligibleForOnboarding && !isOnboarded</code> from marketing preferences
              </td>
              <td><code>/identity/review-and-accept</code></td>
            </tr>
            <tr>
              <td>Subscriber Agreement</td>
              <td>
                Forced-SA region (remote config <code>requiresForcedSubscriberAgreement</code>) OR
                any legal document with <code>requiresActiveReview</code>
              </td>
              <td><code>/identity/subscriber-agreement</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="subscriber-agreement">Deep Dive: Subscriber Agreement</h3>
      <p>
        The SA page is the clearest example of a <em>regional</em> flow node. The deciding
        selector lives in <code>identity-auth/src/common/selectors/forced-subscriber-review-selector.ts</code>:
      </p>
      <CodeBlock
        code={`const isSubscriberAgreementRequired = ({
  isInForcedSubscriberAgreementRegion,  // remote config, per region
  isSubscriberReviewComplete,           // Jotai atom, set after Agree & Continue
  meQueryResponse,                      // legal documents from the me query
}) => {
  const isReviewRequired = !!meQueryResponse?.me.documents?.legal.find(
    (item) => !!item.requiresActiveReview
  );
  return (
    !isSubscriberReviewComplete &&
    (isInForcedSubscriberAgreementRegion || isReviewRequired)
  );
};`}
        lang="typescript"
        filename="packages/identity-auth/src/common/selectors/forced-subscriber-review-selector.ts"
      />
      <p>
        Because the forced-region config is only enabled in certain markets, production traffic to
        this page is dominated by LATAM and EMEA (Brazil ~18%, Mexico ~12%, Germany ~9% of views)
        while the United States contributes roughly 0.4% — the US never forces the standalone
        review; American users only see SA language inline as legalese. On accept, the page fires
        an interaction metric, flips the <code>isSAReviewComplete</code> atom, and redirects:
        activation, redemption-code, and extra-member flows go to <code>/identity/loading</code>;
        everyone else goes through <code>startRedirect</code>, which honors the stashed referrer
        and defaults to <code>/commerce/billing</code>. The page itself requires login and is
        route-gated by <code>enableIdentityReviewAndAcceptRoute</code>.
      </p>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Identity pages are thin wrappers; the real flow logic lives in{" "}
          <code>@solo/commerce-base/src/identity/*</code> and the XState machines in{" "}
          <code>@solo/identity-auth</code>.
        </li>
        <li>
          Two stacks coexist: legacy <strong>edna</strong> machines and the hosted{" "}
          <strong>Identity V5 SDK (Sparrow)</strong>, triple-gated by remote config, a Mystique
          flag, and an app atom — with silent fallback to edna on launch errors.
        </li>
        <li>
          Enter-email is a branch point, not a step: existing emails divert to the login flow, so
          sign-up funnel &quot;drop-off&quot; between email and password overstates abandonment.
        </li>
        <li>
          <code>/identity/loading</code> is the post-auth hub; routing is an ordered handler chain
          where the referrer atom and entitlement checks decide between checkout and the app.
        </li>
        <li>
          Billing bounces users through up to three onboarding guards in order — DOB, marketing
          opt-in (review-and-accept), and subscriber agreement — each a separate identity page.
        </li>
        <li>
          The subscriber-agreement page is regional by remote config: LATAM/EMEA-heavy, ~0.4% US
          traffic. Always anchor queries and dashboards for it on a market that actually renders
          it (e.g. Brazil).
        </li>
        <li>
          TV license-plate flows (<code>/identity/begin</code>, <code>/identity/start</code>)
          carry more traffic than web sign-up — always confirm which surface an incident is about.
        </li>
      </ul>
    </div>
  );
}
