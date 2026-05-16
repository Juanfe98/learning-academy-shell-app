# React: GraphQL Team Directory

**Difficulty:** Hard
**Time Limit:** 65 minutes
**Framework:** React + TypeScript
**Topics:** GraphQL, fetch-based query, Card Components, Multi-Filter, Search, Sort, useReducer

---

## Problem Statement

Build a **Team Directory** that queries a mock GraphQL endpoint to fetch team members. Unlike the previous challenges, the data layer is GraphQL — you must write the query string and parse the response shape. Render results as cards. Users can search by name or bio, filter by department and availability, and filter by one or more skills (AND logic). Manage all filter/sort state with `useReducer` instead of multiple `useState` calls.

---

## Functional Requirements

- [ ] On mount, execute a GraphQL query against `graphqlFetch(query, variables)` to load team members
- [ ] Show loading and error states
- [ ] Each `MemberCard` displays: avatar (initials fallback), name, title, department badge, availability indicator (green dot = available, gray = busy), skills list, and bio snippet (max 100 chars)
- [ ] Search input filters by name or bio (case-insensitive, real-time)
- [ ] Department dropdown: `"All Departments"` + unique departments from data
- [ ] Availability toggle: `"All"` / `"Available"` / `"Busy"`
- [ ] Skills filter: rendered as clickable pill buttons; selecting multiple requires ALL skills (AND logic)
- [ ] Sort dropdown: `"Name A–Z"`, `"Name Z–A"`, `"Department"`, `"Most Skills"`
- [ ] All filters apply simultaneously
- [ ] `"No team members found."` when result is empty
- [ ] `"X members"` count label

---

## UI / Visual Specification

```
┌────────────────────────────────────────────────────────────────────────┐
│  Team Directory                                           12 members    │
│                                                                        │
│  [🔍 Search by name or bio...]   [Department ▼]   [Availability ▼]   │
│                                                                        │
│  Skills: [React] [TypeScript] [Node.js] [AWS] [Python] [Go] [Design] │
│          Active: [React ✕] [AWS ✕]                                    │
│                                                                        │
│  Sort: [Name A–Z ▼]                                                   │
│                                                                        │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐│
│  │  [AL]  ●           │  │  [BC]  ○           │  │  [CD]  ●           ││
│  │  Alice Lee         │  │  Bob Chen          │  │  Carol Davis       ││
│  │  Staff Engineer    │  │  Senior PM         │  │  Design Lead       ││
│  │  [Engineering]     │  │  [Product]         │  │  [Design]          ││
│  │  React TypeScript  │  │  Figma Product...  │  │  Figma Sketch CSS  ││
│  │  AWS Node.js       │  │                    │  │                    ││
│  │  "Passionate about │  │  "Building product │  │  "Design systems   ││
│  │   distributed..."  │  │   roadmaps that..."│  │   enthusiast..."   ││
│  └────────────────────┘  └────────────────────┘  └────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Requirements

**Must use:**
- `useReducer` for all filter/sort state (one action per filter type + a `RESET` action)
- A custom `useTeamDirectory()` hook wrapping the fetch and reducer
- A reusable `MemberCard` component
- The `graphqlFetch` helper (provided) — do NOT use `fetch` directly
- TypeScript — all props, state, and actions typed

**Must NOT use:**
- Apollo Client, urql, or any GraphQL client library — raw `graphqlFetch` only
- External component libraries
- `useState` for filter/sort state (those must be in the reducer)

**Constraints:**
- Skills filter options must be derived from fetched data
- Avatar renders member initials when no image is present
- `graphqlFetch` simulates 400ms delay — do not modify it

---

## Starter Files

**`TeamDirectory.tsx`**
```tsx
import { useReducer, useEffect } from "react";

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

// ─── Mock GraphQL transport — do not modify ───────────────────────────────────

