# Search Feature Documentation

## Overview
The Onboarding Tracker now includes a powerful search feature that allows you to quickly filter onboarding records across multiple fields.

## How to Use

### Basic Search
1. Locate the search input field at the top of the dashboard (above the filter dropdowns)
2. Type any search term in the "Search by name, UIN, manager, etc..." field
3. Results filter automatically as you type

### Search Fields
The search feature looks for matches in the following fields:

- **Name** - Employee's full name
- **UIN** - University Identification Number
- **Start Date** - Employee's start date
- **Manager/Supervisor** - Name of the employee's manager
- **LF** - Laserfiche form number
- **Hire Category** - Newhire, Rehire, Transfer, or Addjob
- **Hire Type** - Student, Staff, or Faculty
- **International Status** - Search "international" or "domestic"

### Search Tips

#### Case Insensitive
Search is not case-sensitive, so "JOHN", "john", and "John" all produce the same results.

#### Partial Matches
You don't need to type the complete term. For example:
- Searching "garcia" will find "Maria Garcia"
- Searching "123" will find UIN "123456"
- Searching "2025-01" will find dates like "2025-01-15"

#### International vs Domestic
- Search **"international"** to show only international hires
- Search **"domestic"** to show only domestic hires

#### Combining with Other Filters
The search works seamlessly with existing filters:
1. Use the search field for text-based filtering
2. Use dropdown filters for status (Active/Completed/Overdue)
3. Use dropdown filters for hire type (Student/Staff/Faculty)
4. Use sort dropdown to order results

All filters work together - the search respects your filter and sort selections.

### Examples

**Find by Name:**
```
Search: "maria"
Results: Shows all employees with "maria" in their name
```

**Find by UIN:**
```
Search: "527008790"
Results: Shows the employee with that specific UIN
```

**Find by Manager:**
```
Search: "jane"
Results: Shows all employees managed by someone named Jane
```

**Find by LF Number:**
```
Search: "780091"
Results: Shows the employee with that LF form number
```

**Find International Hires:**
```
Search: "international"
Results: Shows only international hires
```

**Find by Hire Category:**
```
Search: "rehire"
Results: Shows all rehire employees
```

**Find Students with Specific Manager:**
1. Search: "bob" (to find employees managed by Bob)
2. Select "Student" from Hire Type dropdown
3. Results: Shows only students managed by Bob

## Technical Notes

- Search updates in real-time (as you type)
- Empty search field shows all records (respecting other filters)
- Search is performed client-side for instant results
- No need to press Enter or click a search button
