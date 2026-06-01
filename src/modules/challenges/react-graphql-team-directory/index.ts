import type { Challenge } from "@/lib/challenges/types";

const reactGraphqlTeamDirectory: Challenge = {
  slug: "react-graphql-team-directory",
  title: "GraphQL Team Directory",
  description:
    "Query a mock GraphQL endpoint using graphqlFetch (no Apollo/urql). Manage ALL filter/sort state with useReducer — no useState for filters. Implement search, department filter, availability toggle, multi-skill AND filter, and sort. Skills filter options derived from data.",
  difficulty: "advanced",
  tags: ["react", "typescript", "graphql", "useReducer", "custom-hook", "multi-filter", "and-logic"],
  environment: "react-ts",
  entryFile: "App.tsx",
  problemStatement: `# GraphQL Team Directory

**Difficulty:** Advanced | **Time Limit:** 65 minutes

---

## Problem Statement

Build a **Team Directory** that queries a mock GraphQL endpoint. Unlike REST challenges, you must write the query string and parse the response. Manage all filter/sort state with \`useReducer\` — **no \`useState\` for filter state**.

---

## Functional Requirements

- On mount, execute a GraphQL query via \`graphqlFetch(query, variables)\`
- Show loading and error states
- Each \`MemberCard\` shows: initials avatar, name, title, department badge, availability dot (● green / ○ gray), skills list, bio snippet (max 100 chars)
- Search by name or bio (case-insensitive, real-time)
- Department dropdown: \`"All Departments"\` + unique depts from data
- Availability toggle: \`"All"\` / \`"Available"\` / \`"Busy"\`
- Skills filter: pill buttons — selecting multiple requires ALL selected skills (AND logic)
- Sort: \`"Name A–Z"\`, \`"Name Z–A"\`, \`"Department"\`, \`"Most Skills"\`
- All filters apply simultaneously
- \`"No team members found."\` when empty
- \`"X members"\` count

---

## Technical Requirements

**Must use:**
- \`useReducer\` for ALL filter/sort state — one action per filter + a \`RESET\` action
- A custom \`useTeamDirectory()\` hook wrapping fetch + reducer
- A reusable \`MemberCard\` component with initials fallback avatar
- The provided \`graphqlFetch\` helper — do NOT call \`fetch\` directly
- TypeScript — all props, state, and actions typed

**Must NOT use:**
- Apollo Client, urql, or any GraphQL library
- \`useState\` for filter or sort state

**Constraints:**
- Skills filter options derived from fetched data
- \`graphqlFetch\` simulates 400ms delay — do not modify it

---

## Acceptance Criteria

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 12 member cards via GraphQL |
| 2 | Search \`"lee"\` | Alice Lee + Karen Lee |
| 3 | Filter \`"Engineering"\` | 5 members |
| 4 | Toggle \`"Available"\` | Only available members |
| 5 | Click \`[React]\` skill | Members with React |
| 6 | Click \`[React]\` + \`[AWS]\` | Members with BOTH (AND logic) |
| 7 | Sort \`"Most Skills"\` | Leo Martin (5 skills) first |
| 8 | Dispatch \`RESET\` | All filters clear; 12 members |
| 9 | Dept + availability + skill combined | Intersection |
`,
  files: [
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useReducer, useEffect, useMemo, useState } from "react";
import "./styles.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  title: string;
  department: string;
  available: boolean;
  skills: string[];
  bio: string;
  avatarUrl: string | null;
}

interface GraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

type Availability = "all" | "available" | "busy";
type SortOption = "name-asc" | "name-desc" | "department" | "most-skills";

interface FilterState {
  search: string;
  department: string;
  availability: Availability;
  selectedSkills: string[];
  sort: SortOption;
}

type FilterAction =
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_DEPARTMENT"; payload: string }
  | { type: "SET_AVAILABILITY"; payload: Availability }
  | { type: "TOGGLE_SKILL"; payload: string }
  | { type: "SET_SORT"; payload: SortOption }
  | { type: "RESET" };

// ─── Mock GraphQL transport — do not modify ───────────────────────────────────

