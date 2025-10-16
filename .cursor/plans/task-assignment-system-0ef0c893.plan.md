<!-- 0ef0c893-f7a4-4c25-b43c-6592fd84bbd4 6058f642-0407-43e4-9912-e66c669f1b95 -->
# Task Assignment System Implementation

## Overview

Transform the Reminders page into a dual-purpose "Reminders & Tasks" system where:

- **Reminders**: Personal sticky notes (existing functionality)
- **Tasks**: Assignable work items with role-based permissions

## Database Changes

### 1. Update Reminders Table Schema

Current schema has:

- `reminder_id` (PK, GENERATED ALWAYS AS IDENTITY)
- `owner_id` (integer, FK to users)
- `title`, `body`, `remind_date` (date)
- `resolved` (boolean, default false)
- `business_id`, `branch_id`, `sale_id`

Add new columns to support task assignment:

- `assigned_to` (integer, nullable): User ID of the assigned user - FK to users(user_id)
- `assigned_by` (integer, nullable): User ID who assigned the task - FK to users(user_id)
- `is_task` (boolean, default false): Distinguishes tasks from reminders
- `completed_by` (integer, nullable): User ID who marked it complete - FK to users(user_id)
- `completed_at` (timestamp with time zone, nullable): When it was completed

Migration file: Create `task_assignment_migration.sql`

```sql
ALTER TABLE public.reminders 
ADD COLUMN assigned_to integer,
ADD COLUMN assigned_by integer,
ADD COLUMN is_task boolean DEFAULT false,
ADD COLUMN completed_by integer,
ADD COLUMN completed_at timestamp with time zone,
ADD CONSTRAINT reminders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(user_id),
ADD CONSTRAINT reminders_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(user_id),
ADD CONSTRAINT reminders_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(user_id);
```

### 2. Add Database Indexes

```sql
CREATE INDEX idx_reminders_assigned_to ON reminders(assigned_to);
CREATE INDEX idx_reminders_assigned_by ON reminders(assigned_by);
CREATE INDEX idx_reminders_is_task ON reminders(is_task);
```

## Type Updates

### Update `src/types/multitenant.ts`

Extend the Reminder interface:

```typescript
export interface Reminder {
  reminder_id: number
  owner_id: number
  assigned_to?: number
  assigned_by?: number
  is_task: boolean
  completed_by?: number
  completed_at?: string
  // ... existing fields
}
```

## Role Permissions

### Update `src/contexts/RoleContext.tsx`

Add new permission `canAssignTasks`:

- Owner: true
- Admin: true  
- Manager: true
- Cashier: false

Add helper function `canAssignToUser(targetUserRole)` that enforces hierarchy:

- Owner/Admin can assign to anyone
- Manager cannot assign to Owner/Admin

## UI Components

### 1. View Toggle (Tabs)

Add tab switcher at top of page:

- "Reminders" tab (default): Sticky note view
- "Tasks" tab: List/table view

### 2. Tasks List View (`src/components/TasksList.tsx`)

Create new component with:

- Table/card layout showing: title, description, assigned to, due date, status
- Filter by: assigned user, status (pending/completed), date range
- Visual indicators for overdue tasks
- Actions: Edit, Complete, Delete (based on permissions)

### 3. Task Assignment Modal (`src/components/TaskAssignmentModal.tsx`)

New modal for creating/editing tasks:

- Title input
- Description textarea
- Due date picker
- User dropdown (filtered by role hierarchy)
- Priority selector (optional)
- Color picker (optional)

### 4. User Dropdown Component

Fetch users from database:

```typescript
const { data: users } = await supabase
  .from('users')
  .select('user_id, username, role, icon')
  .eq('business_id', user.business_id)
  .eq('active', true)
```

Filter users based on assigner's role:

- If Manager: exclude Owner and Admin roles
- Show username with role badge

## Page Logic Updates (`src/pages/Reminders.tsx`)

### 1. State Management

Add states:

- `viewMode`: 'reminders' | 'tasks'
- `showTaskModal`: boolean
- `editingTask`: Task | null
- `availableUsers`: User[]
- `taskFilters`: { assignedTo?, status?, dateRange? }

### 2. Data Fetching

Modify `fetchReminders()`:

```typescript
const { data } = await supabase
  .from('reminders')
  .select(`
    *,
    assigned_to_user:users!assigned_to(user_id, username, role, icon),
    assigned_by_user:users!assigned_by(user_id, username, role)
  `)
  .eq('business_id', user.business_id)
```

Split data by `is_task` flag for separate views.

### 3. Task Creation

New `createTask()` function:

- Validate user has `canAssignTasks` permission
- Validate target user based on role hierarchy
- Set `is_task: true`, `assigned_by: currentUserId`
- Insert into database

### 4. Task Completion

New `completeTask()` function:

- Allow completion if user is assignee OR assigner
- Set `resolved: true`, `completed_by: currentUserId`, `completed_at: now()`

### 5. Visibility Rules

- **Managers/Admins/Owners**: See all tasks in their branch
- **Cashiers**: Only see tasks assigned to them
- **Reminders**: Always personal (owner_id based)

## Notifications

### Create `src/components/TaskNotificationBanner.tsx`

- Display at top of page when user has pending tasks
- Show count of tasks assigned to current user
- Click to switch to Tasks tab
- Dismissible but reappears on new assignments

## Styling

### Update `src/pages/Reminders.module.css`

Add styles for:

- Tab switcher
- Task list layout
- Task cards (darker glass effect for dark mode)
- Assignment badges
- Status indicators (pending, overdue, completed)

Use theme CSS variables for consistency.

## Implementation Order

1. Database migration and type updates
2. Role permission updates
3. User fetching and filtering logic
4. Task Assignment Modal component
5. Tasks List component
6. Update Reminders page with tab switcher
7. Task CRUD operations
8. Notification banner
9. Styling and polish

### To-dos

- [ ] Create database migration for task assignment fields
- [ ] Update TypeScript interfaces for tasks
- [ ] Add canAssignTasks permission and hierarchy validation
- [ ] Create TaskAssignmentModal component
- [ ] Create TasksList component with table/card view
- [ ] Update Reminders page with tab switcher and task logic
- [ ] Create task notification banner component
- [ ] Apply theme-aware styling to task components