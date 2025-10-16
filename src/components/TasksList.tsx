import React, { useState, useMemo } from 'react';
import { Reminder, TaskNote, TaskStatus } from '../types/multitenant';
import { supabase } from '../lib/supabaseClient';
import { getTaskIconElement } from '../utils/taskIcons';
import UserProfileModal from './UserProfileModal';
import TaskFilterBar from './TaskFilterBar';
import styles from './TasksList.module.css';

interface User {
  user_id: number;
  username: string;
  role: string;
  icon?: string;
  full_name?: string;
}

interface TasksListProps {
  tasks: Reminder[];
  currentUserId: number;
  userRole: string;
  onEditTask: (task: Reminder) => void;
  onCompleteTask: (taskId: number) => void;
  onDeleteTask: (taskId: number) => void;
  onAddTask?: () => void;
  availableUsers: User[];
  businessId: number;
  branchId?: number;
  onTasksChange?: () => void;
}

const STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'Review', 'Completed'];

// User Avatar Component
const UserAvatar: React.FC<{ user?: User; size?: 'small' | 'medium' | 'large' }> = ({ user, size = 'medium' }) => {
  const sizeMap = {
    small: '1.75rem',
    medium: '2.5rem',
    large: '3.5rem'
  };

  if (!user) {
    return (
      <div
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          borderRadius: '50%',
          background: 'rgba(107, 114, 128, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size === 'small' ? '0.75rem' : size === 'large' ? '1.25rem' : '1rem',
          color: '#6b7280',
          fontWeight: 600,
        }}
      >
        ?
      </div>
    );
  }

  if (user.icon) {
    return (
      <img
        src={`/images/icons/${user.icon}.png`}
        alt={user.full_name || user.username}
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid rgba(125, 141, 134, 0.3)',
        }}
        onError={(e) => {
          // Fallback to initials if image fails
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          if (target.parentElement) {
            const div = document.createElement('div');
            div.style.cssText = `
              width: ${sizeMap[size]};
              height: ${sizeMap[size]};
              border-radius: 50%;
              background: linear-gradient(135deg, #7d8d86 0%, #3e3f29 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${size === 'small' ? '0.75rem' : size === 'large' ? '1.25rem' : '1rem'};
              color: #ffffff;
              font-weight: 600;
            `;
            div.textContent = (user.full_name || user.username).charAt(0).toUpperCase();
            target.parentElement.appendChild(div);
          }
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #7d8d86 0%, #3e3f29 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size === 'small' ? '0.75rem' : size === 'large' ? '1.25rem' : '1rem',
        color: '#ffffff',
        fontWeight: 600,
      }}
    >
      {(user.full_name || user.username).charAt(0).toUpperCase()}
    </div>
  );
};

// Utility functions
function getStartOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(d.getDate() + n);
  return x;
}