const MOCK_MEMBERS: Member[] = [
  { id: "1",  name: "Alice Lee",    title: "Staff Engineer",     department: "Engineering", available: true,  skills: ["React", "TypeScript", "AWS", "Node.js"],       bio: "Passionate about distributed systems and developer experience. Previously at Google.",   avatarUrl: null },
  { id: "2",  name: "Bob Chen",     title: "Senior PM",          department: "Product",     available: false, skills: ["Product", "Figma", "SQL"],                     bio: "Building product roadmaps that balance user needs and business goals.",                  avatarUrl: null },
  { id: "3",  name: "Carol Davis",  title: "Design Lead",        department: "Design",      available: true,  skills: ["Figma", "CSS", "Design Systems", "Sketch"],    bio: "Design systems enthusiast. Created the component library used by 4 product teams.",    avatarUrl: null },
  { id: "4",  name: "Dan Evans",    title: "SDE III",            department: "Engineering", available: true,  skills: ["Go", "gRPC", "PostgreSQL", "AWS"],             bio: "Backend specialist focused on high-throughput services and database optimization.",     avatarUrl: null },
  { id: "5",  name: "Eva Foster",   title: "ML Engineer",        department: "Data",        available: false, skills: ["Python", "TensorFlow", "AWS", "Spark"],        bio: "Working on recommendation systems that serve 10M daily active users.",                 avatarUrl: null },
  { id: "6",  name: "Frank Green",  title: "Frontend Lead",      department: "Engineering", available: true,  skills: ["React", "TypeScript", "CSS", "GraphQL"],       bio: "Building accessible, performant UIs. Contributor to the React docs.",                  avatarUrl: null },
  { id: "7",  name: "Grace Hill",   title: "Brand Designer",     department: "Design",      available: true,  skills: ["Figma", "Illustrator", "Motion Design"],       bio: "Crafting brand identities and motion graphics for product launches.",                   avatarUrl: null },
  { id: "8",  name: "Hank Irwin",   title: "APM",                department: "Product",     available: false, skills: ["Analytics", "SQL", "Product"],                 bio: "Data-driven product manager with a background in growth experimentation.",              avatarUrl: null },
  { id: "9",  name: "Iris Jones",   title: "Data Scientist",     department: "Data",        available: true,  skills: ["Python", "R", "Machine Learning", "Spark"],    bio: "Turning messy data into actionable insights for the growth and retention teams.",      avatarUrl: null },
  { id: "10", name: "Jake King",    title: "SDE I",              department: "Engineering", available: true,  skills: ["React", "TypeScript", "Node.js"],              bio: "Junior engineer ramping up fast. Open source contributor. Loves TypeScript.",          avatarUrl: null },
  { id: "11", name: "Karen Lee",    title: "UX Researcher",      department: "Design",      available: false, skills: ["User Research", "Figma", "Usability Testing"], bio: "Bridging the gap between user needs and product decisions through rigorous research.",  avatarUrl: null },
  { id: "12", name: "Leo Martin",   title: "Principal Engineer", department: "Engineering", available: true,  skills: ["AWS", "TypeScript", "React", "Go", "gRPC"],    bio: "Platform architect. Designed the microservices foundation running all core services.", avatarUrl: null },
];

async function graphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphQLResponse<T>> {
  await new Promise((res) => setTimeout(res, 400));
  if (query.includes("teamMembers")) {
    return { data: { teamMembers: MOCK_MEMBERS } as T };
  }
  return { data: {} as T, errors: [{ message: "Unknown query" }] };
}

// ─── GraphQL query ────────────────────────────────────────────────────────────

