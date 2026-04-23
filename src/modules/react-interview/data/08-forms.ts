import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "forms",
  title: "Forms",
  icon: "📝",
  description: "Validation, multi-step wizards, and dynamic field arrays.",
  accentColor: "#14b8a6",
  challenges: [
    {
      id: "inline-validation",
      topicId: "forms",
      title: "Build a form with per-field validation that shows errors on blur",
      difficulty: "easy",
      description:
        "Build a sign-up form with `name` and `email` fields. Validate on blur: name must be at least 2 characters; email must contain `@`. Show per-field error messages below the inputs. The submit button should be disabled unless both fields are valid.",
      concepts: ["controlled inputs", "validation", "onBlur", "form state"],
      starterCode: `function SignupForm() {
  const [values, setValues] = React.useState({ name: "", email: "" });
  const [touched, setTouched] = React.useState({ name: false, email: false });

  const errors = {
    name: values.name.length < 2 ? "Name must be at least 2 characters" : "",
    email: !values.email.includes("@") ? "Must be a valid email" : "",
  };

  const isValid = !errors.name && !errors.email;

  function handleChange(field) {
    return e => setValues(v => ({ ...v, [field]: e.target.value }));
  }

  function handleBlur(field) {
    return () => setTouched(t => ({ ...t, [field]: true }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isValid) alert("Submitted!");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          placeholder="Name"
          value={values.name}
          onChange={handleChange("name")}
          onBlur={handleBlur("name")}
        />
        {touched.name && errors.name && <p>{errors.name}</p>}
      </div>
      <div>
        <input
          placeholder="Email"
          type="email"
          value={values.email}
          onChange={handleChange("email")}
          onBlur={handleBlur("email")}
        />
        {touched.email && errors.email && <p>{errors.email}</p>}
      </div>
      <button type="submit" disabled={!isValid}>Submit</button>
    </form>
  );
}

export default SignupForm;`,
      hints: [
        "Track `touched` state per field — errors should only show after the user has blurred the field.",
        "Compute `errors` as a derived object (not state) to avoid sync issues.",
        "The submit button uses `disabled={!isValid}` where `isValid = !errors.name && !errors.email`.",
      ],
      tests: [
        {
          description: "submit button is disabled initially",
          code: `
it("submit is disabled when fields are empty", () => {
  render(<SignupForm />);
  const btn = document.querySelector("button[type='submit']");
  expect(btn.disabled).toBe(true);
});`,
        },
        {
          description: "shows name error after blur with short name",
          code: `
it("shows name error after blur with short name", () => {
  render(<SignupForm />);
  const nameInput = document.querySelector("input[placeholder='Name']");
  fireEvent.change(nameInput, { target: { value: "A" } });
  fireEvent.blur(nameInput);
  expect(screen.getByText("Name must be at least 2 characters")).toBeTruthy();
});`,
        },
        {
          description: "submit enabled when both fields are valid",
          code: `
it("submit is enabled when both fields valid", () => {
  render(<SignupForm />);
  const nameInput = document.querySelector("input[placeholder='Name']");
  const emailInput = document.querySelector("input[placeholder='Email']");
  fireEvent.change(nameInput, { target: { value: "Alice" } });
  fireEvent.change(emailInput, { target: { value: "alice@example.com" } });
  const btn = document.querySelector("button[type='submit']");
  expect(btn.disabled).toBe(false);
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "multi-step-form",
      topicId: "forms",
      title: "Wizard form with 3 steps, back/next, and accumulated state",
      difficulty: "medium",
      description:
        "Build a 3-step wizard form. Step 1: personal info (name, email). Step 2: address (city, country). Step 3: review + submit. State accumulates across steps — going Back should preserve entered values. The final submit logs the combined data.",
      concepts: ["multi-step forms", "useState", "accumulated state", "wizard pattern"],
      starterCode: `const STEPS = ["Personal Info", "Address", "Review"];

function MultiStepForm() {
  const [step, setStep] = React.useState(0);
  const [formData, setFormData] = React.useState({
    name: "", email: "", city: "", country: ""
  });

  function update(field, value) {
    setFormData(d => ({ ...d, [field]: value }));
  }

  function handleSubmit() {
    console.log("Submitted:", formData);
    alert(JSON.stringify(formData, null, 2));
  }

  return (
    <div>
      <p>Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      {step === 0 && (
        <div>
          <input placeholder="Name" value={formData.name} onChange={e => update("name", e.target.value)} />
          <input placeholder="Email" value={formData.email} onChange={e => update("email", e.target.value)} />
        </div>
      )}
      {step === 1 && (
        <div>
          <input placeholder="City" value={formData.city} onChange={e => update("city", e.target.value)} />
          <input placeholder="Country" value={formData.country} onChange={e => update("country", e.target.value)} />
        </div>
      )}
      {step === 2 && (
        <div>
          <p>Name: {formData.name}</p>
          <p>Email: {formData.email}</p>
          <p>City: {formData.city}</p>
          <p>Country: {formData.country}</p>
        </div>
      )}
      <div>
        {step > 0 && <button onClick={() => setStep(s => s - 1)}>Back</button>}
        {step < STEPS.length - 1
          ? <button onClick={() => setStep(s => s + 1)}>Next</button>
          : <button onClick={handleSubmit}>Submit</button>
        }
      </div>
    </div>
  );
}

export default MultiStepForm;`,
      hints: [
        "Keep `formData` in a single object and merge updates: `setFormData(d => ({ ...d, [field]: value }))`.",
        "The step indicator is just `step + 1` out of `STEPS.length`.",
        "The review step renders from `formData` directly — no re-fetching needed.",
      ],
      tests: [
        {
          description: "starts at step 1 with personal info",
          code: `
it("starts at step 1", () => {
  render(<MultiStepForm />);
  expect(screen.getByText(/Step 1 of 3/)).toBeTruthy();
  expect(document.querySelector("input[placeholder='Name']")).toBeTruthy();
});`,
        },
        {
          description: "Next advances to step 2",
          code: `
it("Next advances to step 2", () => {
  render(<MultiStepForm />);
  fireEvent.click(screen.getByText("Next"));
  expect(screen.getByText(/Step 2 of 3/)).toBeTruthy();
  expect(document.querySelector("input[placeholder='City']")).toBeTruthy();
});`,
        },
        {
          description: "entered data persists after going Back",
          code: `
it("name value persists after going Back", () => {
  render(<MultiStepForm />);
  fireEvent.change(document.querySelector("input[placeholder='Name']"), { target: { value: "Alice" } });
  fireEvent.click(screen.getByText("Next"));
  fireEvent.click(screen.getByText("Back"));
  expect(document.querySelector("input[placeholder='Name']").value).toBe("Alice");
});`,
        },
      ],
      estimatedMinutes: 25,
    },
    {
      id: "field-array",
      topicId: "forms",
      title: "Dynamic form: add/remove rows, each with its own fields",
      difficulty: "hard",
      description:
        "Build a dynamic form that manages a list of skill rows. Each row has a `skill` text input and a `level` select (Beginner/Intermediate/Expert). Users can add rows (up to 5) and remove individual rows. The total list is logged on submit.",
      concepts: ["dynamic fields", "array state", "useReducer", "form arrays"],
      starterCode: `const LEVELS = ["Beginner", "Intermediate", "Expert"];

function FieldArray() {
  const [fields, setFields] = React.useState([{ skill: "", level: "Beginner" }]);

  function addField() {
    if (fields.length >= 5) return;
    setFields(f => [...f, { skill: "", level: "Beginner" }]);
  }

  function removeField(index) {
    setFields(f => f.filter((_, i) => i !== index));
  }

  function updateField(index, key, value) {
    setFields(f => f.map((item, i) => i === index ? { ...item, [key]: value } : item));
  }

  function handleSubmit(e) {
    e.preventDefault();
    console.log(fields);
  }

  return (
    <form onSubmit={handleSubmit}>
      {fields.map((field, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            placeholder="Skill"
            value={field.skill}
            onChange={e => updateField(i, "skill", e.target.value)}
          />
          <select
            value={field.level}
            onChange={e => updateField(i, "level", e.target.value)}
          >
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
          <button type="button" onClick={() => removeField(i)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={addField} disabled={fields.length >= 5}>
        Add Skill
      </button>
      <button type="submit">Submit</button>
    </form>
  );
}

export default FieldArray;`,
      hints: [
        "Store fields as an array of objects: `[{ skill: '', level: 'Beginner' }]`.",
        "For `updateField`, use `.map()` to return a new array with the updated item at `index`.",
        "For `removeField`, use `.filter()` to exclude the item at `index`.",
      ],
      tests: [
        {
          description: "renders one row initially",
          code: `
it("renders one skill row initially", () => {
  render(<FieldArray />);
  expect(document.querySelectorAll("input[placeholder='Skill']").length).toBe(1);
});`,
        },
        {
          description: "Add Skill adds a new row",
          code: `
it("Add Skill adds a new row", () => {
  render(<FieldArray />);
  fireEvent.click(screen.getByText("Add Skill"));
  expect(document.querySelectorAll("input[placeholder='Skill']").length).toBe(2);
});`,
        },
        {
          description: "Remove deletes the row",
          code: `
it("Remove deletes a row", () => {
  render(<FieldArray />);
  fireEvent.click(screen.getByText("Add Skill"));
  const removeButtons = screen.getAllByText("Remove");
  fireEvent.click(removeButtons[0]);
  expect(document.querySelectorAll("input[placeholder='Skill']").length).toBe(1);
});`,
        },
      ],
      estimatedMinutes: 30,
    },
  ],
};

export default topic;
