import type { Challenge } from "@/lib/challenges/types";

const reactTypedCounter: Challenge = {
  slug: "react-typed-counter",
  title: "Typed React Counter",
  description:
    "Build a typed counter component using TypeScript. Import the CounterProps interface from types.ts and use it to type the component's props. Add an explicit type parameter to useState so the count is typed as a number.",
  difficulty: "beginner",
  tags: ["typescript", "hooks", "interfaces"],
  environment: "react-ts",
  entryFile: "App.tsx",
  files: [
    {
      filename: "types.ts",
      language: "ts",
      content: `export interface CounterProps {
  initialCount?: number;
  step?: number;
}
`,
    },
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useState } from "react";
import type { CounterProps } from "./types";

// TODO: Add CounterProps as the type for the App component's props
// TODO: Use initialCount and step from props (with defaults: 0 and 1)
// TODO: Add an explicit type parameter to useState<number>

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2>Typed Counter</h2>
      <p style={{ fontSize: 32, fontWeight: "bold" }}>{count}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setCount((c) => c - 1)}>-</button>
        <button onClick={() => setCount((c) => c + 1)}>+</button>
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

export default reactTypedCounter;