// TODO: define the query string to fetch all teamMembers fields
// graphqlFetch will match on query.includes("teamMembers")
const TEAM_MEMBERS_QUERY = \`
  query GetTeamMembers {
    teamMembers {
      id
      name
      title
      department
      available
      skills
      bio
      avatarUrl
    }
  }
\`;

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialFilterState: FilterState = {
  search: "",
  department: "All Departments",
  availability: "all",
  selectedSkills: [],
  sort: "name-asc",
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  // TODO: implement each case
  // TOGGLE_SKILL: add skill if not in array, remove if it is — return new array
  // RESET: return initialFilterState
  switch (action.type) {
    case "SET_SEARCH":      return { ...state, search: action.payload };
    case "SET_DEPARTMENT":  return { ...state, department: action.payload };
    case "SET_AVAILABILITY":return { ...state, availability: action.payload };
    case "SET_SORT":        return { ...state, sort: action.payload };
    case "TOGGLE_SKILL":    return state; // TODO: implement toggle
    case "RESET":           return state; // TODO: return initialFilterState
    default:                return state;
  }
}

// ─── Custom hook ──────────────────────────────────────────────────────────────

function useTeamDirectory() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState);

  useEffect(() => {
    // TODO: call graphqlFetch<{ teamMembers: Member[] }>(TEAM_MEMBERS_QUERY)
    // On success: setMembers(result.data.teamMembers)
    // On errors field present: setError(result.errors[0].message)
    // Always: setLoading(false)
  }, []);

  // TODO: derive unique sorted skills from all members
  const allSkills = useMemo<string[]>(() => [], [members]);

  // TODO: derive unique sorted departments from all members
  const allDepartments = useMemo<string[]>(() => ["All Departments"], [members]);

  // TODO: compute filteredMembers from members + filterState
  // 1. search (name or bio, case-insensitive)
  // 2. department
  // 3. availability: "available" → available === true, "busy" → available === false
  // 4. selectedSkills: ALL selected skills must appear in member.skills (AND)
  // 5. sort
  const filteredMembers = useMemo<Member[]>(() => [], [members, filterState]);

  return { members, filteredMembers, allSkills, allDepartments, loading, error, filterState, dispatch };
}

// ─── MemberCard component ─────────────────────────────────────────────────────

interface MemberCardProps {
  member: Member;
  selectedSkills: string[];
  dispatch: React.Dispatch<FilterAction>;
}

function MemberCard({ member, selectedSkills, dispatch }: MemberCardProps) {
  const initials = member.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const bioSnippet = member.bio.length > 100 ? member.bio.slice(0, 100) + "..." : member.bio;

  // TODO: render full card with initials avatar, availability dot, name, title, dept badge, skills, bio
  return (
    <div className="member-card">
      <div className="card-top">
        <div className="avatar">{initials}</div>
        <span className={\`avail-dot \${member.available ? "available" : "busy"}\`} title={member.available ? "Available" : "Busy"} />
      </div>
      <p className="member-name">{member.name}</p>
      <p className="member-title">{member.title}</p>
      <span className="dept-badge">{member.department}</span>
      <p className="member-bio">{bioSnippet}</p>
      {/* TODO: render skills as tags */}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function App() {
  const { filteredMembers, allSkills, allDepartments, loading, error, filterState, dispatch } = useTeamDirectory();

  if (loading) return <div className="status-msg">Loading team...</div>;
  if (error) return <div className="status-msg error">{error}</div>;

  return (
    <div className="directory">
      <div className="dir-header">
        <h1>Team Directory</h1>
        <span className="count">{filteredMembers.length} members</span>
      </div>

      <div className="controls-row">
        <input
          className="search-input"
          placeholder="Search by name or bio..."
          value={filterState.search}
          onChange={(e) => dispatch({ type: "SET_SEARCH", payload: e.target.value })}
        />
        <select
          className="dept-select"
          value={filterState.department}
          onChange={(e) => dispatch({ type: "SET_DEPARTMENT", payload: e.target.value })}
        >
          {allDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          className="avail-select"
          value={filterState.availability}
          onChange={(e) => dispatch({ type: "SET_AVAILABILITY", payload: e.target.value as Availability })}
        >
          <option value="all">All</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
        </select>
        <select
          className="sort-select"
          value={filterState.sort}
          onChange={(e) => dispatch({ type: "SET_SORT", payload: e.target.value as SortOption })}
        >
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="department">Department</option>
          <option value="most-skills">Most Skills</option>
        </select>
        <button className="reset-btn" onClick={() => dispatch({ type: "RESET" })}>Reset</button>
      </div>

      <div className="skills-filter">
        <span className="filter-label">Skills:</span>
        {/* TODO: render a pill button for each skill in allSkills
            - active when skill is in filterState.selectedSkills
            - onClick dispatches TOGGLE_SKILL */}
        {allSkills.length === 0 && <span className="placeholder-hint">(skills load after fetch)</span>}
      </div>

      {filteredMembers.length === 0 ? (
        <p className="status-msg">No team members found.</p>
      ) : (
        <div className="member-grid">
          {filteredMembers.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              selectedSkills={filterState.selectedSkills}
              dispatch={dispatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
`,
    },
    {
      filename: "styles.css",
      language: "css",
      content: `* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 16px;
  font-family: system-ui, sans-serif;
  background: #f9fafb;
  color: #111;
}

.dir-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

h1 { margin: 0; font-size: 1.5rem; }
.count { font-size: 13px; color: #6b7280; }

.controls-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.search-input { flex: 1; min-width: 160px; }

.search-input,
.dept-select,
.avail-select,
.sort-select {
  padding: 7px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.reset-btn {
  padding: 7px 14px;
  border: 1px solid #6366f1;
  border-radius: 6px;
  background: #fff;
  color: #6366f1;
  font-size: 13px;
  cursor: pointer;
  font-weight: 600;
}

.reset-btn:hover { background: #ede9fe; }

.skills-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 14px;
}

.filter-label { font-size: 12px; font-weight: 600; color: #374151; }

.skill-pill {
  padding: 3px 10px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  font-size: 12px;
  background: #fff;
  cursor: pointer;
}

.skill-pill:hover { border-color: #6366f1; color: #6366f1; }
.skill-pill.active { background: #6366f1; color: #fff; border-color: #6366f1; }

.placeholder-hint { font-size: 12px; color: #9ca3af; font-style: italic; }

.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}

.member-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #6366f1;
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avail-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.avail-dot.available { background: #22c55e; }
.avail-dot.busy { background: #9ca3af; }

.member-name { margin: 0; font-weight: 700; font-size: 14px; }
.member-title { margin: 0; font-size: 12px; color: #6b7280; }

.dept-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  background: #ede9fe;
  color: #5b21b6;
  border-radius: 999px;
  padding: 2px 8px;
  margin: 2px 0;
}

.member-bio { margin: 4px 0 0; font-size: 12px; color: #4b5563; line-height: 1.4; }

.member-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.skill-tag {
  font-size: 10px;
  background: #f3f4f6;
  color: #374151;
  border-radius: 4px;
  padding: 2px 6px;
}

.status-msg {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-size: 15px;
}

.status-msg.error { color: #ef4444; }
`,
    },
  ],
};

export default reactGraphqlTeamDirectory;
