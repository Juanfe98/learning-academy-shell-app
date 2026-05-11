import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const paymentFlowDiagram = String.raw`sequenceDiagram
    participant U as User (Browser)
    participant C as Client (React)
    participant RH as Route Handler (Server)
    participant S as Stripe
    participant DB as Your Database
    participant WH as Webhook Handler

    U->>C: Clicks "Pay $49"
    C->>RH: POST /api/create-payment-intent { amount: 49 }
    RH->>S: stripe.paymentIntents.create({ amount: 4900, currency: 'usd' })
    S-->>RH: { clientSecret: 'pi_xxx_secret_yyy' }
    RH-->>C: { clientSecret }
    C->>S: stripe.confirmPayment({ elements, clientSecret })
    Note over C,S: Card never touches your server — PCI compliance
    S-->>C: Redirect to /payment-success
    S->>WH: POST /api/stripe-webhook (payment_intent.succeeded)
    WH->>WH: Verify Stripe-Signature header
    WH->>DB: UPDATE orders SET status='paid' WHERE stripe_pi_id='pi_xxx'
    WH-->>S: 200 OK { received: true }`;

const subscriptionLifecycleDiagram = String.raw`flowchart TD
    START["User clicks 'Upgrade to Pro'"]
    CS["stripe.checkout.sessions.create\n(mode: 'subscription')"]
    REDIRECT["Redirect user to session.url\n(Stripe-hosted checkout page)"]
    SUB_CREATED["Webhook: customer.subscription.created\n→ set user.plan = 'pro' in DB"]
    ACTIVE["Subscription: active\n(monthly billing active)"]
    INVOICE["Webhook: invoice.created\n(generated before each renewal)"]
    PAID["Webhook: invoice.payment_succeeded\n(renewal successful)"]
    FAILED["Webhook: invoice.payment_failed\n(card declined)"]
    DUNNING["Stripe dunning emails sent\n(1 day, 3 days, 7 days)"]
    CANCELED["Webhook: customer.subscription.deleted\n→ set user.plan = 'free' in DB"]

    START --> CS --> REDIRECT --> SUB_CREATED --> ACTIVE
    ACTIVE --> INVOICE --> PAID --> ACTIVE
    INVOICE --> FAILED --> DUNNING
    DUNNING -->|"payment recovered"| PAID
    DUNNING -->|"all retries exhausted"| CANCELED`;

