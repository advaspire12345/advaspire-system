# UI Coding Standards

## Component Library

**ONLY use shadcn/ui components for all UI elements in this project.**

- All UI components must come from shadcn/ui
- **DO NOT** create custom components
- **DO NOT** use other component libraries
- If a component doesn't exist in shadcn/ui, compose existing shadcn/ui components together

### Installing Components

```bash
npx shadcn@latest add <component-name>
```

### Available Components

Reference the full list at: https://ui.shadcn.com/docs/components

## Date Formatting

Use `date-fns` for all date formatting operations.

### Required Format

Dates must be displayed in the following format:

```
1st Sep 2025
2nd Aug 2025
3rd Apr 2026
4th Jun 2024
```

### Implementation

```typescript
import { format } from "date-fns";

// Format: ordinal day + abbreviated month + full year
const formattedDate = format(date, "do MMM yyyy");
```

### Examples

```typescript
import { format } from "date-fns";

const date1 = new Date(2025, 8, 1);  // September 1, 2025
format(date1, "do MMM yyyy"); // "1st Sep 2025"

const date2 = new Date(2025, 7, 2);  // August 2, 2025
format(date2, "do MMM yyyy"); // "2nd Aug 2025"

const date3 = new Date(2026, 3, 3);  // April 3, 2026
format(date3, "do MMM yyyy"); // "3rd Apr 2026"

const date4 = new Date(2024, 5, 4);  // June 4, 2024
format(date4, "do MMM yyyy"); // "4th Jun 2024"
```
