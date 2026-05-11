import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const schemaDrivenDiagram = String.raw`flowchart TD
    CONFIG["Field Config Array from API/CMS\n[{ id: 'email', type: 'email', label: 'Email', required: true },\n { id: 'role', type: 'select', options: [...] },\n { id: 'company', type: 'text', showWhen: { field: 'role', value: 'business' } }]"]
    RENDERER["DynamicForm component"]
    SWITCH["Field type switch\n(text, email, select, checkbox, ...)"]
    RHF["react-hook-form\nregister() each field"]
    ZOD["Zod schema\nbuilt from config array"]

    CONFIG --> RENDERER
    RENDERER --> SWITCH
    RENDERER --> RHF
    RENDERER --> ZOD
    SWITCH -->|"text"| TEXT["<input type=text>"]
    SWITCH -->|"email"| EMAIL["<input type=email>"]
    SWITCH -->|"select"| SELECT["<select>"]
    SWITCH -->|"checkbox"| CHECK["<input type=checkbox>"]`;

const multiStepDiagram = String.raw`stateDiagram-v2
    [*] --> step1: form mounts
    step1 --> step2: step 1 valid → Next
    step2 --> step1: Back
    step2 --> step3: step 2 valid → Next
    step3 --> step2: Back
    step3 --> submitting: Submit clicked
    submitting --> success: API returns 200
    submitting --> error: API returns error
    error --> step3: user edits and retries`;