export const toc: TocItem[] = [
  { id: "stripe-mental-model", title: "Stripe Mental Model", level: 2 },
  { id: "stripe-objects", title: "Core Stripe Objects", level: 3 },
  { id: "stripe-nextjs-setup", title: "Setup & Environment Variables", level: 2 },
  { id: "stripe-elements", title: "Stripe Elements: The Frontend Layer", level: 2 },
  { id: "payment-intent-flow", title: "PaymentIntent Flow", level: 2 },
  { id: "route-handler-pattern", title: "Route Handler: Creating a PaymentIntent", level: 3 },
  { id: "checkout-form", title: "Checkout Form with Elements", level: 3 },
  { id: "webhooks", title: "Webhooks: The Async Truth", level: 2 },
  { id: "webhook-handler", title: "Webhook Route Handler", level: 3 },
  { id: "subscriptions", title: "Subscriptions & Checkout Sessions", level: 2 },
  { id: "stripe-checkout-session", title: "Stripe Checkout Session", level: 3 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function StripeIntegration() {
  return (
    <div className="article-content">
      <p>
        Stripe is not in the Indeed job description, but any senior frontend engineer working at
        a product company will encounter payment integration. Understanding how Stripe works —
        really works, not just the happy path — is the kind of depth that differentiates
        senior candidates. This module is implementation-focused: the actual code, the actual
        patterns, and the mistakes that come up in code reviews.
      </p>

      <h2 id="stripe-mental-model">Stripe Mental Model</h2>
      <p>
        The core insight of Stripe is that your server <strong>never sees raw card data</strong>.
        The browser sends card numbers directly to Stripe's servers (via Stripe.js), and Stripe
        returns a token or a PaymentMethod ID. Your server only ever handles those opaque IDs.
        This is how Stripe gives you PCI compliance out of the box — you are out of PCI scope
        because you are not handling cardholder data.
      </p>
      <p>
        The second key insight: the payment confirmation on the client and the payment completion
        on your server are <strong>two separate events</strong>. The client redirect to your
        success page happens via Stripe.js, but your backend should not trust that redirect alone.
        Webhooks are the authoritative signal — Stripe calls your webhook endpoint asynchronously
        after the payment completes. Your database update, fulfillment logic, and email sending
        must happen in the webhook handler, not the success page.
      </p>

      <h3 id="stripe-objects">Core Stripe Objects</h3>
      <ArticleTable
        caption="The seven Stripe objects every engineer needs to know. Understanding these relationships before writing code prevents architecture mistakes."
        minWidth={900}
      >
        <table>
          <thead>
            <tr>
              <th>Object</th>
              <th>What It Represents</th>
              <th>When Created</th>
              <th>Key Fields</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>Customer</code></td>
              <td>A user in Stripe's system — links to payment methods, subscriptions, invoices</td>
              <td>When user signs up or first pays; reused across payments</td>
              <td><code>id</code>, <code>email</code>, <code>metadata</code></td>
            </tr>
            <tr>
              <td><code>Product</code></td>
              <td>What you are selling (e.g. "Pro Plan")</td>
              <td>Created in Stripe dashboard or via API at product launch</td>
              <td><code>id</code>, <code>name</code>, <code>description</code></td>
            </tr>
            <tr>
              <td><code>Price</code></td>
              <td>The billing details of a product (amount, currency, recurring interval)</td>
              <td>Created per pricing tier; a product can have many prices</td>
              <td><code>id</code>, <code>unit_amount</code>, <code>currency</code>, <code>recurring</code></td>
            </tr>
            <tr>
              <td><code>PaymentIntent</code></td>
              <td>A single payment attempt for a specific amount</td>
              <td>Your server creates it; client confirms it</td>
              <td><code>client_secret</code>, <code>amount</code>, <code>status</code></td>
            </tr>
            <tr>
              <td><code>Subscription</code></td>
              <td>A recurring billing relationship between a customer and a price</td>
              <td>Created by Stripe after a successful checkout session</td>
              <td><code>status</code>, <code>current_period_end</code>, <code>customer</code></td>
            </tr>
            <tr>
              <td><code>Invoice</code></td>
              <td>A bill generated automatically for each subscription renewal period</td>
              <td>Stripe creates automatically on subscription creation and renewal</td>
              <td><code>status</code>, <code>amount_due</code>, <code>payment_intent</code></td>
            </tr>
            <tr>
              <td><code>Webhook Event</code></td>
              <td>An asynchronous notification from Stripe about a state change</td>
              <td>Stripe sends these — you cannot create them</td>
              <td><code>type</code>, <code>data.object</code>, <code>livemode</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="stripe-nextjs-setup">Setup & Environment Variables</h2>
      <p>
        Stripe has three separate npm packages, each with a distinct role. Getting their
        usage right is the first thing reviewers check.
      </p>

      <pre>
        <code>{`# Install all three
pnpm add stripe @stripe/stripe-js @stripe/react-stripe-js

# stripe              — server-side Node.js SDK (never import on client)
# @stripe/stripe-js   — loads Stripe.js on the client (the iframe that handles card input)
# @stripe/react-stripe-js — React components: <Elements>, <PaymentElement>, useStripe(), useElements()
`}</code>
      </pre>

      <pre>
        <code>{`# .env.local
STRIPE_SECRET_KEY=sk_test_...         # server only — NEVER add NEXT_PUBLIC_ prefix
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # safe to expose to browser
STRIPE_WEBHOOK_SECRET=whsec_...       # for verifying webhook signatures — server only

# In production:
# STRIPE_SECRET_KEY=sk_live_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...     (different secret for live endpoint)
`}</code>
      </pre>

      <pre>
        <code>{`// lib/stripe.ts — singleton server-side client
import Stripe from 'stripe'

// Singleton pattern: Next.js hot reload creates new module instances in dev.
// Using a global prevents creating a new Stripe instance on every hot reload.
const globalForStripe = globalThis as unknown as { stripe: Stripe | undefined }

export const stripe =
  globalForStripe.stripe ??
  new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-03-31.basil', // pin the API version — Stripe changes APIs with notice
    typescript: true,
  })

if (process.env.NODE_ENV !== 'production') globalForStripe.stripe = stripe
`}</code>
      </pre>

      <h2 id="stripe-elements">Stripe Elements: The Frontend Layer</h2>
      <p>
        Stripe Elements is a set of pre-built UI components that render inside iframes hosted by
        Stripe. Your JavaScript code never has direct access to the raw card number — it interacts
        with a Stripe-hosted iframe. <code>loadStripe()</code> loads Stripe.js and returns a
        Promise that resolves to the Stripe object. This must be called outside of any component
        to avoid reloading Stripe.js on re-renders.
      </p>

      <pre>
        <code>{`// lib/stripe-client.ts — only import this in client components
import { loadStripe } from '@stripe/stripe-js'

// Call loadStripe ONCE at the module level, not inside a component
// This ensures the Stripe iframe is loaded before the user needs it
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)
`}</code>
      </pre>

      <p>
        The <code>Elements</code> provider from <code>@stripe/react-stripe-js</code> takes the
        Stripe promise and the <code>clientSecret</code> from your server. The{" "}
        <code>PaymentElement</code> component (the newer, recommended option) renders a single
        input that handles 40+ payment methods automatically — cards, Apple Pay, Google Pay,
        SEPA, iDEAL, and more — based on the customer's browser and region.
      </p>

      <h2 id="payment-intent-flow">PaymentIntent Flow</h2>

      <MermaidDiagram
        chart={paymentFlowDiagram}
        title="One-Time Payment Flow (PaymentIntent)"
        caption="The client never creates a PaymentIntent — only your server does. The clientSecret is the bridge: your server creates the PaymentIntent and returns the clientSecret, the client uses it to confirm the payment with Stripe. Stripe's webhook is the authoritative completion signal — not the redirect."
        minHeight={560}
      />

      <h3 id="route-handler-pattern">Route Handler: Creating a PaymentIntent</h3>
      <p>
        The server-side Route Handler creates the PaymentIntent. This is where your secret key
        lives. The only thing you return to the client is the <code>clientSecret</code> — the
        PaymentIntent ID, amount, and all other sensitive data stays on the server.
      </p>

      <pre>
        <code>{`// app/api/create-payment-intent/route.ts
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'usd', metadata = {} } = await request.json()

    // Validate amount — Stripe uses the smallest currency unit (cents for USD)
    // Never trust the amount from the client in a real app — look it up from your DB
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),  // $49.00 → 4900 cents
      currency,
      automatic_payment_methods: {
        enabled: true,  // enables 40+ payment methods automatically
      },
      metadata,  // useful for mapping back to your DB records in the webhook
    })

    // ONLY return clientSecret — not the full PaymentIntent object
    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
`}</code>
      </pre>

      <h3 id="checkout-form">Checkout Form with Elements</h3>

      <pre>
        <code>{`// components/CheckoutPage.tsx
'use client'
import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Outer component: fetches clientSecret from server, wraps form in Elements
export function CheckoutPage({ amount }: { amount: number }) {
  const [clientSecret, setClientSecret] = useState<string>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to initialize payment')
        return r.json()
      })
      .then(({ clientSecret }) => setClientSecret(clientSecret))
      .catch((e) => setError(e.message))
  }, [amount])

  if (error) return <p role="alert">Error: {error}</p>
  if (!clientSecret) return <p>Loading payment form...</p>

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',  // matches dark UI
          variables: { colorPrimary: '#6366f1' },
        },
      }}
    >
      <CheckoutForm />
    </Elements>
  )
}

// Inner component: the actual form — must be inside <Elements>
function CheckoutForm() {
  const stripe = useStripe()    // null until Stripe.js loads
  const elements = useElements() // null until Elements mounts
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Both hooks can be null on first render — always guard
    if (!stripe || !elements) return

    setLoading(true)
    setError(undefined)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: \`\${window.location.origin}/payment-success\`,
      },
      // redirect: 'if_required' — for payment methods that don't need redirect
    })

    // If confirmPayment resolves (not redirected), an error occurred
    if (error) {
      setError(error.message ?? 'Payment failed')
      setLoading(false)
    }
    // If payment succeeded, Stripe redirects to return_url — code below never runs
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && (
        <p role="alert" style={{ color: 'var(--error)', marginTop: '0.5rem' }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        style={{ marginTop: '1rem' }}
      >
        {loading ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  )
}
`}</code>
      </pre>

      <h2 id="webhooks">Webhooks: The Async Truth</h2>
      <p>
        This is the most misunderstood part of Stripe integration. When <code>confirmPayment</code>{" "}
        redirects the user to your success page, the payment may or may not have completed yet —
        especially for bank transfers, 3DS auth, or delayed notification payment methods. Never
        update your database from the success page redirect. Always use webhooks.
      </p>
      <p>
        Stripe sends webhook events to your endpoint asynchronously. You must:
      </p>
      <ol>
        <li>
          <strong>Verify the signature.</strong> Anyone can POST to your webhook endpoint. Use{" "}
          <code>stripe.webhooks.constructEvent()</code> with your webhook signing secret to verify
          the request is genuinely from Stripe.
        </li>
        <li>
          <strong>Use raw body.</strong> Signature verification uses the raw request body. If you
          parse the body as JSON first, the whitespace normalization breaks the signature check.
          In Next.js Route Handlers, use <code>request.text()</code>, not{" "}
          <code>request.json()</code>.
        </li>
        <li>
          <strong>Respond quickly.</strong> Stripe expects a 200 response within 30 seconds. If
          your webhook handler is slow, Stripe retries. Make your handler fast and do heavy work
          asynchronously.
        </li>
        <li>
          <strong>Handle duplicates.</strong> Stripe may deliver the same event more than once.
          Your handler must be idempotent — use the event ID or the PaymentIntent ID to check
          if you have already processed it.
        </li>
      </ol>

      <h3 id="webhook-handler">Webhook Route Handler</h3>

      <pre>
        <code>{`// app/api/stripe-webhook/route.ts
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { db } from '@/lib/db'  // your database client

export async function POST(request: NextRequest) {
  // 1. Read raw body — do NOT use request.json()
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  // 2. Verify the signature — throws if invalid
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // 3. Handle events — use a switch for type safety
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        await db.orders.update({
          where: { stripePaymentIntentId: pi.id },
          data: { status: 'paid', paidAt: new Date() },
        })
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const reason = pi.last_payment_error?.message ?? 'Unknown reason'
        await db.orders.update({
          where: { stripePaymentIntentId: pi.id },
          data: { status: 'failed', failureReason: reason },
        })
        // Consider sending a payment failure email here
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        await db.users.update({
          where: { stripeCustomerId: customerId },
          data: {
            plan: sub.status === 'active' ? 'pro' : 'free',
            subscriptionId: sub.id,
            subscriptionStatus: sub.status,
          },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await db.users.update({
          where: { stripeCustomerId: sub.customer as string },
          data: { plan: 'free', subscriptionId: null, subscriptionStatus: 'canceled' },
        })
        break
      }

      case 'invoice.payment_failed': {
        // Stripe will retry automatically (dunning)
        // You may want to send a "payment failed" email here
        const invoice = event.data.object as Stripe.Invoice
        console.warn('Invoice payment failed:', invoice.id)
        break
      }

      default:
        // Unknown events — safe to ignore but log for observability
        console.log(\`Unhandled Stripe event type: \${event.type}\`)
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    // Return 500 so Stripe retries this event
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  // 4. Return 200 to acknowledge receipt
  return NextResponse.json({ received: true })
}
`}</code>
      </pre>

      <h2 id="subscriptions">Subscriptions & Checkout Sessions</h2>

      <MermaidDiagram
        chart={subscriptionLifecycleDiagram}
        title="Subscription Lifecycle"
        caption="Every state change in the subscription lifecycle fires a webhook. The customer.subscription.deleted event is when you should downgrade the user — not when they click cancel on your UI (which might just schedule cancellation at period end)."
        minHeight={580}
      />

      <h3 id="stripe-checkout-session">Stripe Checkout Session</h3>
      <p>
        Stripe Checkout is a Stripe-hosted payment page. Instead of building your own form with
        Elements, you redirect the user to a Stripe-hosted URL. It handles the full checkout UI
        including address collection, tax, and coupon codes. It is the fastest way to add payments
        and requires no frontend Stripe integration beyond a redirect.
      </p>

      <pre>
        <code>{`// app/api/create-checkout/route.ts
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth' // your auth solution

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { priceId } = await request.json()

  // Create or retrieve the Stripe customer for this user
  let stripeCustomerId = session.user.stripeCustomerId

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { userId: session.user.id },
    })
    stripeCustomerId = customer.id
    // Persist the customerId so future payments use the same customer
    await db.users.update({
      where: { id: session.user.id },
      data: { stripeCustomerId },
    })
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',          // or 'payment' for one-time
    customer: stripeCustomerId,    // link to existing customer
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: \`\${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?upgraded=true\`,
    cancel_url: \`\${process.env.NEXT_PUBLIC_BASE_URL}/pricing\`,
    subscription_data: {
      metadata: { userId: session.user.id },  // available in subscription webhooks
    },
    allow_promotion_codes: true,   // let users apply coupon codes
  })

  return NextResponse.json({ url: checkoutSession.url })
}

// Client: redirect to Stripe Checkout
async function handleUpgrade(priceId: string) {
  const res = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  })
  const { url, error } = await res.json()
  if (error) { /* handle error */ return }
  window.location.href = url  // redirect to Stripe-hosted checkout
}
`}</code>
      </pre>

      <ArticleTable
        caption="Three ways to collect payment with Stripe — pick based on how much control vs speed-to-market you need."
        minWidth={880}
      >
        <table>
          <thead>
            <tr>
              <th>Approach</th>
              <th>Complexity</th>
              <th>Customization</th>
              <th>PCI Scope</th>
              <th>Best For</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Stripe Elements</strong></td>
              <td>Medium — you build the form, Stripe handles the iframe</td>
              <td>Full control of layout, branding, multi-step flows</td>
              <td>SAQ A (minimal) — card data in Stripe iframe</td>
              <td>Custom checkout experiences embedded in your UI</td>
            </tr>
            <tr>
              <td><strong>Stripe Checkout</strong></td>
              <td>Low — one API call + redirect</td>
              <td>Limited — logo, colors, product name. No custom fields.</td>
              <td>SAQ A (minimal) — full page hosted by Stripe</td>
              <td>Fast launch, subscriptions, B2B with invoices, tax collection</td>
            </tr>
            <tr>
              <td><strong>Payment Links</strong></td>
              <td>None — created in dashboard or API</td>
              <td>Very limited — Stripe UI only</td>
              <td>SAQ A (minimal) — full page hosted by Stripe</td>
              <td>No-code payments, one-off links, non-technical teams</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Secret key on the client.</strong> <code>STRIPE_SECRET_KEY</code> must never
          have the <code>NEXT_PUBLIC_</code> prefix. If it does, it ships to the browser and your
          Stripe account is compromised.
        </li>
        <li>
          <strong>Creating PaymentIntents on the client.</strong> The secret key is required to
          create a PaymentIntent. If you are calling Stripe from the client, you are either
          exposing your secret key or you have built something wrong.
        </li>
        <li>
          <strong>Amount in dollars instead of cents.</strong> Stripe uses the smallest currency
          unit. For USD: <code>amount: 4900</code> means $49.00. Passing <code>amount: 49</code>{" "}
          charges $0.49.
        </li>
        <li>
          <strong>Not verifying webhook signatures.</strong> Anyone can POST to your{" "}
          <code>/api/stripe-webhook</code> endpoint. Without{" "}
          <code>stripe.webhooks.constructEvent()</code>, an attacker can send fake events that
          trigger order fulfillment, plan upgrades, or data mutations.
        </li>
        <li>
          <strong>Parsing the webhook body as JSON before verification.</strong> Use{" "}
          <code>request.text()</code> (raw string) in the webhook handler. JSON parsing normalizes
          whitespace which breaks the HMAC signature.
        </li>
        <li>
          <strong>Trusting the success redirect instead of webhooks.</strong> Users can navigate
          directly to your success URL without paying. The webhook is the only reliable payment
          confirmation signal.
        </li>
        <li>
          <strong>Not handling <code>customer.subscription.deleted</code> vs{" "}
          <code>customer.subscription.updated</code>.</strong> A subscription can be{" "}
          <code>canceled</code> (still active until period end) or <code>deleted</code> (immediately
          deactivated). Downgrading the user too early (on <code>updated</code> to{" "}
          <code>cancel_at_period_end: true</code>) removes access while they still have paid days
          remaining.
        </li>
        <li>
          <strong>No idempotency keys for retried requests.</strong> If your server retries a
          PaymentIntent creation, without an idempotency key, you may create two charges. Use{" "}
          <code>stripe.paymentIntents.create({"{...}"}, {"{ idempotencyKey: uniqueId }"}</code>).
        </li>
      </ul>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How would you integrate Stripe payments into a Next.js application?"
        intro="Stripe integration questions test whether you understand the security model, the async nature of payments, and the full lifecycle — not just whether you can render a checkout form. Structure your answer to show you have done this in production, not just in tutorials."
        steps={[
          "Start with the security model: card data never touches your server. Stripe.js on the client sends card numbers directly to Stripe servers inside an iframe. Your server only sees PaymentIntent IDs and customer IDs. This is how Stripe gives you PCI compliance (SAQ A) without touching cardholder data.",
          "Explain the PaymentIntent flow: your server creates the PaymentIntent with the secret key and returns only the clientSecret to the client. The client uses the Elements provider and PaymentElement to render the card input, then calls stripe.confirmPayment() with the clientSecret. Stripe handles the payment and redirects to your return_url.",
          "Emphasize webhooks as the authoritative completion signal — not the redirect. Your success page should not update the database. The webhook handler (payment_intent.succeeded) is where fulfillment happens. Explain signature verification with request.text() and stripe.webhooks.constructEvent().",
          "For subscriptions: you would use Stripe Checkout (session.create with mode: 'subscription') for simplest integration, or build a custom Elements form for full control. Handle subscription lifecycle via webhooks: customer.subscription.created sets the plan, customer.subscription.deleted downgrades the user. invoice.payment_failed triggers dunning emails.",
          "Mention the operational concerns: amount in cents (Math.round(amount * 100)), idempotency keys for retried requests, and never exposing STRIPE_SECRET_KEY with a NEXT_PUBLIC_ prefix. These are the details that show production experience.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Build a Complete One-Time Payment Flow in Next.js"
        scenario={
          <span>
            You are adding a one-time payment feature to a Next.js App Router application. Users
            can purchase a course for $49. The payment flow must: (1) never expose your Stripe
            secret key to the browser, (2) use Stripe Elements for a custom checkout UI,
            (3) update your database only after confirmed payment via webhook.
          </span>
        }
        tasks={[
          "Write the Route Handler at POST /api/create-payment-intent that: validates the request, creates a PaymentIntent for $49.00 (in cents), enables automatic_payment_methods, and returns only the clientSecret. Handle errors with appropriate HTTP status codes.",
          "Write the CheckoutPage client component that: fetches the clientSecret from the Route Handler on mount, wraps the form in <Elements> with the correct options (clientSecret is required), and renders the CheckoutForm child component.",
          "Write the CheckoutForm client component that: uses useStripe() and useElements() hooks, calls stripe.confirmPayment() with a return_url on form submit, shows an error message if payment fails (confirmPayment resolves with an error object), and disables the submit button while loading.",
          "Write the webhook Route Handler at POST /api/stripe-webhook that: reads the raw body with request.text() (not request.json()), reads the Stripe-Signature header, verifies the signature with stripe.webhooks.constructEvent(), handles the payment_intent.succeeded event by updating the database, and returns 200 with { received: true }.",
        ]}
        pitfalls={[
          "Using request.json() in the webhook handler — this normalizes whitespace and breaks the HMAC signature verification. Always use request.text() in webhook handlers.",
          "Passing amount in dollars instead of cents — Math.round(amount * 100) is required. Passing 49 charges $0.49.",
          "Calling loadStripe() inside the component body — this reloads Stripe.js on every render. Call it once at the module level and pass the Promise to <Elements>.",
          "Checking if (!stripe) without also checking (!elements) before calling confirmPayment — both hooks return null until Stripe.js is loaded and the Elements tree is mounted.",
          "Updating the database from the success page redirect instead of the webhook — users can navigate to the success URL without completing payment. The webhook is the only trustworthy signal.",
        ]}
        signal="A strong answer uses Math.round(amount * 100) for the amount, calls loadStripe() outside the component, guards both stripe and elements before calling confirmPayment, uses request.text() in the webhook handler, and explicitly mentions that the success page should NOT update the database — only the webhook should. Bonus: mentions idempotency keys for production safety and the importance of returning 500 (not 200) when the handler fails so Stripe retries the event."
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Card data never touches your server. Stripe.js collects it inside a hosted iframe.
          Your server only handles PaymentIntent IDs, customer IDs, and webhook events.
          This is how Stripe gives you PCI compliance (SAQ A).
        </li>
        <li>
          The three npm packages have distinct roles: <code>stripe</code> is server-only,{" "}
          <code>@stripe/stripe-js</code> loads Stripe.js on the client,{" "}
          <code>@stripe/react-stripe-js</code> provides React components. Never import{" "}
          <code>stripe</code> in a client component.
        </li>
        <li>
          Amount is always in the smallest currency unit. For USD: multiply dollars by 100 and
          round. Stripe rejects non-integer amounts.
        </li>
        <li>
          Webhooks are the authoritative payment completion signal. Never fulfill orders from
          the success page redirect. Always verify the webhook signature using{" "}
          <code>stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)</code> with{" "}
          <code>request.text()</code> — not <code>request.json()</code>.
        </li>
        <li>
          For subscriptions, handle three webhooks: <code>customer.subscription.created</code>{" "}
          (grant access), <code>customer.subscription.deleted</code> (revoke access), and{" "}
          <code>invoice.payment_failed</code> (send dunning email). Use the{" "}
          <code>subscription.status</code> field — not just the event type — to determine the
          actual state.
        </li>
        <li>
          Stripe Checkout (redirect to Stripe-hosted page) is the fastest integration: one API
          call, no frontend Stripe code. Stripe Elements gives you full UI control but requires
          more work. Choose based on your product's UX requirements.
        </li>
      </ul>
    </div>
  );
}
