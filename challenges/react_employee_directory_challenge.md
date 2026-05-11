# React: Employee Directory

## Problem Statement

Create an **Employee Directory** where users can:

- Add employees
- Filter employees by department
- Search employees by role
- Remove employees from the list

You need to edit the following components within the project structure:

- `EmployeeDirectory.js`
- `EmployeeForm.js`
- `EmployeeFilter.js`
- `EmployeeList.js`

The application should function according to the requirements described below.

---

## Functionality Requirements

### Initial State

- The `name`, `role`, and `contact` input boxes should be empty.
- The department dropdown should have `"Select a Department"` selected by default.
- No employees should be displayed initially.
- The message `"No Employees Added."` should be shown when there are no employees.

---

## Adding Employees

Users should be able to add employees using the provided input fields and department dropdown.

Each employee must include:

- Name
- Role
- Department
- Contact

The contact field should be of type `email`.

### Requirements

- Employees should be displayed in the exact order they were created.
- All fields are required.
- If any field is empty, show the alert:

```txt
All fields are required!
```

---

## Filtering Employees

Users should be able to filter employees by department using a dropdown.

### Requirements

- The department filter should display only employees from the selected department.
- If no employees exist for the selected department, display:

```txt
No Employees Added.
```

---

## Searching Employees

Users should be able to search employees based on their role.

### Requirements

- The search input should filter employees by role.
- If no employees match the search query, display:

```txt
No Employees Added.
```

---

## Combined Filter and Search

Filtering by department and searching by role should work together.

### Example

If the user filters by:

```txt
Department: IT
```

And searches for:

```txt
Role: Developer
```

Then the application should display only employees who are in the `IT` department and have the `Developer` role.

---

## Removing Employees

Users should be able to remove employees using the `"Remove"` button.

### Requirements

- The employee list should update dynamically after removing an employee.
- If all employees are removed, display:

```txt
No Employees Added.
```

---

## Sample Interaction

### Initial State

- All input fields are empty.
- The department dropdown shows `"Select a Department"`.
- The employee list shows:

```txt
No Employees Added.
```

---

### User Action 1

The user adds the following employee:

```txt
Name: John Smith
Role: Developer
Department: IT
Contact: john@company.com
```

Expected result:

- `John Smith` appears in the employee list.

---

### User Action 2

The user adds the following employee:

```txt
Name: Sarah Johnson
Role: Manager
Department: HR
Contact: sarah@company.com
```

Expected result:

- Both employees appear in the list.

---

### User Action 3

The user filters by:

```txt
Department: IT
```

Expected result:

- Only `John Smith` is displayed.

---

### User Action 4

The user searches for:

```txt
Role: Manager
```

Expected result:

- Only `Sarah Johnson` is displayed.

---

### User Action 5

The user filters by:

```txt
Department: IT
```

And searches for:

```txt
Role: Developer
```

Expected result:

- Only `John Smith` is displayed.

---

### User Action 6

The user removes `John Smith`.

Expected result:

- The message `"No Employees Added."` is displayed because both filters are still active.

---

## Important Note

Email addresses are guaranteed to be unique identifiers.

The application will never receive two employees with the same email, whether or not their names match.

Therefore, you do not need to handle duplicate-email scenarios.
