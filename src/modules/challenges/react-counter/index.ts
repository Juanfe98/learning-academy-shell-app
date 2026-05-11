import type { Challenge } from "@/lib/challenges/types";

const reactCounter: Challenge = {
  slug: "react-counter",
  title: "React Counter",
  description:
    "Build a simple counter component. The component should display a count starting at 0 with two buttons: one to increment the count and one to decrement it. The count should never go below 0.",
  difficulty: "beginner",
  tags: ["hooks", "state", "events"],
  environment: "react-js",
  entryFile: "App.jsx",
  files: [
    {
      filename: "App.jsx",
      language: "jsx",
      content: `function App() {
  // TODO: add state for count

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2>Counter</h2>
      <p style={{ fontSize: 32, fontWeight: "bold" }}>0</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => {}}>-</button>
        <button onClick={() => {}}>+</button>
      </div>
    </div>
  );
}
`,
    },
    {
      filename: "styles.css",
      language: "css",
      content: `body {
  margin: 0;
  background: #fff;
  color: #111;
}

button {
  padding: 8px 20px;
  font-size: 18px;
  cursor: pointer;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #f5f5f5;
}

button:hover {
  background: #e8e8e8;
}
`,
    },
  ],
};

export default reactCounter;