const MOCK_MEMBERS: Member[] = [
  { id: "1",  name: "Alice Lee",      title: "Staff Engineer",       department: "Engineering", available: true,  skills: ["React", "TypeScript", "AWS", "Node.js"],        bio: "Passionate about distributed systems and developer experience. Previously at Google.",          avatarUrl: null },
  { id: "2",  name: "Bob Chen",       title: "Senior PM",            department: "Product",     available: false, skills: ["Product", "Figma", "SQL"],                      bio: "Building product roadmaps that balance user needs and business goals.",                         avatarUrl: null },
  { id: "3",  name: "Carol Davis",    title: "Design Lead",          department: "Design",      available: true,  skills: ["Figma", "CSS", "Design Systems", "Sketch"],     bio: "Design systems enthusiast. Created the component library used by 4 product teams.",           avatarUrl: null },
  { id: "4",  name: "Dan Evans",      title: "SDE III",              department: "Engineering", available: true,  skills: ["Go", "gRPC", "PostgreSQL", "AWS"],              bio: "Backend specialist focused on high-throughput services and database optimization.",            avatarUrl: null },
  { id: "5",  name: "Eva Foster",     title: "ML Engineer",          department: "Data",        available: false, skills: ["Python", "TensorFlow", "AWS", "Spark"],         bio: "Working on recommendation systems that serve 10M daily active users.",                        avatarUrl: null },
  { id: "6",  name: "Frank Green",    title: "Frontend Lead",        department: "Engineering", available: true,  skills: ["React", "TypeScript", "CSS", "GraphQL"],        bio: "Building accessible, performant UIs. Contributor to the React docs.",                         avatarUrl: null },
  { id: "7",  name: "Grace Hill",     title: "Brand Designer",       department: "Design",      available: true,  skills: ["Figma", "Illustrator", "Motion Design"],        bio: "Crafting brand identities and motion graphics for product launches.",                          avatarUrl: null },
  { id: "8",  name: "Hank Irwin",     title: "APM",                  department: "Product",     available: false, skills: ["Analytics", "SQL", "Product"],                  bio: "Data-driven product manager with a background in growth experimentation.",                     avatarUrl: null },
  { id: "9",  name: "Iris Jones",     title: "Data Scientist",       department: "Data",        available: true,  skills: ["Python", "R", "Machine Learning", "Spark"],     bio: "Turning messy data into actionable insights for the growth and retention teams.",             avatarUrl: null },
  { id: "10", name: "Jake King",      title: "SDE I",                department: "Engineering", available: true,  skills: ["React", "TypeScript", "Node.js"],               bio: "Junior engineer ramping up fast. Open source contributor. Loves TypeScript.",                 avatarUrl: null },
  { id: "11", name: "Karen Lee",      title: "UX Researcher",        department: "Design",      available: false, skills: ["User Research", "Figma", "Usability Testing"], bio: "Bridging the gap between user needs and product decisions through rigorous research.",         avatarUrl: null },
  { id: "12", name: "Leo Martin",     title: "Principal Engineer",   department: "Engineering", available: true,  skills: ["AWS", "TypeScript", "React", "Go", "gRPC"],     bio: "Platform architect. Designed the microservices foundation running all core services.",        avatarUrl: null },
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

// ─── Your implementation ──────────────────────────────────────────────────────

// Define the GraphQL query:
const TEAM_MEMBERS_QUERY = `
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
`;

// Define the filter/sort state and action types for useReducer:
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

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  // TODO: implement
  return state;
}

const initialFilterState: FilterState = {
  search: "",
  department: "All Departments",
  availability: "all",
  selectedSkills: [],
  sort: "name-asc",
};

function useTeamDirectory() {
  // TODO: fetch via graphqlFetch, manage state with useReducer
  // Return: { members, loading, error, allSkills, allDepartments, filterState, dispatch, filteredMembers }
}

interface MemberCardProps {
  member: Member;
}

function MemberCard({ member }: MemberCardProps) {
  // TODO: implement — initials avatar fallback, bio truncated to 100 chars
  return <div>{member.name}</div>;
}

export default function TeamDirectory() {
  // TODO: use hook, build UI
  return (
    <div>
      <h1>Team Directory</h1>
    </div>
  );
}
```

---

## Acceptance Criteria / Test Cases

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 12 member cards fetched via GraphQL query |
| 2 | Search `"lee"` | Alice Lee + Karen Lee |
| 3 | Filter `"Engineering"` dept | 5 members (Alice, Dan, Frank, Jake, Leo) |
| 4 | Toggle `"Available"` | Only members with `available: true` |
| 5 | Click skill `[React]` | Members with React in skills |
| 6 | Click `[React]` + `[AWS]` | Members with BOTH React AND AWS |
| 7 | Sort `"Most Skills"` | Leo Martin (5 skills) first |
| 8 | Sort `"Department"` | Alphabetical by department |
| 9 | Dispatch `RESET` action | All filters clear; 12 members shown |
| 10 | Dept + availability + skill combined | Intersection of all three |