export const toc: TocItem[] = [
  { id: "controlled-vs-uncontrolled", title: "Controlled vs Uncontrolled Inputs", level: 2 },
  { id: "react-hook-form", title: "React Hook Form Fundamentals", level: 2 },
  { id: "zod-validation", title: "Zod Schema Validation", level: 2 },
  { id: "schema-driven-forms", title: "Schema-Driven Forms from API Config", level: 2 },
  { id: "conditional-fields", title: "Conditional Fields with watch", level: 3 },
  { id: "multi-step-forms", title: "Multi-Step Forms", level: 2 },
  { id: "form-submission", title: "Submission, Loading States, and Server Errors", level: 2 },
  { id: "form-a11y", title: "Accessibility in Forms", level: 2 },
  { id: "comparison-table", title: "Form Library Comparison", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function DynamicFormsReact() {
  return (
    <div className="article-content">
      <p>
        Dynamic forms — where the field definitions come from an API or CMS config rather than
        being hardcoded — are explicitly called out in the Indeed JD. This module covers the full
        implementation: React Hook Form for performance, Zod for schema validation, conditional
        field visibility, multi-step forms, and the accessibility requirements that make forms
        usable by everyone.
      </p>

      <h2 id="controlled-vs-uncontrolled">Controlled vs Uncontrolled Inputs</h2>
      <p>
        React has two models for form inputs. Controlled inputs store their value in React state —
        the component re-renders on every keystroke. Uncontrolled inputs store their value in the
        DOM, with React only reading it on submit. React Hook Form uses uncontrolled inputs
        internally for performance, registering refs rather than state setters.
      </p>

      <pre>
        <code>{`// Controlled — every keystroke triggers re-render
function ControlledInput() {
  const [value, setValue] = useState("");
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}

// Uncontrolled with ref — no re-renders during typing
function UncontrolledInput() {
  const ref = useRef<HTMLInputElement>(null);
  const handleSubmit = () => {
    console.log(ref.current?.value); // read on submit
  };
  return <input ref={ref} defaultValue="" />;
}

// React Hook Form: uncontrolled under the hood, controlled DX
// register() attaches the ref for you
import { useForm } from "react-hook-form";

function RHFInput() {
  const { register, handleSubmit } = useForm<{ email: string }>();
  const onSubmit = (data: { email: string }) => console.log(data);
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} type="email" />
    </form>
  );
}`}</code>
      </pre>

      <h2 id="react-hook-form">React Hook Form Fundamentals</h2>

      <pre>
        <code>{`import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["individual", "business"], { message: "Please select your role" }),
  company: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof contactSchema>;

function ContactForm() {
  const {
    register,        // connects input to RHF
    handleSubmit,    // wraps onSubmit with validation
    formState: {     // validation state
      errors,        // validation errors keyed by field name
      isSubmitting,  // true while onSubmit promise is pending
      isValid,       // true when no validation errors
    },
    watch,           // subscribe to field value changes
    setValue,        // programmatically set a field value
    reset,           // reset form to defaults
    setError,        // manually set a validation error (e.g., from server)
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
    mode: "onBlur", // validate when field loses focus (better UX than onChange)
  });

  const role = watch("role"); // subscribe to role field for conditional rendering

  const onSubmit = async (data: ContactForm) => {
    try {
      await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      reset(); // clear form on success
    } catch (error) {
      // Set a form-level error from the server response
      setError("root", { message: "Failed to send. Please try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register("name")} aria-describedby={errors.name ? "name-error" : undefined} />
        {errors.name && (
          <span id="name-error" role="alert" aria-live="polite">
            {errors.name.message}
          </span>
        )}
      </div>

      {/* role field controls conditional company field */}
      <div>
        <label htmlFor="role">Role</label>
        <select id="role" {...register("role")}>
          <option value="">Select role</option>
          <option value="individual">Individual</option>
          <option value="business">Business</option>
        </select>
      </div>

      {/* Conditional field — only shows when role === 'business' */}
      {role === "business" && (
        <div>
          <label htmlFor="company">Company</label>
          <input id="company" {...register("company")} />
        </div>
      )}

      {errors.root && (
        <div role="alert" aria-live="assertive">
          {errors.root.message}
        </div>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}`}</code>
      </pre>

      <h2 id="zod-validation">Zod Schema Validation</h2>

      <pre>
        <code>{`import { z } from "zod";

// Common Zod patterns for form validation:

// Required string with minimum length
const nameField = z.string().min(2, "Name must be at least 2 characters").max(100);

// Email validation
const emailField = z.string().email("Invalid email address");

// Optional field — undefined OR string
const websiteField = z.string().url("Must be a valid URL").optional();

// Or empty string is acceptable:
const websiteOptional = z.union([z.literal(""), z.string().url("Must be a valid URL")]);

// Enum — enforces specific values
const roleField = z.enum(["individual", "business", "enterprise"]);

// Conditional validation with refine or superRefine
const formSchema = z
  .object({
    role: z.enum(["individual", "business"]),
    company: z.string().optional(),
  })
  .refine(
    (data) => {
      // If role is business, company is required
      if (data.role === "business") return !!data.company && data.company.length > 0;
      return true;
    },
    {
      message: "Company name is required for business accounts",
      path: ["company"], // error appears on the company field, not root
    }
  );

// Extract TypeScript type from schema — single source of truth
type FormValues = z.infer<typeof formSchema>;
// { role: "individual" | "business"; company?: string | undefined }`}</code>
      </pre>

      <h2 id="schema-driven-forms">Schema-Driven Forms from API Config</h2>
      <MermaidDiagram
        chart={schemaDrivenDiagram}
        title="Schema-Driven Form Rendering"
        caption="The field config array drives everything: which inputs render, which Zod validations apply, and which fields conditionally appear."
        minHeight={460}
      />

      <pre>
        <code>{`// Field configuration type — comes from API or CMS
interface FieldConfig {
  id: string;
  type: "text" | "email" | "select" | "checkbox" | "radio" | "textarea";
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>; // for select/radio
  showWhen?: {
    field: string;
    value: string | boolean;
  };
}

// Build a Zod schema dynamically from the config array
import { z } from "zod";

function buildZodSchema(fields: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let validator: z.ZodTypeAny;

    switch (field.type) {
      case "email":
        validator = z.string().email("Invalid email");
        break;
      case "checkbox":
        validator = z.boolean();
        break;
      case "select":
      case "radio":
        if (field.options) {
          const values = field.options.map((o) => o.value) as [string, ...string[]];
          validator = z.enum(values, { message: "Please select an option" });
        } else {
          validator = z.string();
        }
        break;
      default:
        validator = z.string().min(1, \`\${field.label} is required\`);
    }

    // Make optional if not required
    shape[field.id] = field.required ? validator : validator.optional();
  }

  return z.object(shape);
}

// The dynamic form component
function DynamicForm({ fields }: { fields: FieldConfig[] }) {
  const schema = useMemo(() => buildZodSchema(fields), [fields]);
  type FormValues = z.infer<typeof schema>;

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const watchedValues = watch(); // subscribe to all field values for conditional logic

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      {fields.map((field) => {
        // Conditional visibility
        if (field.showWhen) {
          const watchedValue = watchedValues[field.showWhen.field];
          if (watchedValue !== field.showWhen.value) return null;
        }

        return (
          <div key={field.id}>
            <label htmlFor={field.id}>{field.label}</label>
            <FieldInput field={field} register={register} />
            {errors[field.id] && (
              <span role="alert">{String(errors[field.id]?.message)}</span>
            )}
          </div>
        );
      })}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}

// Route each field type to the correct input element
function FieldInput({
  field,
  register,
}: {
  field: FieldConfig;
  register: UseFormRegister<Record<string, unknown>>;
}) {
  switch (field.type) {
    case "select":
      return (
        <select id={field.id} {...register(field.id)}>
          <option value="">Select {field.label}</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    case "textarea":
      return <textarea id={field.id} placeholder={field.placeholder} {...register(field.id)} />;
    case "checkbox":
      return <input type="checkbox" id={field.id} {...register(field.id)} />;
    default:
      return (
        <input
          type={field.type}
          id={field.id}
          placeholder={field.placeholder}
          {...register(field.id)}
        />
      );
  }
}`}</code>
      </pre>

      <h3 id="conditional-fields">Conditional Fields with watch</h3>

      <pre>
        <code>{`// watch returns the current value of specified fields
// React Hook Form is smart — only re-renders when watched values change

const role = watch("role");           // re-render when "role" changes
const allValues = watch();            // re-render on any field change (use sparingly)
const [name, email] = watch(["name", "email"]); // watch multiple fields

// Conditional field pattern — show field B only when field A has a specific value
{role === "business" && (
  <div>
    <label htmlFor="company">Company Name *</label>
    <input id="company" {...register("company")} />
    {errors.company && <span>{errors.company.message}</span>}
  </div>
)}

// Note: when "company" field unmounts, RHF keeps its value in the form state.
// Use shouldUnregister: true in useForm options if you want it cleared on hide.`}</code>
      </pre>

      <h2 id="multi-step-forms">Multi-Step Forms</h2>
      <MermaidDiagram
        chart={multiStepDiagram}
        title="Multi-Step Form State Machine"
        caption="Each step validates independently. Back navigation preserves filled values. The final submit only fires when all steps are valid."
        minHeight={380}
      />

      <pre>
        <code>{`// Multi-step form: one schema per step, accumulated data on completion
import { z } from "zod";

const step1Schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email(),
});

const step2Schema = z.object({
  company: z.string().min(1, "Required"),
  role: z.enum(["engineering", "design", "product", "other"]),
  teamSize: z.enum(["1-10", "11-50", "51-200", "200+"]),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

function MultiStepForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);

  const step1Form = useForm<Step1Data>({ resolver: zodResolver(step1Schema) });
  const step2Form = useForm<Step2Data>({ resolver: zodResolver(step2Schema) });

  const handleStep1 = step1Form.handleSubmit((data) => {
    setStep1Data(data);
    setStep(2);
  });

  const handleStep2 = step2Form.handleSubmit(async (step2Data) => {
    const allData = { ...step1Data!, ...step2Data };
    await submitForm(allData);
  });

  if (step === 1) {
    return (
      <form onSubmit={handleStep1}>
        <input {...step1Form.register("firstName")} placeholder="First name" />
        <input {...step1Form.register("lastName")} placeholder="Last name" />
        <input {...step1Form.register("email")} type="email" placeholder="Email" />
        <button type="submit">Next</button>
      </form>
    );
  }

  return (
    <form onSubmit={handleStep2}>
      <button type="button" onClick={() => setStep(1)}>Back</button>
      <input {...step2Form.register("company")} placeholder="Company" />
      {/* ... other step 2 fields */}
      <button type="submit">Submit</button>
    </form>
  );
}`}</code>
      </pre>

      <h2 id="form-submission">Submission, Loading States, and Server Errors</h2>

      <pre>
        <code>{`// isSubmitting from formState handles async submissions automatically
const { handleSubmit, setError, formState: { isSubmitting, errors } } = useForm();

const onSubmit = async (data: FormValues) => {
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const { error, field } = await response.json();

      // Server says a specific field is invalid (e.g., email already taken)
      if (field) {
        setError(field, { type: "server", message: error });
        return;
      }

      // Generic server error — shows on the root error, not a specific field
      setError("root.serverError", { type: "server", message: error || "Something went wrong" });
      return;
    }

    // Success — reset form, show success state
    reset();
    onSuccess?.();
  } catch {
    setError("root.serverError", { type: "network", message: "Network error. Please try again." });
  }
};

// Disable submit while submitting, show spinner
<button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
  {isSubmitting ? "Sending..." : "Send Message"}
</button>

// Display root-level server error
{errors.root?.serverError && (
  <div role="alert" aria-live="assertive">
    {errors.root.serverError.message}
  </div>
)}`}</code>
      </pre>

      <h2 id="form-a11y">Accessibility in Forms</h2>

      <pre>
        <code>{`// The four key a11y requirements for forms:

// 1. Label association — every input must have a label associated via htmlFor/id
<label htmlFor="email">Email address</label>
<input id="email" type="email" {...register("email")} />
// Do NOT use placeholder as a label substitute — it disappears on focus

// 2. Error announcement — screen readers must announce errors when they appear
// aria-describedby links the input to its error message
// role="alert" + aria-live="polite" announces the error on change
<input
  id="email"
  type="email"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : "email-hint"}
  {...register("email")}
/>
{errors.email && (
  <span id="email-error" role="alert" aria-live="polite">
    {errors.email.message}
  </span>
)}
<span id="email-hint">We'll never share your email</span>

// 3. Focus management — when server returns validation errors, focus the first error
// React Hook Form's setFocus() handles this
const { setFocus } = useForm();
// After server validation error:
setFocus("email"); // moves focus to the email field

// 4. Required field indication — accessible without relying on color alone
<label htmlFor="name">
  Name <span aria-label="required">*</span>
</label>
<input id="name" required aria-required="true" {...register("name")} />`}</code>
      </pre>

      <h2 id="comparison-table">Form Library Comparison</h2>

      <ArticleTable caption="Choosing a form library is a tradeoff between bundle size, performance, validation integration, and API complexity." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Library</th>
              <th>Bundle Size</th>
              <th>Performance</th>
              <th>API Complexity</th>
              <th>Validation</th>
              <th>When to Use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>React Hook Form</strong></td>
              <td>~25KB</td>
              <td>Excellent — uncontrolled, minimal re-renders</td>
              <td>Low — register/handleSubmit/formState</td>
              <td>Native + any resolver (Zod, Yup, Joi)</td>
              <td>Most forms — the default choice for performance</td>
            </tr>
            <tr>
              <td><strong>Formik</strong></td>
              <td>~15KB</td>
              <td>Good — controlled inputs, more re-renders than RHF</td>
              <td>Medium — Field components, FieldArray</td>
              <td>Yup natively; Zod requires adapter</td>
              <td>Teams already using Formik; simpler mental model for newcomers</td>
            </tr>
            <tr>
              <td><strong>Native (no library)</strong></td>
              <td>Zero</td>
              <td>Depends on implementation</td>
              <td>High — manage state, validation, submission manually</td>
              <td>Manual or browser native validation</td>
              <td>Simple 1–3 field forms; no complex validation; Server Actions</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'Walk me through how you'd build a dynamic form where the fields come from an API config'"
        intro="This is a live-coding candidate question. The interviewer is testing your React Hook Form depth, your ability to write generic components, and whether you think about types, accessibility, and edge cases."
        steps={[
          "Start with the data shape: I'd define a FieldConfig interface with at minimum: id, type (text/email/select/checkbox), label, required boolean, and options array for select fields. I'd also add showWhen for conditional visibility: { field, value }.",
          "Describe the Zod schema builder: I'd iterate the config array and build a Zod schema shape object dynamically. Text fields get z.string().min(1), email gets z.string().email(), checkboxes get z.boolean(). Required vs optional is set per field.required. I'd memoize the schema with useMemo since it's expensive to rebuild on every render.",
          "Explain the form renderer: one useForm call with zodResolver(schema). I iterate the field configs, render the right input component per type, spread ...register(field.id) onto each input. Conditional fields use watch() to subscribe to the controlling field value and return null if the condition isn't met.",
          "Address the edge cases: when a conditional field unmounts, react-hook-form keeps its value. If the form should submit empty for hidden fields, use shouldUnregister: true. If hidden values should be preserved but ignored on submit, filter them server-side.",
          "Close with accessibility: every input has a label via htmlFor/id. Errors use aria-describedby linking the input to its error span. The error span has role='alert' and aria-live='polite' so screen readers announce it. The submit button shows aria-busy while submitting.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Build a Schema-Driven Contact Form with Conditional Visibility"
        scenario={
          <span>
            The Indeed Help Center needs a contact form for users who can&apos;t find an answer in
            the articles. The form fields are defined by an API response (simulated below) so the
            support team can modify the form without a code deploy. The form must render the correct
            input type per field, validate with Zod, show inline errors, and conditionally show the
            &quot;company&quot; field only when the user selects &quot;business&quot; for their
            account type.
          </span>
        }
        tasks={[
          "Define the FieldConfig TypeScript interface to cover: text, email, select, checkbox field types with labels, required flags, options arrays, and optional showWhen conditional config",
          "Build buildZodSchema(fields: FieldConfig[]) that returns a Zod schema matching the config — required string fields get min(1), email fields get .email(), select fields get z.enum() from the options array",
          "Implement the DynamicForm component using useForm with zodResolver — render the correct HTML input per field type, handle conditional field visibility with watch()",
          "Add proper accessibility: label/input association via htmlFor, aria-describedby linking inputs to their error messages, aria-live='polite' on error spans, aria-busy on the submit button during submission",
          "Handle a server error response that returns { field: 'email', error: 'Email already registered' } — show the error on the correct field using setError()",
        ]}
        pitfalls={[
          "Rebuilding the Zod schema on every render without useMemo — schema construction is O(n) and causes unnecessary useForm reinitializations",
          "Using index as the key when rendering the fields array — if fields are filtered (conditional), index keys cause React reconciliation bugs",
          "Not clearing conditional field values when they unmount — the user fills in 'company', changes role back to 'individual', and company is still sent in the form payload",
          "Missing aria-live on error messages — screen reader users don't hear validation errors appear below the input",
        ]}
        signal="A strong answer uses useMemo for the schema, watch() only for fields that have conditional children (not watch() for all fields which causes excessive re-renders), correct aria-describedby/id pairing, and demonstrates setError for server-side validation errors."
      />
    </div>
  );
}
