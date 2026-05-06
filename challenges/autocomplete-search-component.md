# Autocomplete Search Component

**Difficulty:** Medium
**Time Limit:** 45 minutes
**Framework:** React + TypeScript
**Topics:** Custom Hooks, Debouncing, Async State, Keyboard Navigation

---

## Problem Statement

You are building a user search component for an internal admin dashboard. As the user types, the component should fetch matching results from an API and display them in a dropdown. Typing should be debounced — the API must not be called on every keystroke, only after the user pauses.

## Functional Requirements

- [ ] Input field that accepts a search query
- [ ] Debounce API calls by 300ms (implement via a custom `useDebounce` hook)
- [ ] Show a loading indicator while the fetch is in progress
- [ ] Display a dropdown list of matching users below the input
- [ ] Show "No results found" when the query returns an empty array
- [ ] Show an error message if the fetch fails
- [ ] Keyboard navigation: `ArrowDown` / `ArrowUp` moves highlight, `Enter` selects, `Escape` closes dropdown
- [ ] Clicking outside the component closes the dropdown
- [ ] Selecting a result populates the input with the user's name and closes the dropdown

## UI / Visual Specification

```
┌───────────────────────────────────────┐
│  User Search                          │
│  ┌───────────────────────────────┐    │
│  │ 🔍  Type to search users...   │    │
│  └───────────────────────────────┘    │
│                                       │
│  ┌───────────────────────────────┐    │
│  │ ▶ John Doe                    │    │  ← highlighted (ArrowDown)
│  │   Jane Smith                  │    │
│  │   Jonathan Williams           │    │
│  └───────────────────────────────┘    │
└───────────────────────────────────────┘
```

**States & Behavior:**
- **Idle / empty input:** dropdown is closed, no fetch
- **Typing (within debounce window):** no fetch yet
- **Loading:** spinner shown inside or below the input, previous results hidden
- **Results:** dropdown opens with matching users; highlighted row has a visible background
- **No results:** dropdown shows a single "No results found" row
- **Error:** dropdown shows "Failed to load results. Try again."
- **Selected:** dropdown closes, input value becomes the selected user's name
- **Escape / outside click:** dropdown closes, input value unchanged

## Technical Requirements

**Must use:**
- `useState`, `useEffect`, `useRef`
- A custom `useDebounce<T>(value: T, delay: number): T` hook — implement it yourself
- TypeScript — all props and state must be typed

**Must NOT use:**
- External debounce/throttle utilities (lodash, `use-debounce` package, etc.)
- External state management libraries (Redux, Zustand, Jotai)
- Class components

**Constraints:**
- The mock `searchUsers` function below simulates a 200ms network delay. Do not modify it.
- The debounce delay is exactly 300ms.
- Memory leaks matter: cancel or ignore in-flight requests when the component unmounts or the query changes before the result arrives.

## Starter Files

**`AutocompleteSearch.tsx`**
```tsx
import { useState, useEffect, useRef } from "react";
import "./AutocompleteSearch.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
}

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const MOCK_USERS: User[] = [
  { id: 1, name: "John Doe",          email: "john@example.com" },
  { id: 2, name: "Jane Smith",        email: "jane@example.com" },
  { id: 3, name: "Jonathan Williams", email: "jonathan@example.com" },
  { id: 4, name: "Julia Roberts",     email: "julia@example.com" },
  { id: 5, name: "James Brown",       email: "james@example.com" },
  { id: 6, name: "Alice Johnson",     email: "alice@example.com" },
  { id: 7, name: "Bob Martinez",      email: "bob@example.com" },
];

async function searchUsers(query: string): Promise<User[]> {
  if (!query.trim()) return [];
  await new Promise((res) => setTimeout(res, 200));
  if (query === "error") throw new Error("Network error");
  return MOCK_USERS.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase())
  );
}

// ─── Your implementation ──────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  // TODO: implement
  return value;
}

export default function AutocompleteSearch() {
  // TODO: implement

  return (
    <div className="autocomplete-wrapper">
      <label htmlFor="user-search">User Search</label>
      {/* TODO: build the component */}
    </div>
  );
}
```

**`AutocompleteSearch.css`**
```css
.autocomplete-wrapper {
  position: relative;
  width: 320px;
  font-family: sans-serif;
}

.autocomplete-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-sizing: border-box;
  outline: none;
}

.autocomplete-input:focus {
  border-color: #4f46e5;
}

.autocomplete-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  max-height: 240px;
  overflow-y: auto;
}

.autocomplete-item {
  padding: 10px 14px;
  cursor: pointer;
  font-size: 14px;
}

.autocomplete-item:hover,
.autocomplete-item--highlighted {
  background-color: #f0f0ff;
}

.autocomplete-item__name {
  font-weight: 500;
}

.autocomplete-item__email {
  font-size: 12px;
  color: #6b7280;
}

.autocomplete-status {
  padding: 10px 14px;
  font-size: 13px;
  color: #6b7280;
}

.autocomplete-status--error {
  color: #ef4444;
}
```

## Acceptance Criteria / Test Cases

| # | Action | Expected Result |
|---|---|---|
| 1 | Type `"jo"`, wait 300ms | Dropdown opens with John, Jonathan |
| 2 | Type `"j"`, immediately type `"jo"` | Only one fetch fires (for `"jo"`) |
| 3 | Type `"xyz"` | "No results found" shown |
| 4 | Type `"error"` | Error message shown |
| 5 | Press `ArrowDown` once | First item highlighted |
| 6 | Press `ArrowDown` twice, then `Enter` | Second item selected; input shows name; dropdown closes |
| 7 | While dropdown open, press `Escape` | Dropdown closes |
| 8 | Click anywhere outside the component | Dropdown closes |
| 9 | Select a user, then clear the input | Dropdown stays closed until typing starts |
| 10 | Unmount component mid-fetch | No state update error in console |
