# Tasks UI Redesign - Quick Start Guide

## 🚀 Getting Started

### Step 1: Run the Database Migration

Before using the new Tasks UI, you need to set up the database schema for the notes system.

1. Open your **Supabase Dashboard** → **SQL Editor**
2. Open the file `task_notes_migration.sql`
3. Copy and paste the entire contents into the SQL Editor
4. Click **Run** to execute the migration

This will:
- Add a `notes` column to the `reminders` table
- Create a new `task_notes` table for comments
- Set up indexes for better performance
- Configure Row Level Security (RLS) policies

### Step 2: Navigate to the Tasks Page

1. Open your application
2. Go to **Reminders & Tasks** page
3. Click on the **Tasks** tab

You should now see the completely redesigned Tasks UI!

## 🎯 Features Overview

### Week Navigation
- **Week Strip** at the top shows the current week (Monday-Sunday)
- **Today** is highlighted with a green border
- **Task badges** show how many tasks are due on each day
- **Previous/Next** buttons to navigate weeks
- **Today button** to jump back to the current week

### View Modes

#### List View (Default)
- **Quick Add Row** - Add tasks instantly without opening a modal
- **Full table** with all task details
- **Colored bands** on Priority and Status columns for instant visual identification
- **Click any row** to open the task drawer
- **Action buttons** (Edit, Delete) appear on hover

#### Board View (Kanban)
- Click the **Board** button to switch
- **4 columns**: Pending, In Progress, Review, Completed
- **Task cards** with priority badges
- **Drag tasks** between columns (coming soon)
- **Click any card** to open the drawer

### Filtering System

**Search Box:**
- Type to search task titles and descriptions
- Live filtering as you type

**Status Chips:**
- Click to filter by status: All, Pending, In Progress, Review, Completed
- Active filter shown in black

**Priority Chips:**
- Click to filter by priority: All, Low, Medium, High
- Color-coded dots for quick identification

**Assignee Dropdown:**
- Filter tasks by assigned user
- Only shows users with assigned tasks

**Active Filters:**
- See all active filters at the bottom
- Click **X** on any filter to remove it
- Click **Clear all** to reset all filters

### Task Drawer

When you click on a task (row or card), a drawer slides in from the right showing:

**Overview Section:**
- Task title and description
- Status, Priority, and Due Date badges

**Notes Section:**
- All comments/notes on the task
- Author avatars and timestamps
- **Add note input** at the bottom
- Press Enter or click the send button to add

**Actions:**
- **Close** - Close the drawer
- **Mark Complete** - Mark the task as done (if not already completed)

### Dark Mode

Click the **sun/moon icon** in the top right to toggle between:
- **Light Mode** - Clean, professional white background
- **Dark Mode** - Easy on the eyes with dark gray backgrounds

The entire UI smoothly transitions between themes!

## 💡 Usage Tips

### Quick Add a Task
1. Type the title in the **Quick Add** row
2. Set the due date
3. Click **Add** or press Enter
4. The task is created instantly with default values

### Add Notes to a Task
1. Click on any task to open the drawer
2. Scroll to the **Notes** section
3. Type your note in the input box
4. Click the send button or press Enter
5. Your note appears with your avatar and timestamp

### Filter Tasks Efficiently
1. Use **Status chips** for quick filtering by workflow stage
2. Use **Priority chips** to focus on urgent tasks
3. Use **Search** to find specific tasks
4. Combine filters for precise results

### Navigate by Week
1. Use the **week strip** to see task distribution
2. Click **Previous/Next** to plan ahead or review past weeks
3. Numbers on days show task counts
4. Click **Today** to quickly return to the current week

### Switch Views Based on Your Work Style
- Use **List View** for detailed task management
- Use **Board View** for visual workflow management
- Both views share the same filters and data

## 🎨 Color Coding Reference

### Priority Colors
- **High**: Red background (#ef4444) - Urgent attention needed
- **Medium**: Amber background (#f59e0b) - Important but not urgent
- **Low**: Gray background (#9ca3af) - Can wait

### Status Colors
- **Pending**: Slate/Gray - Not started yet
- **In Progress**: Teal/Green-blue - Currently being worked on
- **Review**: Amber/Orange - Needs review before completion
- **Completed**: Emerald/Green - Done and finished

### Special Indicators
- **Overdue** tasks show a red "OVERDUE" badge
- **Today's due date** badges are highlighted
- **Green border** on today in the week strip
- **Green badges** on days with tasks

## 🔍 Troubleshooting

**Q: I don't see the new UI**
- Make sure you're on the **Tasks** tab (not Reminders)
- Refresh the page
- Clear your browser cache

**Q: Notes aren't saving**
- Make sure you ran the database migration
- Check your Supabase connection
- Check the browser console for errors

**Q: Tasks aren't loading**
- Check your internet connection
- Verify your Supabase credentials
- Make sure the reminders table exists in your database

**Q: I can't add tasks**
- Make sure you have the proper permissions
- Check that you're logged in
- Verify your business and branch are set

**Q: Dark mode isn't working**
- Try clicking the sun/moon icon again
- Refresh the page
- The theme is stored in component state (not persisted)

## 📱 Mobile Experience

The Tasks UI is fully responsive:
- **Week strip** adapts for smaller screens
- **Filters** stack vertically on mobile
- **Drawer** takes full screen width
- **Table** scrolls horizontally if needed
- **Board columns** stack on narrow screens

## 🎓 Best Practices

1. **Use Quick Add** for simple tasks, open the full modal for complex ones
2. **Add notes** to tasks for context and updates
3. **Filter by assignee** to focus on your team members' work
4. **Use Board View** for daily standups and workflow discussions
5. **Check the week strip** every morning to plan your day
6. **Toggle dark mode** when working in low-light environments
7. **Add due dates** to all tasks for better planning

## 🔥 Power User Features

- **Keyboard shortcuts**: Press Enter in Quick Add to create tasks instantly
- **Bulk viewing**: Use filters to see all high-priority or overdue tasks
- **Notes as activity log**: Use notes to track progress and decisions
- **Week navigation**: Plan sprints by viewing multiple weeks
- **Color coding**: Train your eye to quickly spot priorities

## ✨ What's Next?

Future enhancements planned:
- Drag-and-drop task reordering in Board view
- Task templates for common workflows
- Bulk actions (select multiple tasks)
- Email notifications for task assignments
- Task recurring/repeating functionality
- File attachments on tasks

---

**Enjoy the new Tasks UI!** 🎉

If you have any questions or find any issues, please report them to the development team.