const TasksList: React.FC<TasksListProps> = ({
  tasks,
  currentUserId,
  userRole,
  onEditTask,
  onCompleteTask,
  onDeleteTask,
  onAddTask,
  availableUsers,
  businessId,
  branchId,
  onTasksChange
}) => {
  // State
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [dark] = useState(true); // Default to dark mode
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'review' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<number | 'All'>('All');
  const [drawerTask, setDrawerTask] = useState<Reminder | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [quickTask, setQuickTask] = useState({ title: '', description: '', due: new Date().toISOString().slice(0, 10) });
  const [noteText, setNoteText] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Theme colors - Using your brand colors
  const appBg = dark ? '#1a1a1a' : '#f8f9fa';
  const text = dark ? '#ffffff' : '#1a1a1a'; // White text in dark mode
  const border = dark ? 'rgba(125, 141, 134, 0.2)' : '#d1d5db';

  // Get user info
  const getUser = (userId: number) => availableUsers.find(u => u.user_id === userId);
  const getUserName = (userId: number) => {
    const user = getUser(userId);
    return user?.full_name || user?.username || 'Unknown';
  };

  // Get task status based on resolved field
  const getTaskStatus = (task: Reminder): TaskStatus => {
    if (task.status) return task.status;
    return task.resolved ? 'Completed' : 'Pending';
  };


  // Filter tasks
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      // Convert TaskFilterBar status values to match database values
      const taskStatus = getTaskStatus(t);
      const statusMatch = statusFilter === 'all' || 
        (statusFilter === 'pending' && taskStatus === 'Pending') ||
        (statusFilter === 'in_progress' && taskStatus === 'In Progress') ||
        (statusFilter === 'review' && taskStatus === 'Review') ||
        (statusFilter === 'completed' && taskStatus === 'Completed');
      
      // Convert priority values (case-insensitive)
      const taskPriority = t.priority?.toLowerCase();
      const priorityMatch = priorityFilter === 'all' || taskPriority === priorityFilter;
      
      const assigneeMatch = assigneeFilter === 'All' || t.assigned_to === assigneeFilter;
      const searchMatch = query.trim() === '' || 
        t.title.toLowerCase().includes(query.toLowerCase()) || 
        t.body.toLowerCase().includes(query.toLowerCase());
      
      // Filter by current week if no specific date is selected
      // If a date is selected, show only that date's tasks
      let dateMatch = true;
      if (selectedDate) {
        dateMatch = t.remind_date === selectedDate.toISOString().slice(0, 10);
      } else {
        // Show tasks from the current week
        const weekStart = currentWeekStart.toISOString().slice(0, 10);
        const weekEnd = addDays(currentWeekStart, 6).toISOString().slice(0, 10);
        dateMatch = t.remind_date >= weekStart && t.remind_date <= weekEnd;
      }
      
      return statusMatch && priorityMatch && assigneeMatch && searchMatch && dateMatch;
    });
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, query, selectedDate, currentWeekStart, getTaskStatus]);

  // Status/Priority colors - Using your brand colors
  const statusBg = (s: TaskStatus) => {
    const map = {
      'Pending': dark ? 'rgba(125, 141, 134, 0.15)' : 'rgba(241,245,249,0.9)', // Sage tint
      'In Progress': dark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(204,251,241,0.9)', // Success green
      'Review': dark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(254,243,199,0.9)', // Warning amber
      'Completed': dark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(220,252,231,0.95)', // Success green
    };
    return map[s];
  };

  const priorityBg = (p: 'Low' | 'Medium' | 'High' | undefined) => {
    if (!p) return 'rgba(107, 114, 128, 0.3)';
    
    // Handle case-insensitive matching
    const priority = p?.toString().toLowerCase();
    
    if (priority === 'low') return 'rgba(34, 197, 94, 0.4)'; // Green
    if (priority === 'medium') return 'rgba(251, 191, 36, 0.4)'; // Warning amber  
    if (priority === 'high') return 'rgba(239, 68, 68, 0.4)'; // Danger red
    
    return 'rgba(107, 114, 128, 0.3)'; // Default gray
  };

  const priorityColor = (p: 'Low' | 'Medium' | 'High' | undefined) => {
    if (!p) return '#ffffff'; // White text for none priority
    
    // Handle case-insensitive matching
    const priority = p?.toString().toLowerCase();
    
    if (priority === 'low') return '#ffffff'; // White text on green
    if (priority === 'medium') return '#ffffff'; // White text on amber
    if (priority === 'high') return '#ffffff'; // White text on red
    
    return '#ffffff'; // Default white
  };

  const isOverdue = (due: string) => {
    const today = new Date().toISOString().slice(0, 10);
    return due < today;
  };

  // Week navigation
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const countTasksForDay = (date: Date) => {
    const dateISO = date.toISOString().slice(0, 10);
    return tasks.filter(t => t.remind_date === dateISO).length;
  };

  // Quick add task
  const handleQuickAdd = () => {
    if (!quickTask.title.trim()) return;
    
    // Create a new task through the parent component
    const newTask: Partial<Reminder> = {
      title: quickTask.title.trim(),
      body: quickTask.description?.trim() || '',
      remind_date: quickTask.due,
      assigned_to: currentUserId,
      assigned_by: currentUserId,
      is_task: true,
      resolved: false,
      status: 'Pending',
      priority: 'Medium',
      business_id: businessId,
      branch_id: branchId,
    };
    
    // We'll need to call the API directly here since we don't have a create callback
    createQuickTask(newTask);
  };

  const createQuickTask = async (taskData: Partial<Reminder>) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .insert([taskData])
        .select();

      if (error) {
        console.error('Database error:', error);
        alert(`Error creating task: ${error.message || 'Unknown error'}`);
        throw error;
      }
      
      setQuickTask({ title: '', description: '', due: new Date().toISOString().slice(0, 10) });
      onTasksChange?.();
    } catch (error) {
      console.error('Error creating quick task:', error);
      alert('Failed to create task. Check console for details.');
    }
  };

  // Notes functionality
  const fetchTaskNotes = async (taskId: number, task: Reminder) => {
    try {
      setLoadingNotes(true);
      const { data, error } = await supabase
        .from('task_notes')
        .select(`
          *,
          author:users!author_id(user_id, username, full_name, icon)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('Fetched notes:', data);
      // Update the drawer task with the fetched notes
      setDrawerTask({ ...task, taskNotes: data as TaskNote[] });
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim() || !drawerTask) return;

    const newNoteText = noteText.trim();

    try {
      const { data, error } = await supabase
        .from('task_notes')
        .insert([{
          task_id: drawerTask.reminder_id,
          author_id: currentUserId,
          text: newNoteText,
          business_id: businessId,
        }])
        .select(`
          *,
          author:users!author_id(user_id, username, full_name, icon)
        `);

      if (error) throw error;

      // Clear input immediately
      setNoteText('');
      
      // Add the new note to the existing notes list immediately
      if (data && data[0] && drawerTask) {
        const newNote = data[0] as TaskNote;
        setDrawerTask({
          ...drawerTask,
          taskNotes: [...(drawerTask.taskNotes || []), newNote]
        });
      }

      // Refresh the main task list to update notes count
      onTasksChange?.();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  // Open drawer and fetch notes
  const openDrawer = (task: Reminder) => {
    setDrawerTask(task);
    // Always fetch notes when opening drawer to ensure fresh data
    setLoadingNotes(true);
    fetchTaskNotes(task.reminder_id, task);
  };

  // Open user profile modal
  const openUserProfile = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // Close user profile modal
  const closeUserProfile = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  // Permissions
  const canEditTask = (task: Reminder) => {
    return userRole === 'Owner' || userRole === 'Admin' || task.assigned_by === currentUserId;
  };

  const canDeleteTask = (task: Reminder) => {
    return userRole === 'Owner' || userRole === 'Admin' || task.assigned_by === currentUserId;
  };

  // Change task status
  const changeTaskStatus = async (taskId: number, newStatus: TaskStatus) => {
    try {
      const updateData: any = {};
      
      if (newStatus === 'Completed') {
        updateData.resolved = true;
        updateData.completed_by = currentUserId;
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.resolved = false;
        updateData.completed_by = null;
        updateData.completed_at = null;
      }
      
      updateData.status = newStatus;

      const { error } = await supabase
        .from('reminders')
        .update(updateData)
        .eq('reminder_id', taskId);

      if (error) throw error;
      
      onTasksChange?.();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };


  // Clear all filters
  const handleClearAllFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('All');
  };

  return (
    <div className={styles.container} style={{ background: appBg, color: text }}>
      {/* Header */}
      <div className={styles.header} style={{ background: dark ? 'rgba(17,19,23,0.7)' : 'rgba(255,255,255,0.7)', borderBottom: `1px solid ${border}` }}>
        <div className={styles.headerContent}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewButton} ${viewMode === 'list' ? styles.viewButtonActive : ''}`}
              onClick={() => setViewMode('list')}
            >
              <i className="fa-solid fa-list"></i>
              List
            </button>
          <button
              className={`${styles.viewButton} ${viewMode === 'board' ? styles.viewButtonActive : ''}`}
              onClick={() => setViewMode('board')}
            >
              <i className="fa-solid fa-columns"></i>
              Board
            </button>
          </div>
          <div className={styles.headerActions}>
            {onAddTask && (
              <button
                className={styles.viewButton}
                onClick={onAddTask}
              >
                <i className="fa-solid fa-plus-circle"></i>
                Assign Task
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Week Strip */}
      <div className={styles.weekStrip}>
        <button className={styles.weekNavButton} onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} style={{ color: text }}>
          <i className="fa-solid fa-chevron-left" style={{ color: text }}></i>
        </button>
        <div className={styles.weekDays}>
          {weekDays.map(day => {
            const iso = day.toISOString().slice(0, 10);
            const isToday = iso === new Date().toISOString().slice(0, 10);
            const isSelected = selectedDate && selectedDate.toISOString().slice(0, 10) === iso;
            const cnt = countTasksForDay(day);
              return (
              <div 
                key={iso} 
                className={`${styles.weekDay} ${isToday ? styles.weekDayToday : ''} ${isSelected ? styles.weekDaySelected : ''}`} 
                style={{ borderColor: border, cursor: 'pointer' }}
                onClick={() => setSelectedDate(day)}
              >
                <div className={styles.weekDayName}>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className={styles.weekDayDate}>{day.getDate()}</div>
                {cnt > 0 && <span className={styles.weekDayBadge}>{cnt}</span>}
                </div>
              );
            })}
          </div>
        <button className={styles.weekNavButton} onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} style={{ color: text }}>
            <i className="fa-solid fa-chevron-right" style={{ color: text }}></i>
          </button>
        <button className={styles.todayButton} onClick={() => {
          const today = new Date();
          setCurrentWeekStart(getStartOfWeek(today));
          setSelectedDate(today);
        }} style={{ color: text }}>
          Today
        </button>
        </div>

      {/* Date Filter Indicator */}
      <div className={styles.dateFilterIndicator}>
        <span style={{ color: text }}>
          <i className="fa-solid fa-calendar-week" style={{ marginRight: '0.5rem', color: '#6366f1' }}></i>
          {selectedDate ? (
            <>Showing tasks for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</>
          ) : (
            <>Showing tasks for week of {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {addDays(currentWeekStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
          )}
        </span>
        {selectedDate && (
          <button 
            className={styles.clearDateButton}
            onClick={() => setSelectedDate(null)}
            style={{ color: text }}
          >
            <i className="fa-solid fa-times"></i>
          </button>
        )}
      </div>

      {/* Task Filter Bar */}
      <TaskFilterBar
        query={query}
        setQuery={setQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        assigneeFilter={assigneeFilter}
        setAssigneeFilter={setAssigneeFilter}
        availableUsers={availableUsers}
        onClearAll={handleClearAllFilters}
      />

      {/* Content */}
      <div className={styles.content}>
        {viewMode === 'list' ? (
          <div className={styles.tableCard}>
      <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ color: text }}>Priority</th>
                    <th style={{ color: text }}>Type</th>
                    <th style={{ color: text }}>Title</th>
                    <th style={{ color: text }}>Description</th>
                    <th style={{ color: text }}>Assigned To</th>
                    <th style={{ color: text }}>Due</th>
                    <th style={{ color: text }}>Status</th>
                    <th style={{ color: text }}>Actions</th>
                  </tr>
                </thead>
              <tbody>
                  {/* Quick add row */}
                  <tr className={styles.quickAddRow}>
                    <td><span className={styles.quickAddLabel} style={{ color: text }}>Quick Add</span></td>
                    <td></td>
                    <td>
                      <input
                        type="text"
                        placeholder="Task title"
                        value={quickTask.title}
                        onChange={e => setQuickTask(prev => ({ ...prev, title: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                        style={{ color: text, borderColor: border, background: dark ? 'rgba(125, 141, 134, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        placeholder="Optional description"
                        value={quickTask.description || ''}
                        onChange={e => setQuickTask(prev => ({ ...prev, description: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                        style={{ color: text, borderColor: border, background: dark ? 'rgba(125, 141, 134, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                      />
                    </td>
                    <td><span className={styles.quickAddLabel} style={{ color: text }}>You</span></td>
                    <td>
                      <input
                        type="date"
                        value={quickTask.due}
                        onChange={e => setQuickTask(prev => ({ ...prev, due: e.target.value }))}
                        style={{ color: text, borderColor: border, background: dark ? 'rgba(125, 141, 134, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                      />
                    </td>
                    <td><span className={styles.quickAddLabel} style={{ color: text }}>Pending</span></td>
                    <td>
                      <button 
                        className={styles.addButton} 
                        onClick={handleQuickAdd}
                        style={{ color: text }}
                      >
                        <i className="fa-solid fa-plus" style={{ color: text }}></i>
                      </button>
                  </td>
                  </tr>

                  {/* Task rows */}
                  {filtered.map(task => (
                    <tr key={task.reminder_id} className={styles.taskRow} onClick={() => openDrawer(task)}>
                      <td className={styles.bandCell}>
                        <div className={styles.band} style={{ background: priorityBg(task.priority), color: priorityColor(task.priority) }}>
                          <span className={styles.priorityBadge}>{task.priority || 'None'}</span>
                </div>
                  </td>
                      <td className={styles.iconCell}>
                        {task.product ? (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: '3rem',
                            height: '3rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            margin: '0 auto',
                            backdropFilter: 'blur(5px)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}>
                            {task.product.image_url ? (
                              <img 
                                src={task.product.image_url} 
                                alt={task.product.name}
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  borderRadius: '0.75rem', 
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              <i className="fa-solid fa-box" style={{ color: '#7d8d86', fontSize: '1.25rem' }}></i>
                            )}
                          </div>
                        ) : task.task_icon ? (
                          (() => {
                            const iconData = getTaskIconElement(task.task_icon, styles.taskIconImage);
                            return (
                              <div className={styles.taskIcon}>
                                <i 
                                  className={iconData.className}
                                  style={iconData.style}
                                  title={iconData.title}
                                />
                              </div>
                            );
                          })()
                        ) : null}
                  </td>
                      <td className={styles.titleCell}>
                        <div className={styles.titleContainer}>
                          <span className={`${styles.taskTitle} ${task.resolved ? styles.completedTask : ''}`}>{task.title}</span>
                          <div className={styles.titleBadges}>
                            {isOverdue(task.remind_date) && !task.resolved && <span className={styles.overdueBadge}>OVERDUE</span>}
                            <span className={styles.notesBadge} style={{ color: text }}>
                              <i className="fa-solid fa-comment" style={{ color: text }}></i> {typeof task.notesCount === 'number' ? task.notesCount : (task.taskNotes?.length || 0)}
                            </span>
                          </div>
                        </div>
                  </td>
                      <td className={`${styles.descCell} ${task.resolved ? styles.completedTask : ''}`}>{task.body}</td>
                      <td>
                        <div 
                          className={styles.userCell}
                          onClick={(e) => {
                            e.stopPropagation();
                            const user = getUser(task.assigned_to || 0);
                            if (user) openUserProfile(user);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <UserAvatar user={getUser(task.assigned_to || 0)} size="small" />
                          <span className={styles.userName}>{getUserName(task.assigned_to || 0)}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.dateBadge} style={{ background: isOverdue(task.remind_date) && !task.resolved ? (dark ? 'rgba(220, 38, 38, 0.2)' : '#fee2e2') : (dark ? 'rgba(125, 141, 134, 0.1)' : '#f1f5f9'), color: text }}>
                          <i className="fa-solid fa-calendar" style={{ color: text }}></i> {task.remind_date}
                        </span>
                  </td>
                      <td className={styles.bandCell} onClick={e => e.stopPropagation()}>
                        <div className={styles.band} style={{ background: statusBg(getTaskStatus(task)) }}>
                          <select 
                            className={styles.statusSelect}
                            value={getTaskStatus(task)}
                            onChange={(e) => changeTaskStatus(task.reminder_id, e.target.value as TaskStatus)}
                            onClick={e => e.stopPropagation()}
                            style={{ 
                              color: text,
                              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(text)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`
                            }}
                          >
                            {STATUSES.map(status => (
                              <option key={status} value={status}>
                                {status === 'Completed' ? '✓ ' + status : status}
                              </option>
                            ))}
                          </select>
                    </div>
                  </td>
                      <td className={styles.actionsCell} onClick={e => e.stopPropagation()}>
                        <div className={styles.actionButtons}>
                          <button onClick={() => openDrawer(task)} style={{ color: text }}>
                            <i className="fa-solid fa-comments" style={{ color: text }}></i>
                          </button>
                          {canEditTask(task) && (
                            <button onClick={() => onEditTask(task)} style={{ color: text }}>
                              <i className="fa-solid fa-pencil" style={{ color: text }}></i>
                            </button>
                          )}
                          {canDeleteTask(task) && (
                            <button onClick={() => { if (window.confirm(`Delete task: ${task.title}?`)) onDeleteTask(task.reminder_id); }} style={{ color: text }}>
                              <i className="fa-solid fa-trash" style={{ color: text }}></i>
                      </button>
                          )}
                      </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          <div className={styles.board}>
            {STATUSES.map(status => (
              <div key={status} className={styles.boardColumn}>
                <div className={styles.columnHeader}>
                  <span className={styles.columnTitle}>{status}</span>
                  <span className={styles.columnCount}>{filtered.filter(t => getTaskStatus(t) === status).length}</span>
                </div>
                <div className={styles.columnContent}>
                  {filtered.filter(t => getTaskStatus(t) === status).map(task => (
                    <div key={task.reminder_id} className={styles.taskCard}>
                      <div className={styles.taskCardHeader}>
                        <span className={styles.taskCardTitle}>{task.title}</span>
                        {task.priority && <span className={styles.priorityBadge}>{task.priority}</span>}
              </div>
                      <div className={styles.taskCardDesc}>{task.body}</div>
                      {task.product && (
                        <div className={styles.productInfo} style={{ color: text, opacity: 0.8, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                          {task.product.image_url ? (
                            <img 
                              src={task.product.image_url} 
                              alt={task.product.name}
                              className={styles.productImage}
                              style={{ 
                                width: '16px', 
                                height: '16px', 
                                borderRadius: '4px', 
                                marginRight: '0.25rem',
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            <i className="fa-solid fa-box" style={{ color: '#7d8d86', marginRight: '0.25rem' }}></i>
                          )}
                          {task.product.name}
                        </div>
                      )}
                      <div className={styles.taskCardFooter}>
                        <span className={styles.dateBadge} style={{ color: text }}>
                          <i className="fa-solid fa-calendar" style={{ color: text }}></i> {task.remind_date}
                        </span>
                        <span className={styles.notesBadge} style={{ color: text }}>
                          <i className="fa-solid fa-comment" style={{ color: text }}></i> {typeof task.notesCount === 'number' ? task.notesCount : (task.taskNotes?.length || 0)}
                        </span>
            </div>
                      <div className={styles.taskCardActions}>
                        <button onClick={() => openDrawer(task)} className={styles.taskCardButton} style={{ color: text }}>
                          <i className="fa-solid fa-comments" style={{ color: text }}></i>
                          <span>Notes</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  </div>
                      </div>
                    ))}
          </div>
        )}
                </div>

      {/* Drawer */}
      {drawerTask && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setDrawerTask(null)}></div>
          <div className={styles.drawer} style={{ borderLeft: `1px solid ${border}` }}>
            <div className={styles.drawerHeader}>
              <h3 style={{ color: text }}>{drawerTask.title}</h3>
              <button onClick={() => setDrawerTask(null)} style={{ color: text }}>
                <i className="fa-solid fa-times" style={{ color: text }}></i>
              </button>
            </div>

            <div className={styles.drawerContent}>
              {/* Overview */}
              <div className={styles.drawerSection}>
                <h4 style={{ color: text }}>Overview</h4>
                <p style={{ color: text }}>{drawerTask.body}</p>
                
                {/* Assigned User */}
                <div className={styles.assignedUser}>
                  <div className={styles.userInfo}>
                    <UserAvatar user={getUser(drawerTask.assigned_to || 0)} size="medium" />
                    <div className={styles.userDetails}>
                      <div className={styles.userName} style={{ color: text }}>{getUserName(drawerTask.assigned_to || 0)}</div>
                      <div className={styles.userRole} style={{ color: text, opacity: 0.8 }}>
                        {getUser(drawerTask.assigned_to || 0)?.role || 'Unknown Role'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Related Product */}
                {drawerTask.product && (
                  <div className={styles.assignedUser}>
                    <div className={styles.userInfo}>
                      <div className={styles.productIcon}>
                        {drawerTask.product.image_url ? (
                          <img 
                            src={drawerTask.product.image_url} 
                            alt={drawerTask.product.name}
                            className={styles.productImage}
                            style={{ 
                              width: '48px', 
                              height: '48px', 
                              borderRadius: '8px', 
                              objectFit: 'cover',
                              border: '1px solid rgba(125, 141, 134, 0.2)'
                            }}
                          />
                        ) : (
                          <i className="fa-solid fa-box" style={{ color: '#7d8d86', fontSize: '1.5rem' }}></i>
                        )}
                      </div>
                      <div className={styles.userDetails}>
                        <div className={styles.userName} style={{ color: text }}>{drawerTask.product.name}</div>
                        <div className={styles.userRole} style={{ color: text, opacity: 0.8 }}>
                          {drawerTask.product.category} • Stock: {drawerTask.product.stock_quantity} • ${drawerTask.product.price}
                        </div>
                        {drawerTask.product.sku && (
                          <div style={{ color: text, opacity: 0.6, fontSize: '0.8rem' }}>
                            SKU: {drawerTask.product.sku}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.badges}>
                  <span className={styles.statusPill} style={{ background: statusBg(getTaskStatus(drawerTask)), color: text }}>
                    {getTaskStatus(drawerTask)}
                  </span>
                  {drawerTask.priority && <span className={styles.priorityBadge} style={{ background: priorityBg(drawerTask.priority), color: priorityColor(drawerTask.priority) }}>{drawerTask.priority}</span>}
                  <span className={styles.dateBadge} style={{ color: text }}>
                    <i className="fa-solid fa-calendar" style={{ color: text }}></i> {drawerTask.remind_date}
                  </span>
                  </div>
                </div>

              {/* Notes */}
              <div className={styles.drawerSection}>
                <h4 style={{ color: text }}>Notes ({drawerTask.taskNotes?.length || 0})</h4>
                {loadingNotes ? (
                  <div className={styles.loadingNotes} style={{ color: text }}>Loading notes...</div>
                ) : (
                  <div className={styles.notesList}>
                    {drawerTask.taskNotes?.length === 0 && <div className={styles.noNotes} style={{ color: text }}>No notes yet.</div>}
                    {drawerTask.taskNotes?.map(note => (
                      <div key={note.note_id} className={styles.noteItem}>
                        <UserAvatar 
                          user={note.author ? {
                            user_id: note.author.user_id,
                            username: note.author.username,
                            full_name: note.author.full_name,
                            icon: note.author.icon,
                            role: ''
                          } : undefined} 
                          size="small" 
                        />
                        <div className={styles.noteContent}>
                          <div className={styles.noteMeta} style={{ color: text }}>
                            {note.author?.full_name || note.author?.username || 'Unknown'} · {new Date(note.created_at).toLocaleString()}
                          </div>
                          <div className={styles.noteText} style={{ color: text }}>{note.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className={styles.addNoteBox}>
                  <input
                    type="text"
                    placeholder="Add a note…"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addNote()}
                    style={{ color: text, borderColor: border, background: dark ? 'rgba(125, 141, 134, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                  />
                  <button onClick={addNote} style={{ color: text }}>
                    <i className="fa-solid fa-paper-plane" style={{ color: text }}></i>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className={styles.drawerActions}>
                <button className={styles.drawerButton} onClick={() => setDrawerTask(null)} style={{ color: text }}>
                  Close
                  </button>
                {!drawerTask.resolved && (
                  <button className={styles.drawerButton} onClick={() => { onCompleteTask(drawerTask.reminder_id); setDrawerTask(null); }} style={{ color: text }}>
                    <i className="fa-solid fa-check" style={{ color: text }}></i> Mark Complete
                  </button>
        )}
      </div>
            </div>
          </div>
        </>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        open={showUserModal}
        onClose={closeUserProfile}
        user={selectedUser}
        businessId={businessId}
        branchId={branchId}
      />
    </div>
  );
};

export default TasksList;
