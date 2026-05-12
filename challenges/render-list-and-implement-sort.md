# Article Sorting

Create a React application called "Article Sorting" that displays a list of articles and allows users to sort them based on upvotes and publication date. Some core functionalities have already been implemented, but the application is not complete. Application requirements are detailed below, and the finished application must pass all of the unit tests.

Detailed Requirements

The Articles component takes an array of articles as a prop. Each element of this array is an object with three properties: a string title, a number upvotes, and a string date in the format YYYY-MM-DD.
By default, the articles should be displayed in a table ordered by the number of upvotes in descending order.
Clicking on the "Most Upvoted" button should reorder and display the articles by the number of upvotes in descending order.
Clicking on the "Most Recent" button should reorder and display the articles by date in descending order.
You can assume that each article has a unique publish date and number of upvotes.

Sample Interaction
Initial State

The articles are displayed in the table, ordered by the number of upvotes in descending order.
The "Most Upvoted" button and the "Most Recent" button are displayed.
User Action 1

User clicks "Most Recent" button.
The articles are reordered and displayed by date in descending order.
User Action 2

User clicks "Most Upvoted" button.
The articles are reordered and displayed by the number of upvotes in descending order.

## Challenge initial State

```
import "h8k-components";

import Articles from "./components/Articles";

import "./App.css";

function App({ articles }) {
  const handleMostUpvoted = () => {
    // Logic for most upvoted articles
  };

  const handleMostRecent = () => {
    // Logic for most recent articles
  };
  return (
    <>
      <h8k-navbar header="Sorting Articles"></h8k-navbar>
      <div className="App">
        <div className="layout-row align-items-center justify-content-center my-20 navigation">
          <label className="form-hint mb-0 text-uppercase font-weight-light">
            Sort By
          </label>
          <button
            data-testid="most-upvoted-link"
            className="small"
            onClick={handleMostUpvoted}
          >
            Most Upvoted
          </button>
          <button
            data-testid="most-recent-link"
            className="small"
            onClick={handleMostRecent}
          >
            Most Recent
          </button>
        </div>
        <Articles articles={articles} />
      </div>
    </>
  );
}

export default App;

```

---

```
export const ARTICLES_DATA = [
  {
    title: "A message to our customers",
    upvotes: 12,
    date: "2020-01-24",
  },
  {
    title: "Alphabet earnings",
    upvotes: 22,
    date: "2019-11-23",
  },
  {
    title: "Artificial Mountains",
    upvotes: 2,
    date: "2019-11-22",
  },
  {
    title: "Scaling to 100k Users",
    upvotes: 72,
    date: "2019-01-21",
  },
  {
    title: "the Emu War",
    upvotes: 24,
    date: "2019-10-21",
  },
  {
    title: "What's SAP",
    upvotes: 1,
    date: "2019-11-21",
  },
  {
    title: "Simple text editor has 15k monthly users",
    upvotes: 7,
    date: "2010-12-31",
  },
];

```

---

```
import React from "react";

function Articles({ articles = [] }) {
  return (
    <div className="card w-50 mx-auto">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Upvotes</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr data-testid="article" key="article-index">
            <td data-testid="article-title">Article 1 title</td>
            <td data-testid="article-upvotes">Article 1 upvotes</td>
            <td data-testid="article-date">Article 1 date</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default Articles;

```
