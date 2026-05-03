import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "state-props",
  title: "State & Props",
  icon: "📦",
  description:
    "Master data flow: lifting state, controlled inputs, Context, and derived state.",
  accentColor: "#06b6d4",
  challenges: [
    {
      id: "lift-state-up",
      topicId: "state-props",
      title: "Sync two sibling components by lifting state",
      difficulty: "easy",
      description:
        "Two sibling components — `TemperatureC` and `TemperatureF` — each manage their own state and are currently out of sync. Lift the state to their parent `TemperatureConverter` so that updating one field immediately updates the other.",
      concepts: [
        "lifting state",
        "controlled components",
        "single source of truth",
      ],
      starterCode: `function TemperatureC({ value, onChange }) {
  return (
    <label>
      Celsius:
      <input type="number" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function TemperatureF({ value, onChange }) {
  return (
    <label>
      Fahrenheit:
      <input type="number" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function TemperatureConverter() {
  // TODO: lift state here and compute conversions
  return (
    <div>
      <TemperatureC value={""} onChange={() => {}} />
      <TemperatureF value={""} onChange={() => {}} />
    </div>
  );
}

export default TemperatureConverter;`,
      hints: [
        "Keep a single state in the parent, e.g. `const [celsius, setCelsius] = useState('')`.",
        "Compute Fahrenheit from Celsius: `(parseFloat(celsius) * 9/5 + 32).toFixed(2)`. Handle empty string.",
        "Pass the computed values down and update the source-of-truth in the `onChange` handlers.",
      ],
      tests: [
        {
          description: "renders both input fields",
          code: `
it("renders both input fields", () => {
  render(<TemperatureConverter />);
  expect(screen.getByText(/Celsius/)).toBeTruthy();
  expect(screen.getByText(/Fahrenheit/)).toBeTruthy();
});`,
        },
        {
          description: "typing in Celsius updates the Fahrenheit input",
          code: `
it("typing 100 Celsius shows 212 Fahrenheit", () => {
  render(<TemperatureConverter />);
  const inputs = document.querySelectorAll("input");
  fireEvent.change(inputs[0], { target: { value: "100" } });
  expect(inputs[1].value).toBe("212.00");
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "controlled-input",
      topicId: "state-props",
      title: "Convert an uncontrolled input to controlled",
      difficulty: "easy",
      description:
        "The form below uses `defaultValue` (uncontrolled). Convert it to a fully controlled form where React owns the input values. The submit handler should receive the current values from state, not from the DOM.",
      concepts: ["controlled components", "useState", "forms"],
      starterCode: `function SignupForm() {
  function handleSubmit(e) {
    e.preventDefault();
    const name = e.target.elements.name.value;
    const email = e.target.elements.email.value;
    console.log({ name, email });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" defaultValue="" placeholder="Name" />
      <input name="email" defaultValue="" placeholder="Email" type="email" />
      <button type="submit">Sign Up</button>
    </form>
  );
}

export default SignupForm;`,
      hints: [
        "Add `useState` for each field: `const [name, setName] = useState('')`.",
        "Replace `defaultValue` with `value={name}` and add `onChange={e => setName(e.target.value)}`.",
        "In `handleSubmit`, read from state directly instead of `e.target.elements`.",
      ],
      tests: [
        {
          description: "renders both inputs and submit button",
          code: `
it("renders both inputs and submit button", () => {
  render(<SignupForm />);
  expect(document.querySelector("input[placeholder='Name']")).toBeTruthy();
  expect(document.querySelector("input[placeholder='Email']")).toBeTruthy();
  expect(screen.getByText("Sign Up")).toBeTruthy();
});`,
        },
        {
          description: "inputs reflect typed values",
          code: `
it("inputs reflect typed values", () => {
  render(<SignupForm />);
  const nameInput = document.querySelector("input[placeholder='Name']");
  fireEvent.change(nameInput, { target: { value: "Alice" } });
  expect(nameInput.value).toBe("Alice");
});`,
        },
      ],
      estimatedMinutes: 8,
    },
    {
      id: "context-provider",
      topicId: "state-props",
      title: "Replace prop drilling 3 levels deep with Context",
      difficulty: "medium",
      description:
        "The `user` prop is passed through `App → Layout → Sidebar → UserAvatar` — three layers of prop drilling. The intermediate components (`Layout`, `Sidebar`) don't use `user` themselves. Refactor to use `React.createContext` and `useContext` so only `UserAvatar` reads from context.",
      concepts: [
        "createContext",
        "useContext",
        "Context.Provider",
        "prop drilling",
      ],
      starterCode: `function UserAvatar({ user }) {
  return <div className="avatar">{user.name[0]}</div>;
}

function Sidebar({ user }) {
  return (
    <aside>
      <UserAvatar user={user} />
    </aside>
  );
}

function Layout({ user }) {
  return (
    <div>
      <Sidebar user={user} />
      <main>Content</main>
    </div>
  );
}

function App() {
  const user = { name: "Alice", role: "admin" };
  return <Layout user={user} />;
}

export default App;`,
      hints: [
        "Create a context: `const UserContext = React.createContext(null)`.",
        "Wrap the tree in `<UserContext.Provider value={user}>` in `App`.",
        "In `UserAvatar`, use `const user = React.useContext(UserContext)` and remove the `user` prop.",
        "Remove the `user` prop from `Layout` and `Sidebar` signatures entirely.",
      ],
      tests: [
        {
          description: "renders the user avatar with first initial",
          code: `
it("renders the user avatar with first initial", () => {
  render(<App />);
  expect(screen.getByText("A")).toBeTruthy();
});`,
        },
        {
          description: "renders main content area",
          code: `
it("renders main content area", () => {
  render(<App />);
  expect(screen.getByText("Content")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 15,
    },
    {
      id: "derive-from-state",
      topicId: "state-props",
      title:
        "Eliminate redundant state by deriving from a single source of truth",
      difficulty: "medium",
      description:
        "The `FilteredList` component stores `items`, `filter`, and `filteredItems` in state. This creates a sync problem — `filteredItems` can drift out of sync with `items`. Remove `filteredItems` from state entirely and derive it directly from `items` and `filter` during render.",
      concepts: ["derived state", "single source of truth", "useState"],
      starterCode: `function FilteredList() {
  const [items] = React.useState(["Apple", "Banana", "Avocado", "Blueberry", "Cherry"]);
  const [filter, setFilter] = React.useState("");
  const [filteredItems, setFilteredItems] = React.useState(items); // redundant!

  function handleFilterChange(e) {
    const value = e.target.value;
    setFilter(value);
    setFilteredItems(items.filter(item => item.toLowerCase().includes(value.toLowerCase())));
  }

  return (
    <div>
      <input value={filter} onChange={handleFilterChange} placeholder="Filter..." />
      <ul>
        {filteredItems.map(item => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

export default FilteredList;`,
      hints: [
        "Delete `filteredItems` state and `setFilteredItems` calls entirely.",
        "Derive the list inline: `const filteredItems = items.filter(item => item.toLowerCase().includes(filter.toLowerCase()))`.",
        "Simplify `handleFilterChange` to just call `setFilter(value)`.",
      ],
      tests: [
        {
          description: "shows all items initially",
          code: `
it("shows all items initially", () => {
  render(<FilteredList />);
  expect(screen.getByText("Apple")).toBeTruthy();
  expect(screen.getByText("Banana")).toBeTruthy();
  expect(screen.getByText("Cherry")).toBeTruthy();
});`,
        },
        {
          description: "filters items by typed query",
          code: `
it("filters items matching 'av'", () => {
  render(<FilteredList />);
  const input = document.querySelector("input");
  fireEvent.change(input, { target: { value: "av" } });
  expect(screen.getByText("Avocado")).toBeTruthy();
  expect(screen.queryByText("Banana")).toBeNull();
});`,
        },
      ],
      estimatedMinutes: 10,
    },
    {
      id: "react-inbox-split-view",
      topicId: "state-props",
      title: "Build an inbox split-view workspace with selected thread state",
      difficulty: "hard",
      description:
        "Build a realistic inbox UI with folder navigation, a thread list, and a detail pane. The key challenge is coordinating selected state and derived visible data cleanly across the three panes without duplicating state.",
      targetImage: {
        src: "/react-challenges/inbox-split-view.svg",
        alt: "React interview target mock for an inbox split-view workspace with mailbox navigation, thread list, and message detail panel.",
        caption:
          "Focus on state boundaries: active mailbox, selected thread, and visible thread list should stay coherent as the user switches folders and clicks different threads.",
      },
      concepts: [
        "selected state",
        "derived state",
        "list rendering",
        "component composition",
        "single source of truth",
      ],
      starterCode: `const MAILBOXES = [
  { id: "inbox", label: "Inbox" },
  { id: "priority", label: "Priority" },
  { id: "sent", label: "Sent" },
];

const THREADS = [
  {
    id: "t1",
    mailbox: "priority",
    sender: "Maya Chen",
    subject: "Launch review notes",
    preview: "We need one more pass on the onboarding review flow before Friday.",
    body: "We need one more pass on the onboarding review flow before Friday. Please verify the summary step, the empty states, and the footer button hierarchy before we lock the release candidate.",
    timestamp: "10:24 AM",
    unread: true,
  },
  {
    id: "t2",
    mailbox: "priority",
    sender: "Design Ops",
    subject: "Token audit follow-up",
    preview: "The updated spacing tokens are ready for implementation review.",
    body: "The updated spacing tokens are ready for implementation review. If the dashboard shell lands today, we can align the card spacing pass tomorrow morning.",
    timestamp: "9:48 AM",
    unread: false,
  },
  {
    id: "t3",
    mailbox: "inbox",
    sender: "Platform",
    subject: "Invoice export bug",
    preview: "CSV exports are dropping the region column on older accounts.",
    body: "CSV exports are dropping the region column on older accounts. Repro steps are attached in the ticket. We should decide whether this is a hotfix or can wait for the next patch.",
    timestamp: "Yesterday",
    unread: true,
  },
  {
    id: "t4",
    mailbox: "sent",
    sender: "You",
    subject: "Re: Hiring panel notes",
    preview: "Sharing the summary from today’s frontend panel.",
    body: "Sharing the summary from today’s frontend panel. The candidate did well on decomposition and state modeling, but struggled with async race conditions.",
    timestamp: "Mon",
    unread: false,
  },
];

function MailboxNav({ activeMailbox, onSelectMailbox }) {
  return (
    <nav aria-label="Mailboxes">
      <ul style={{ listStyle: "none", display: "grid", gap: 8 }}>
        {MAILBOXES.map((mailbox) => (
          <li key={mailbox.id}>
            <button
              type="button"
              onClick={() => onSelectMailbox(mailbox.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                background: activeMailbox === mailbox.id ? "#e0f2fe" : "white",
                fontWeight: activeMailbox === mailbox.id ? 700 : 500,
              }}
            >
              {mailbox.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ThreadList({ threads, selectedThreadId, onSelectThread }) {
  return (
    <ul style={{ listStyle: "none", display: "grid", gap: 12 }}>
      {threads.map((thread) => (
        <li key={thread.id}>
          <button
            type="button"
            onClick={() => onSelectThread(thread.id)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: 16,
              borderRadius: 16,
              border: "1px solid #cbd5e1",
              background: selectedThreadId === thread.id ? "#e0f2fe" : "white",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong>{thread.sender}</strong>
              <span>{thread.timestamp}</span>
            </div>
            <p style={{ fontWeight: 600, marginTop: 8 }}>{thread.subject}</p>
            <p style={{ color: "#475569", marginTop: 6 }}>{thread.preview}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ThreadDetail({ thread }) {
  if (!thread) {
    return <p>Select a thread to read the conversation.</p>;
  }

  return (
    <article>
      <h2>{thread.subject}</h2>
      <p style={{ color: "#475569", marginTop: 8 }}>
        From {thread.sender} · {thread.timestamp}
      </p>
      <p style={{ marginTop: 24, lineHeight: 1.6 }}>{thread.body}</p>
    </article>
  );
}

function App() {
  const [activeMailbox, setActiveMailbox] = React.useState("priority");
  const [selectedThreadId, setSelectedThreadId] = React.useState("t1");

  // TODO:
  // 1. derive the visible threads from activeMailbox
  // 2. keep the selected thread in sync with the visible threads
  // 3. render a 3-pane workspace using MailboxNav, ThreadList, and ThreadDetail

  return (
    <div>
      <h1>Inbox workspace</h1>
    </div>
  );
}

export default App;`,
      hints: [
        "First derive the list: `const visibleThreads = THREADS.filter(thread => thread.mailbox === activeMailbox)`.",
        "Then derive the selected object from that filtered list: `visibleThreads.find(thread => thread.id === selectedThreadId)`.",
        "When the mailbox changes, if the current selected thread is no longer visible, fall back to the first visible thread.",
      ],
      tests: [
        {
          description:
            "renders the three mailbox buttons and the initial selected thread",
          code: `
it("shows mailbox navigation and the initial selected thread", () => {
  render(<App />);
  expect(screen.getByText("Inbox")).toBeTruthy();
  expect(screen.getByText("Priority")).toBeTruthy();
  expect(screen.getByText("Sent")).toBeTruthy();
  expect(screen.getByText("Launch review notes")).toBeTruthy();
});`,
        },
        {
          description: "clicking a visible thread updates the detail pane",
          code: `
it("updates the detail pane when a different thread is selected", () => {
  render(<App />);
  fireEvent.click(screen.getByText("Token audit follow-up"));
  expect(screen.getByText(/updated spacing tokens are ready/i)).toBeTruthy();
});`,
        },
        {
          description:
            "switching mailbox changes the visible thread list and detail",
          code: `
it("switching to Inbox shows inbox threads and selects one", () => {
  render(<App />);
  fireEvent.click(screen.getByText("Inbox"));
  expect(screen.getByText("Invoice export bug")).toBeTruthy();
  expect(screen.getByText(/CSV exports are dropping the region column/i)).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 30,
    },
    {
      id: "seat-allocation-planner",
      topicId: "state-props",
      title: "Build a seat allocation planner with derived totals and warnings",
      difficulty: "hard",
      description:
        "Build a workspace seat planner for an enterprise account. Each team can request a number of editor and viewer seats, the global budget is fixed, and the UI needs derived totals, remaining capacity, and warning banners when one team request pushes the whole plan over budget. The challenge is deciding what belongs in state versus what should be derived from the team rows.",
      targetImage: {
        src: "/react-challenges/seat-allocation-planner.svg",
        alt: "React interview target mock for a team seat allocation planner with editable team rows, total seat summaries, and warning banners.",
        caption:
          "This is a state-shape interview question. Team inputs are the source of truth, while totals, remaining seats, and warning banners should be derived cleanly and consistently.",
      },
      concepts: [
        "derived state",
        "controlled inputs",
        "single source of truth",
        "budget warnings",
        "list state",
      ],
      starterCode: `const INITIAL_TEAMS = [
  { id: "design", name: "Design", editorSeats: 4, viewerSeats: 2 },
  { id: "platform", name: "Platform", editorSeats: 6, viewerSeats: 3 },
  { id: "support", name: "Support", editorSeats: 2, viewerSeats: 5 },
];

const MAX_TOTAL_SEATS = 18;

function App() {
  const [teams, setTeams] = React.useState(INITIAL_TEAMS);

  function updateTeam(id, key, value) {
    setTeams(current =>
      current.map(team => team.id === id ? { ...team, [key]: Number(value) } : team)
    );
  }

  // TODO:
  // 1. derive total seats from all teams
  // 2. derive remaining seats from MAX_TOTAL_SEATS
  // 3. show warning text when remaining seats < 0
  // 4. render:
  //    - heading "Seat allocation planner"
  //    - one row per team
  //    - number inputs labeled "Editors for <team.id>" and "Viewers for <team.id>"
  //    - text "Total seats: <n>"
  //    - text "Remaining seats: <n>"

  return <div><h1>Seat allocation planner</h1></div>;
}

export default App;`,
      hints: [
        "Keep only the editable team seat numbers in state. Everything aggregate should be derived from `teams`.",
        "Compute `totalSeats` by summing editors plus viewers for every team.",
        "Warnings are often simplest as derived messages from the current totals instead of their own state.",
      ],
      tests: [
        {
          description: "renders initial totals correctly",
          code: `
it("renders initial total and remaining seats", () => {
  render(<App />);
  expect(screen.getByText("Seat allocation planner")).toBeTruthy();
  expect(screen.getByText("Total seats: 22")).toBeTruthy();
  expect(screen.getByText("Remaining seats: -4")).toBeTruthy();
});`,
        },
        {
          description: "changing one team updates derived totals",
          code: `
it("updates totals when a team seat count changes", () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Editors for design"), { target: { value: "2" } });
  expect(screen.getByText("Total seats: 20")).toBeTruthy();
  expect(screen.getByText("Remaining seats: -2")).toBeTruthy();
});`,
        },
      ],
      estimatedMinutes: 30,
    },
  ],
};

export default topic;
