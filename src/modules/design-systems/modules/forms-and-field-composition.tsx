import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const fieldAnatomyDiagram = String.raw`flowchart TD
  FIELD["Field (wrapper)"] --> LABEL["Label (htmlFor / generated id)"]
  FIELD --> CONTROL["Control (Input / Select / Textarea)"]
  FIELD --> HINT["Hint / description<br/>(aria-describedby)"]
  FIELD --> ERROR["Error message<br/>(aria-describedby + aria-invalid + role=alert)"]
  LABEL -.->|"associates"| CONTROL
  HINT -.->|"describes"| CONTROL
  ERROR -.->|"describes when invalid"| CONTROL`;

const validationDiagram = String.raw`sequenceDiagram
  participant U as User
  participant F as Form
  participant V as Validator (zod)
  participant A as Assistive tech
  U->>F: blur / submit field
  F->>V: validate value
  V-->>F: { valid } or { error }
  alt invalid
    F->>F: set aria-invalid + error text
    F->>A: role=alert announces error
  else valid
    F->>F: clear error
  end`;

export const toc: TocItem[] = [
  { id: "forms-are-hard", title: "Why Forms Are the Real Test", level: 2 },
  { id: "field-anatomy", title: "The Anatomy of a Field", level: 2 },
  { id: "build-field", title: "Building an Accessible Field", level: 2 },
  { id: "controls", title: "The Control Atoms", level: 2 },
  { id: "form-association", title: "Form-Associated Custom Elements", level: 2 },
  { id: "validation", title: "Validation & Error Display", level: 2 },
  { id: "rhf", title: "Integrating with React Hook Form + Zod", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function FormsAndFieldComposition() {
  return (
    <div className="article-content">
      <p>
        Forms are where design systems are truly tested. A Button is easy; a fully accessible,
        validated, composable form field — label association, hints, error announcement, invalid
        state, integration with form libraries — is where most systems fall short and where the most
        production accessibility bugs live. This module builds the form layer end to end: an
        accessible <code>Field</code> wrapper, the control atoms, native form association, validation
        display, and integration with React Hook Form + Zod — all runnable.
      </p>

      <h2 id="forms-are-hard">Why Forms Are the Real Test</h2>
      <p>
        The hard part isn&rsquo;t styling an input — it&rsquo;s the <strong>relationships</strong>:
        the label must be programmatically tied to the control, the hint and error must be announced
        to screen readers via <code>aria-describedby</code>, the invalid state must set{" "}
        <code>aria-invalid</code>, and errors must be announced when they appear. Get the wiring
        wrong and the form looks fine but is unusable with a screen reader. The system&rsquo;s job is
        to encapsulate all that wiring so product teams can&rsquo;t get it wrong.
      </p>

      <h2 id="field-anatomy">The Anatomy of a Field</h2>
      <MermaidDiagram
        chart={fieldAnatomyDiagram}
        title="A field is a wired-together cluster"
        caption="Label, control, hint, and error are bound by id references so assistive tech announces the right relationships."
        minHeight={380}
      />

      <h2 id="build-field">Building an Accessible Field</h2>
      <p>
        The cornerstone is a <code>Field</code> that generates ids and wires the ARIA relationships
        once, via context, so any control placed inside inherits correct associations. Here&rsquo;s a
        complete implementation using React&rsquo;s <code>useId</code>:
      </p>

      <CodeBlock
        code={`import { createContext, useContext, useId } from "react";

interface FieldContextValue {
  id: string;
  hintId: string;
  errorId: string;
  invalid: boolean;
  describedBy: string | undefined;
}
const FieldContext = createContext<FieldContextValue | null>(null);
const useField = () => useContext(FieldContext);

export function Field({ children, invalid = false }: { children: React.ReactNode; invalid?: boolean }) {
  const id = useId();
  const hintId = \`\${id}-hint\`;
  const errorId = \`\${id}-error\`;
  // describedBy points the control at hint + (when invalid) error:
  const describedBy = [hintId, invalid ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, hintId, errorId, invalid, describedBy }}>
      <div className="ds-field">{children}</div>
    </FieldContext.Provider>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  const f = useField()!;
  return <label className="ds-label" htmlFor={f.id}>{children}</label>;
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  const f = useField()!;
  return <p className="ds-hint" id={f.hintId}>{children}</p>;
}

export function FieldError({ children }: { children: React.ReactNode }) {
  const f = useField()!;
  if (!f.invalid) return null;
  // role=alert => announced the moment it appears:
  return <p className="ds-error" id={f.errorId} role="alert">{children}</p>;
}`}
        lang="tsx"
        filename="Field.tsx"
      />

      <h2 id="controls">The Control Atoms</h2>
      <p>
        The control reads the field context and applies the wiring automatically — the consumer
        never manually passes <code>id</code> or <code>aria-*</code>. This is the encapsulation that
        prevents mistakes.
      </p>

      <CodeBlock
        code={`export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const f = useField();
  return (
    <input
      className="ds-input"
      id={f?.id}
      aria-invalid={f?.invalid || undefined}
      aria-describedby={f?.describedBy}   // hint + error, wired automatically
      {...props}
    />
  );
}

// Usage — the consumer writes NO aria attributes; the Field wires everything:
// <Field invalid={!!errors.email}>
//   <FieldLabel>Email</FieldLabel>
//   <TextInput type="email" name="email" />
//   <FieldHint>We'll never share it.</FieldHint>
//   <FieldError>{errors.email?.message}</FieldError>
// </Field>`}
        lang="tsx"
        filename="TextInput.tsx"
      />

      <h2 id="form-association">Form-Associated Custom Elements</h2>
      <p>
        When a control is <em>not</em> a native input — a custom toggle, a styled select built from
        divs — it won&rsquo;t participate in form submission, validation, or <code>FormData</code> by
        default. The modern platform fix is the <strong><code>ElementInternals</code> API</strong>{" "}
        (form-associated custom elements): it lets a custom element set its form value, validity, and
        participate in native form behavior. Even in React systems, knowing this matters for any
        non-native control and is a strong senior signal.
      </p>

      <CodeBlock
        code={`// Form-associated custom element: a real <toggle-switch> that submits like a checkbox
class ToggleSwitch extends HTMLElement {
  static formAssociated = true;        // opt into form participation
  #internals: ElementInternals;
  #on = false;

  constructor() {
    super();
    this.#internals = this.attachInternals();   // grants form APIs
  }
  connectedCallback() {
    this.setAttribute("role", "switch");
    this.tabIndex = 0;
    this.addEventListener("click", () => this.#toggle());
    this.#sync();
  }
  #toggle() { this.#on = !this.#on; this.#sync(); }
  #sync() {
    this.setAttribute("aria-checked", String(this.#on));
    // This is what makes it submit with the form / appear in FormData:
    this.#internals.setFormValue(this.#on ? "on" : null);
    this.#internals.setValidity(this.#on ? {} : { valueMissing: true }, "Required");
  }
}
customElements.define("toggle-switch", ToggleSwitch);`}
        lang="typescript"
        filename="ToggleSwitch.ts"
      />

      <h2 id="validation">Validation & Error Display</h2>
      <p>
        Validation has two halves: <em>computing</em> errors (schema validation) and <em>presenting</em>{" "}
        them accessibly. The presentation rules: set <code>aria-invalid</code> on the control, link
        the error via <code>aria-describedby</code>, give the error <code>role=&quot;alert&quot;</code>{" "}
        so it&rsquo;s announced when it appears, and validate at the right moment (on blur or submit —
        never on every keystroke, which spams screen readers).
      </p>

      <MermaidDiagram
        chart={validationDiagram}
        title="The validation + announcement flow"
        caption="On blur/submit, the validator returns an error; the field sets aria-invalid and surfaces a role=alert message that assistive tech announces."
        minHeight={360}
      />

      <ArticleTable
        caption="Validation timing strategies and their UX/a11y tradeoffs."
        minWidth={800}
      >
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>When it validates</th>
              <th>Tradeoff</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>onSubmit</td>
              <td>Form submission only</td>
              <td>Safest default; errors appear together</td>
            </tr>
            <tr>
              <td>onBlur</td>
              <td>Leaving a field</td>
              <td>Good balance; validates after the user is &ldquo;done&rdquo;</td>
            </tr>
            <tr>
              <td>onChange</td>
              <td>Every keystroke</td>
              <td>Noisy; spams screen readers — avoid for errors</td>
            </tr>
            <tr>
              <td>Hybrid (blur, then change once errored)</td>
              <td>Blur first, live after error shown</td>
              <td>Best UX; what RHF&rsquo;s default mode approximates</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="rhf">Integrating with React Hook Form + Zod</h2>
      <p>
        Design-system fields should plug into the form library teams use. The cleanest pattern keeps
        the system&rsquo;s <code>Field</code> presentation-only and lets <strong>React Hook
        Form</strong> own state while <strong>Zod</strong> owns the schema. The system provides the
        accessible primitives; the app wires validation.
      </p>

      <CodeBlock
        code={`import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

function SignupForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",          // validate on blur, then live once errored
  });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <Stack gap="4">
        <Field invalid={!!errors.email}>
          <FieldLabel>Email</FieldLabel>
          <TextInput type="email" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </Field>

        <Field invalid={!!errors.password}>
          <FieldLabel>Password</FieldLabel>
          <TextInput type="password" {...register("password")} />
          <FieldHint>Use 8+ characters.</FieldHint>
          <FieldError>{errors.password?.message}</FieldError>
        </Field>

        <Button type="submit">Create account</Button>
      </Stack>
    </form>
  );
}`}
        lang="tsx"
        filename="SignupForm.tsx"
      />

      <p>
        The design system owns <code>Field</code>, <code>TextInput</code>, the ARIA wiring, and the
        visual states; React Hook Form owns registration and submission; Zod owns the rules. Clean
        separation, and the accessibility is correct by construction.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you build accessible, reusable form components?'"
        intro="Forms separate strong frontend engineers from the rest. The signal is the ARIA wiring and validation-timing judgment, not just 'I style an input.'"
        steps={[
          "Frame the hard part as relationships, not styling: label association, hint/error via aria-describedby, aria-invalid, and announcing errors.",
          "Build a Field wrapper that generates ids (useId) and wires ARIA via context, so controls inside get correct associations automatically — consumers write no aria-*.",
          "Errors use role=alert so they're announced on appearance; validate on blur/submit, never every keystroke (spams screen readers).",
          "For non-native controls, mention form-associated custom elements via ElementInternals (setFormValue/setValidity) so they participate in forms.",
          "Integration: keep system fields presentation-only; let React Hook Form own state and Zod own the schema — clean separation, correct a11y by construction.",
        ]}
      />

      <InterviewChallenge
        title="Make a custom select form-ready and accessible"
        scenario={
          <>
            A team built a custom dropdown <code>Select</code> from <code>div</code>s because the
            native one couldn&rsquo;t be styled. It doesn&rsquo;t submit with the form, validation
            libraries can&rsquo;t see it, its label isn&rsquo;t associated, and errors aren&rsquo;t
            announced. Make it a proper design-system field.
          </>
        }
        tasks={[
          "List what's broken and the correct mechanism to fix each.",
          "Explain how to make the custom control participate in form submission and validation.",
          "Wire it into the Field pattern so label/error association is automatic.",
        ]}
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>Broken → fix:</strong> (1) doesn&rsquo;t submit / invisible to validators → make it
          a <em>form-associated custom element</em> (or, in pure React, a controlled component whose
          value is mirrored into a hidden native input that RHF registers). (2) label not associated
          → render via the <code>Field</code> so the label&rsquo;s <code>htmlFor</code> targets the
          control&rsquo;s generated id (or use <code>aria-labelledby</code> for a composite widget).
          (3) errors not announced → <code>aria-invalid</code> + <code>aria-describedby</code> to a{" "}
          <code>role=alert</code> error from <code>FieldError</code>.
        </p>
        <CodeBlock
          code={`// React approach: controlled custom select + hidden input for form participation
function Select({ value, onChange, name }: SelectProps) {
  const f = useField();
  return (
    <>
      {/* the styled, accessible combobox (role=combobox, keyboard, aria-activedescendant) */}
      <button role="combobox" aria-invalid={f?.invalid || undefined}
              aria-describedby={f?.describedBy} aria-labelledby={f ? f.id + "-label" : undefined}
              onClick={openListbox}>{value ?? "Choose…"}</button>
      {/* mirror into a native input so FormData + RHF see the value */}
      <input type="hidden" name={name} value={value ?? ""} />
    </>
  );
}
// Better still: build on Radix Select / React Aria, which already does form association + a11y.`}
          lang="tsx"
        />
        <p>
          The pragmatic senior answer: don&rsquo;t hand-roll this — build the Select on{" "}
          <strong>Radix or React Aria</strong>, which provide keyboard, ARIA, and form association,
          then wrap it in the <code>Field</code> for label/error wiring. Reserve{" "}
          <code>ElementInternals</code> for true framework-agnostic web-component systems.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Forms are the real test — the hard part is the <strong>ARIA relationships</strong>, not
          styling.
        </li>
        <li>
          Build a <strong><code>Field</code> wrapper</strong> that generates ids (<code>useId</code>)
          and wires label/hint/error via context, so controls get correct associations automatically.
        </li>
        <li>
          Errors use <strong><code>role=&quot;alert&quot;</code></strong> + <code>aria-invalid</code> +{" "}
          <code>aria-describedby</code>; validate on <strong>blur/submit</strong>, never every
          keystroke.
        </li>
        <li>
          Non-native controls need <strong>form association</strong> — <code>ElementInternals</code>{" "}
          (<code>setFormValue</code>/<code>setValidity</code>) or a mirrored hidden input.
        </li>
        <li>
          Keep system fields <strong>presentation-only</strong>; let React Hook Form own state and
          Zod own the schema — correct accessibility by construction.
        </li>
      </ul>
    </div>
  );
}
