import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';
import { useRole } from '../contexts/RoleContext';
import PageHeader from '../components/PageHeader';
import TaskAssignmentModal from '../components/TaskAssignmentModal';
import TasksList from '../components/TasksList';
import { Reminder, NewTask } from '../types/multitenant';
import styles from './Reminders.module.css';

interface User {
  user_id: number;
  username: string;
  role: string;
  icon?: string;
  full_name?: string;
}

export default function Reminders() {
  const { user, currentUserId } = useAuth();
  const { selectedBranchId } = useBranch();
  const { hasPermission, userRole } = useRole();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedNote, setDraggedNote] = useState<Reminder | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [modalForm, setModalForm] = useState({
    title: '',
    body: '',
    remind_date: new Date().toISOString().split('T')[0],
    color: 'yellow'
  });
  const [editForm, setEditForm] = useState({
    title: '',
    body: '',
    remind_date: '',
    color: 'yellow',
    resolved: false
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showResolved, setShowResolved] = useState(true);
  
  // New state for task functionality
  const [viewMode, setViewMode] = useState<'reminders' | 'tasks'>('reminders');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Reminder | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [showTaskNotification, setShowTaskNotification] = useState(false);

  const colors = {
    yellow: { bg: styles.noteYellow, border: styles.noteYellow, shadow: styles.noteYellow },
    pink: { bg: styles.notePink, border: styles.notePink, shadow: styles.notePink },
    blue: { bg: styles.noteBlue, border: styles.noteBlue, shadow: styles.noteBlue },
    green: { bg: styles.noteGreen, border: styles.noteGreen, shadow: styles.noteGreen },
    purple: { bg: styles.notePurple, border: styles.notePurple, shadow: styles.notePurple },
    orange: { bg: styles.noteOrange, border: styles.noteOrange, shadow: styles.noteOrange }
  };

  // Date navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar functions
  const navigateCalendarMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCalendarDate(newDate);
  };

  const selectCalendarDate = (date: Date) => {
    setCurrentDate(date);
    setShowCalendar(false);
  };

  const getDatesWithReminders = () => {
    const dates = new Set<string>();
    reminders.forEach(reminder => {
      const date = new Date(reminder.remind_date);
      dates.add(date.toDateString());
    });
    return dates;
  };

  const getReminderCountsByDate = () => {
    const counts: { [key: string]: number } = {};
    reminders.forEach(reminder => {
      const date = new Date(reminder.remind_date);
      const dateString = date.toDateString();
      counts[dateString] = (counts[dateString] || 0) + 1;
    });
    return counts;
  };

  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const datesWithReminders = getDatesWithReminders();
    const reminderCounts = getReminderCountsByDate();
    const today = new Date();
    const selectedDate = new Date(currentDate);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const hasReminders = datesWithReminders.has(date.toDateString());
      const reminderCount = reminderCounts[date.toDateString()] || 0;
      
      days.push({
        date,
        isCurrentMonth,
        isToday,
        isSelected,
        hasReminders,
        reminderCount
      });
    }
    
    return days;
  };



  const getFilteredReminders = () => {
    const current = new Date(currentDate);
    // Reset time to start of day for accurate date comparison
    current.setHours(0, 0, 0, 0);

    return reminders.filter(reminder => {
      const reminderDate = new Date(reminder.remind_date);
      // Reset time to start of day for accurate date comparison
      reminderDate.setHours(0, 0, 0, 0);

      const dateMatches = reminderDate.getTime() === current.getTime();
      const resolvedFilter = showResolved || (!reminder.resolved && !reminder.transactionResolved);
      const isReminder = !reminder.is_task; // Only show reminders, not tasks

      return dateMatches && resolvedFilter && isReminder;
    });
  };

  const removeAllReminders = async () => {
    // Clear local state first
    setReminders([]);
    setShowConfirmDialog(false);

    if (offlineMode) {
      return;
    }

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .neq('reminder_id', 0); // Delete all records

      if (error) {
        console.error('Error deleting all reminders from database:', error);
        // Note: We already cleared local state, so reminders are gone from UI
      }
    } catch (error) {
      console.error('Error deleting all reminders:', error);
      // Note: We already cleared local state, so reminders are gone from UI
    }
  };

  // Fetch reminders from database
  const fetchReminders = async () => {
    try {
      setLoading(true);
      
      if (!user?.business_id) {
        setReminders([]);
        setLoading(false);
        return;
      }
      
      let query = supabase
        .from('reminders')
        .select(`
          *,
          sales!left(partial_payment, remaining_amount),
          assigned_to_user:users!assigned_to(user_id, username, role, icon, full_name),
          assigned_by_user:users!assigned_by(user_id, username, role, icon, full_name),
          completed_by_user:users!completed_by(user_id, username, role, icon, full_name),
          product:products!product_id(product_id, name, category, price, stock_quantity, image_url, sku)
        `)
        .eq('business_id', user.business_id);

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId);
      }

      const { data, error } = await query.order('remind_date', { ascending: true });

      if (error) {
        console.error('Database fetch error:', error);
        throw error;
      }

      // Fetch notes counts for all tasks in parallel
      const taskIds = (data || [])
        .filter(r => r.is_task)
        .map(r => r.reminder_id);

      let notesCounts: Record<number, number> = {};
      if (taskIds.length > 0) {
        // Supabase count head query per task; batch by reducing round-trips
        await Promise.all(taskIds.map(async (id) => {
          const { count } = await supabase
            .from('task_notes')
            .select('note_id', { count: 'exact', head: true })
            .eq('task_id', id);
          notesCounts[id] = count || 0;
        }));
      }

      // Add UI properties to each reminder and check transaction status
      const remindersWithUI = data?.map((reminder, index) => {
        // Check if this reminder is linked to a transaction and if the transaction is resolved
        const linkedSale = reminder.sales;
        const isTransactionResolved = linkedSale && reminder.sale_id ? 
          !linkedSale.partial_payment || linkedSale.remaining_amount === 0 : false;
        
        return {
          ...reminder,
          notesCount: reminder.is_task ? (notesCounts[reminder.reminder_id] || 0) : undefined,
          x: Math.random() * 400 + 50,
          y: Math.random() * 300 + 50,
          rotation: (Math.random() - 0.5) * 6,
          isEditing: false,
          color: Object.keys(colors)[index % Object.keys(colors).length],
          transactionResolved: isTransactionResolved
        };
      }) || [];

      setReminders(remindersWithUI);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      setError('Failed to load reminders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available users for task assignment
  const fetchUsers = async () => {
    try {
      if (!user?.business_id) {
        setAvailableUsers([]);
        return;
      }

      let query = supabase
        .from('users')
        .select('user_id, username, role, icon, full_name')
        .eq('business_id', user.business_id)
        .eq('active', true)
        .order('username');

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Check for pending tasks assigned to current user
  const checkPendingTasks = () => {
    const pendingTasks = reminders.filter(reminder => 
      reminder.is_task && 
      reminder.assigned_to === currentUserId && 
      !reminder.resolved
    );
    setShowTaskNotification(pendingTasks.length > 0);
  };

  useEffect(() => {
    // Test if reminders table exists
    const testTable = async () => {
      try {
        const { data, error } = await supabase
          .from('reminders')
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.error('Table test error:', error);
          setError(`Database table 'reminders' does not exist. Please run the SQL commands from database-schema.sql in your Supabase SQL editor.`);
          setOfflineMode(true);
          setLoading(false);
        } else {
          fetchReminders();
          fetchUsers();
        }
      } catch (err) {
        console.error('Table test failed:', err);
        setError('Failed to connect to database. Please check your connection.');
      }
    };
    
    testTable();
  }, []);

  // Refresh reminders when branch changes
  useEffect(() => {
    if (user?.business_id) {
      fetchReminders();
      fetchUsers();
    }
  }, [selectedBranchId]);

  // Check for pending tasks when reminders change
  useEffect(() => {
    checkPendingTasks();
  }, [reminders, currentUserId]);

  const openAddReminderModal = () => {
    setModalForm({
      title: '',
      body: '',
      remind_date: new Date().toISOString().split('T')[0],
      color: 'yellow'
    });
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalForm({
      title: '',
      body: '',
      remind_date: new Date().toISOString().split('T')[0],
      color: 'yellow'
    });
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingReminder(null);
    setEditForm({
      title: '',
      body: '',
      remind_date: '',
      color: 'yellow',
      resolved: false
    });
  };

  const updateReminderFromModal = async () => {
    if (!editingReminder || !editForm.title.trim() || !editForm.body.trim()) {
      setError('Please fill in both title and body for the reminder.');
      return;
    }

    await updateReminder(editingReminder.reminder_id, {
      title: editForm.title.trim(),
      body: editForm.body.trim(),
      remind_date: editForm.remind_date,
      color: editForm.color,
      resolved: editForm.resolved
    });

    closeEditModal();
  };

  const addReminder = async () => {
    if (!modalForm.title.trim() || !modalForm.body.trim()) {
      setError('Please fill in both title and body for the reminder.');
      return;
    }
    
    const newReminder = {
      title: modalForm.title.trim(),
      body: modalForm.body.trim(),
      remind_date: modalForm.remind_date,
      owner_id: currentUserId ? parseInt(currentUserId) : 1, // Use current user ID
      business_id: user?.business_id || 1, // Use current business ID
      branch_id: selectedBranchId // Use current branch ID
    };

    if (offlineMode) {
      const tempId = Date.now();
      setReminders([...reminders, { ...newReminder, reminder_id: tempId, created_at: new Date().toISOString() }]);
      closeModal();
      return;
    }

    try {
      // Use current user ID for owner_id
      if (currentUserId) {
        newReminder.owner_id = parseInt(currentUserId);
      } else {
        // Fall back to offline mode if no current user
        const tempId = Date.now();
        setReminders([...reminders, { ...newReminder, reminder_id: tempId, created_at: new Date().toISOString() }]);
        closeModal();
        return;
      }
      
      const { data, error } = await supabase
        .from('reminders')
        .insert([{
          title: newReminder.title,
          body: newReminder.body,
          remind_date: newReminder.remind_date,
          owner_id: newReminder.owner_id,
          branch_id: newReminder.branch_id
        }])
        .select()
        .single();

      if (error) {
        // Fall back to offline mode
        const tempId = Date.now();
        setReminders([...reminders, { ...newReminder, reminder_id: tempId, created_at: new Date().toISOString() }]);
        closeModal();
        return;
      }

      setReminders([...reminders, { ...newReminder, reminder_id: data.reminder_id, created_at: new Date().toISOString() }]);
      closeModal();
    } catch (error) {
      console.error('Error adding reminder:', error);
      // Fall back to offline mode
      const tempId = Date.now();
      setReminders([...reminders, { ...newReminder, reminder_id: tempId, created_at: new Date().toISOString() }]);
      closeModal();
    }
  };

  const deleteReminder = async (id: number) => {
    // Update local state first
      setReminders(reminders.filter(reminder => reminder.reminder_id !== id));

    if (offlineMode) {
      return;
    }

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('reminder_id', id);

      if (error) {
        console.error('Error deleting reminder from database:', error);
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const updateReminder = async (id: number, updates: Partial<Reminder>) => {
    // Update local state first
    setReminders(reminders.map(reminder => 
      reminder.reminder_id === id ? { ...reminder, ...updates } : reminder
    ));

    if (offlineMode) {
      return;
    }

    try {
      if (updates.title || updates.body || updates.remind_date || updates.resolved !== undefined) {
        const { error } = await supabase
          .from('reminders')
          .update({
            title: updates.title,
            body: updates.body,
            remind_date: updates.remind_date,
            resolved: updates.resolved
          })
          .eq('reminder_id', id);

        if (error) {
          console.error('Error updating reminder in database:', error);
        }
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
    }
  };


  const startDrag = (e: React.MouseEvent, reminder: Reminder) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDraggedNote(reminder);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggedNote) {
      const container = document.getElementById('sticky-container');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const newX = Math.max(0, Math.min(e.clientX - containerRect.left - dragOffset.x, containerRect.width - 224));
        const newY = Math.max(0, Math.min(e.clientY - containerRect.top - dragOffset.y, containerRect.height - 224));
        
        setReminders(reminders.map(reminder => 
          reminder.reminder_id === draggedNote.reminder_id 
            ? { ...reminder, x: newX, y: newY }
            : reminder
        ));
      }
    }
  };

  const handleMouseUp = () => {
    setDraggedNote(null);
    setDragOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (draggedNote) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNote, dragOffset]);

  const StickyNote = ({ reminder }: { reminder: Reminder }) => {
    const [localTitle, setLocalTitle] = useState(reminder.title);
    const [localBody, setLocalBody] = useState(reminder.body);
    const [localDate, setLocalDate] = useState(reminder.remind_date);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (reminder.isEditing && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    }, [reminder.isEditing]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalBody(e.target.value);
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    };

    const handleTextBlur = () => {
      if (localTitle.trim() && localBody.trim()) {
        updateReminder(reminder.reminder_id, { 
          title: localTitle.trim(), 
          body: localBody.trim(), 
          remind_date: localDate,
          isEditing: false 
        });
      } else {
        setLocalTitle(reminder.title);
        setLocalBody(reminder.body);
        setLocalDate(reminder.remind_date);
        updateReminder(reminder.reminder_id, { isEditing: false });
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.shiftKey) {
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleTextBlur();
      } else if (e.key === 'Escape') {
        setLocalTitle(reminder.title);
        setLocalBody(reminder.body);
        setLocalDate(reminder.remind_date);
        updateReminder(reminder.reminder_id, { isEditing: false });
      }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleTextBlur();
      } else if (e.key === 'Escape') {
        setLocalTitle(reminder.title);
        setLocalBody(reminder.body);
        setLocalDate(reminder.remind_date);
        updateReminder(reminder.reminder_id, { isEditing: false });
      }
    };

    const colorTheme = colors[reminder.color as keyof typeof colors] || colors.yellow;
    const today = new Date();
    const reminderDate = new Date(reminder.remind_date);
    const isOverdue = reminderDate < today && reminderDate.toDateString() !== today.toDateString();
    const isDueToday = reminderDate.toDateString() === today.toDateString();

    return (
      <div
        className={`${styles.stickyNote} ${draggedNote?.reminder_id === reminder.reminder_id ? styles.stickyNoteDragging : ''}`}
        style={{
          left: `${reminder.x}px`,
          top: `${reminder.y}px`,
          transform: `rotate(${reminder.rotation}deg)`,
        }}
      >
        <div
          className={`${styles.note} ${colorTheme.bg} ${isOverdue ? styles.noteOverdue : isDueToday ? styles.noteDueToday : ''}`}
          onMouseDown={(e) => !reminder.isEditing && startDrag(e, reminder)}
        >
          {/* Top strip */}
          <div className={`${styles.noteTopStrip} ${colorTheme.border}`}></div>
          

          {/* Content */}
          <div className={styles.noteContent}>
            {reminder.isEditing ? (
              <div className={styles.noteContentEditing}>
                <input
                  type="text"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleTextBlur}
                  className={styles.noteInput}
                  placeholder="Reminder title..."
                />
                <input
                  type="date"
                  value={localDate}
                  onChange={(e) => setLocalDate(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleTextBlur}
                  className={styles.noteDateInput}
                />
                <textarea
                  ref={textareaRef}
                  value={localBody}
                  onChange={handleTextChange}
                  onBlur={handleTextBlur}
                  onKeyDown={handleKeyDown}
                  className={styles.noteTextarea}
                  style={{ 
                    fontFamily: 'Comic Sans MS, cursive, sans-serif',
                    minHeight: '80px'
                  }}
                  placeholder="Reminder details..."
                />
              </div>
            ) : (
              <div
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingReminder(reminder);
                  setEditForm({
                    title: reminder.title,
                    body: reminder.body,
                    remind_date: reminder.remind_date,
                    color: reminder.color || 'yellow',
                    resolved: reminder.resolved || false
                  });
                  setShowEditModal(true);
                }}
                className={styles.noteDisplay}
              >
                <div className={styles.noteTitle}>
                  <span className={reminder.resolved || reminder.transactionResolved ? styles.noteTitleResolved : ''}>
                    {reminder.title}
                  </span>
                  {reminder.transactionResolved && !reminder.resolved && (
                    <span className={styles.transactionResolvedBadge} title="Transaction has been resolved">
                      <i className="fa-solid fa-check-circle"></i>
                    </span>
                  )}
                </div>
                {viewMode === 'reminders' && (
                  <div className={`${styles.noteDate} ${isOverdue ? styles.noteDateOverdue : isDueToday ? styles.noteDateToday : ''}`}>
                    <i className="fa-solid fa-calendar" style={{ marginRight: '0.25rem' }}></i>
                    {new Date(reminder.remind_date).toLocaleDateString()}
                    {isOverdue && <span style={{ color: '#dc2626', marginLeft: '0.5rem', fontWeight: '700' }}>OVERDUE</span>}
                    {isDueToday && !isOverdue && <span style={{ color: '#d97706', marginLeft: '0.5rem', fontWeight: '700' }}>TODAY</span>}
                  </div>
                )}
                <div
                  className={`${styles.noteBody} ${reminder.resolved || reminder.transactionResolved ? styles.noteBodyResolved : ''}`}
                  style={{ fontFamily: 'Comic Sans MS, cursive, sans-serif' }}
                >
                  {reminder.body}
                  {reminder.transactionResolved && !reminder.resolved && (
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#059669', 
                      marginTop: '4px', 
                      fontStyle: 'italic',
                      fontWeight: 'bold'
                    }}>
                      ✓ Transaction resolved
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Folded corner effect */}
          <div className={styles.noteCorner}>
            <div className={`${styles.noteCornerEffect} ${colorTheme.bg}`}></div>
          </div>
        </div>
      </div>
    );
  };

  // Task-related functions

  const getFilteredTasks = () => {
    return reminders.filter(reminder => reminder.is_task);
  };

  const openAddTaskModal = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const createTask = async (taskData: NewTask) => {
    if (!hasPermission('canAssignTasks')) {
      throw new Error('You do not have permission to assign tasks');
    }

    const newTask = {
      ...taskData,
      owner_id: currentUserId ? parseInt(currentUserId) : 1,
      business_id: user?.business_id || 1,
      branch_id: selectedBranchId,
      assigned_by: currentUserId ? parseInt(currentUserId) : 1,
      is_task: true,
      resolved: false
    };

    if (offlineMode) {
      const tempId = Date.now();
      setReminders([...reminders, { 
        ...newTask, 
        reminder_id: tempId, 
        created_at: new Date().toISOString(),
        is_task: true
      }]);
      closeTaskModal();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert([newTask])
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        throw error;
      }

      // Add UI properties to the new task
      const taskWithUI = {
        ...data,
        x: Math.random() * 400 + 50,
        y: Math.random() * 300 + 50,
        rotation: (Math.random() - 0.5) * 6,
        isEditing: false,
        color: 'blue'
      };

      setReminders([...reminders, taskWithUI]);
      closeTaskModal();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  };

  const editTask = (task: Reminder) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const updateTask = async (taskData: NewTask) => {
    if (!editingTask) return;

    const updates = {
      title: taskData.title,
      body: taskData.body,
      remind_date: taskData.remind_date,
      assigned_to: taskData.assigned_to,
      priority: taskData.priority,
      notes: taskData.notes,
      product_id: taskData.product_id,
      task_icon: taskData.task_icon
    };

    // Update local state first
    setReminders(reminders.map(reminder => 
      reminder.reminder_id === editingTask.reminder_id 
        ? { ...reminder, ...updates } 
        : reminder
    ));

    if (offlineMode) {
      closeTaskModal();
      return;
    }

    try {
      const { error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('reminder_id', editingTask.reminder_id);

      if (error) {
        console.error('Error updating task:', error);
        throw error;
      }

      closeTaskModal();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const completeTask = async (taskId: number) => {
    const task = reminders.find(r => r.reminder_id === taskId);
    if (!task) return;

    const updates = {
      resolved: true,
      completed_by: currentUserId ? parseInt(currentUserId) : 1,
      completed_at: new Date().toISOString()
    };

    // Update local state first
    setReminders(reminders.map(reminder => 
      reminder.reminder_id === taskId 
        ? { ...reminder, ...updates } 
        : reminder
    ));

    if (offlineMode) {
      return;
    }

    try {
      const { error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('reminder_id', taskId);

      if (error) {
        console.error('Error completing task:', error);
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const deleteTask = async (taskId: number) => {
    // Update local state first
    setReminders(reminders.filter(reminder => reminder.reminder_id !== taskId));

    if (offlineMode) {
      return;
    }

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('reminder_id', taskId);

      if (error) {
        console.error('Error deleting task:', error);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Loading state hidden - always show content
  // if (loading) {
  //   return (
  //     <div className={styles.loading}>
  //       <div className={styles.loadingContent}>
  //         <i className={`fa-solid fa-spinner fa-spin ${styles.loadingIcon}`}></i>
  //         <p className={styles.loadingText}>Loading reminders...</p>
  //       </div>
  //     </div>
  //   );
  // }

    return (
    <div className={styles.container}>
      {/* Header */}
      <PageHeader
        title="Reminders & Tasks"
        subtitle="Manage your reminders and scheduled tasks"
      />

      {/* Task Notification Banner */}
      {showTaskNotification && (
        <div className={styles.taskNotification}>
          <div className={styles.notificationContent}>
            <i className="fa-solid fa-bell"></i>
            <span>
              You have {reminders.filter(r => r.is_task && r.assigned_to === currentUserId && !r.resolved).length} pending task(s)
            </span>
            <button 
              onClick={() => setViewMode('tasks')}
              className={styles.viewTasksButton}
            >
              View Tasks
            </button>
          </div>
          <button 
            onClick={() => setShowTaskNotification(false)}
            className={styles.dismissButton}
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className={styles.tabSwitcher}>
        <div className={`${styles.toggleLabel} ${viewMode === 'reminders' ? styles.active : ''}`}>
          <i className="fa-solid fa-sticky-note"></i>
          Reminders
        </div>
        <label className={styles.toggleContainer}>
          <input
            type="checkbox"
            className={styles.toggleInput}
            checked={viewMode === 'tasks'}
            onChange={() => setViewMode(viewMode === 'reminders' ? 'tasks' : 'reminders')}
          />
          <span className={styles.toggleSlider}></span>
        </label>
        <div className={`${styles.toggleLabel} ${viewMode === 'tasks' ? styles.active : ''}`}>
          <i className="fa-solid fa-tasks"></i>
          Tasks
          {reminders.filter(r => r.is_task && r.assigned_to === currentUserId && !r.resolved).length > 0 && (
            <span className={styles.taskCount}>
              {reminders.filter(r => r.is_task && r.assigned_to === currentUserId && !r.resolved).length}
            </span>
          )}
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Date Navigation - Only show on reminders tab */}
        {viewMode === 'reminders' && (
          <div className={styles.dateNavigation}>
            <button
              onClick={goToPreviousDay}
              className={styles.navButton}
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            
            <div 
              className={styles.currentDate} 
              onClick={() => setShowCalendar(!showCalendar)} 
              style={{ cursor: 'pointer' }}
            >
              {currentDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
          </div>
            
            <button
              onClick={goToNextDay}
              className={styles.navButton}
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
        </div>
        )}

        {/* Calendar Modal */}
        {showCalendar && (
          <div className={styles.calendarModal} onClick={() => setShowCalendar(false)}>
            <div className={styles.calendar} onClick={(e) => e.stopPropagation()}>
              <div className={styles.calendarHeader}>
                <button
                  onClick={() => setShowCalendar(false)}
                  className={styles.calendarCloseButton}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
                
                <button
                  onClick={() => navigateCalendarMonth('prev')}
                  className={styles.calendarNavButton}
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                
                <div className={styles.calendarTitle}>
                  {calendarDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </div>
                
                <button
                  onClick={() => navigateCalendarMonth('next')}
                  className={styles.calendarNavButton}
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            
            <div className={styles.calendarGrid}>
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className={styles.calendarDayHeader}>
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {generateCalendarDays().map((day, index) => {
                let dayClass = styles.calendarDay;
                
                if (!day.isCurrentMonth) {
                  dayClass += ` ${styles.calendarDayOtherMonth}`;
                } else if (day.hasReminders && day.isToday) {
                  dayClass += ` ${styles.calendarDayWithRemindersToday}`;
                } else if (day.hasReminders && day.isSelected) {
                  dayClass += ` ${styles.calendarDayWithRemindersSelected}`;
                } else if (day.hasReminders) {
                  dayClass += ` ${styles.calendarDayWithReminders}`;
                } else if (day.isToday) {
                  dayClass += ` ${styles.calendarDayToday}`;
                } else if (day.isSelected) {
                  dayClass += ` ${styles.calendarDaySelected}`;
  }

                return (
                  <div
                    key={index}
                    className={dayClass}
                    onClick={() => selectCalendarDate(day.date)}
                  >
                    {day.date.getDate()}
                    {day.hasReminders && (
                      <div className={styles.calendarReminderCount}>
                        {day.reminderCount}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}



        {/* Offline Mode Notice */}
        {offlineMode && (
          <div className={styles.offlineNotice}>
            <div className={styles.offlineNoticeContent}>
              <i className="fa-solid fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
              <div>
                <strong>Offline Mode:</strong> The reminders table doesn't exist in your database yet. 
                Reminders will work locally but won't be saved permanently. 
                <a href="#" onClick={() => window.open('https://supabase.com/dashboard', '_blank')} style={{ textDecoration: 'underline', marginLeft: '0.25rem' }}>
                  Create the table in Supabase
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className={styles.controls}>
          {viewMode === 'reminders' && (
            <button
              onClick={openAddReminderModal}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              <i className="fa-solid fa-plus-circle"></i>
              <span style={{ marginLeft: '0.5rem' }}>Add Reminder</span>
            </button>
          )}
          
          {viewMode === 'reminders' && (
            <button
              onClick={() => {
                const container = document.getElementById('sticky-container');
                if (container) {
                  const containerRect = container.getBoundingClientRect();
                  setReminders(reminders.map(reminder => ({
                    ...reminder,
                    x: Math.random() * (containerRect.width - 224) + 20,
                    y: Math.random() * (containerRect.height - 224) + 20,
                    rotation: (Math.random() - 0.5) * 6
                  })));
                }
              }}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              <i className="fa-solid fa-random"></i>
              <span style={{ marginLeft: '0.5rem' }}>Shuffle</span>
            </button>
          )}

          {viewMode === 'reminders' && (
            <button
              onClick={() => setShowResolved(!showResolved)}
              className={`${styles.button} ${showResolved ? styles.buttonPrimary : styles.buttonSecondary}`}
            >
              <i className={`fa-solid ${showResolved ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              <span style={{ marginLeft: '0.5rem' }}>
                {showResolved ? 'Show All' : 'Hide Completed'}
              </span>
            </button>
          )}

          {viewMode === 'reminders' && reminders.filter(r => !r.is_task).length > 0 && (
            <button
              onClick={() => setShowConfirmDialog(true)}
              className={`${styles.button} ${styles.buttonDanger}`}
            >
              <i className="fa-solid fa-trash-can"></i>
              <span style={{ marginLeft: '0.5rem' }}>Clear All Reminders</span>
            </button>
          )}
        </div>

        {/* Content Container */}
        {viewMode === 'reminders' ? (
          <div 
            id="sticky-container"
            className={styles.notesContainer}
          >
            {/* Grid pattern background */}
            <div className={styles.gridBackground}>
              <div className={styles.gridPattern}></div>
            </div>

            {/* Render filtered reminders */}
            {getFilteredReminders().map(reminder => (
              <StickyNote key={reminder.reminder_id} reminder={reminder} />
            ))}

            {/* Instructions when no reminders */}
            {getFilteredReminders().length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateContent}>
                  <img 
                    src="/images/vectors/reminders.png" 
                    alt="No reminders" 
                    style={{ 
                      width: '280px', 
                      height: 'auto',
                      opacity: 0.85
                    }} 
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <TasksList
            tasks={getFilteredTasks()}
            currentUserId={currentUserId ? parseInt(currentUserId) : 1}
            userRole={userRole}
            onEditTask={editTask}
            onCompleteTask={completeTask}
            onDeleteTask={deleteTask}
            onAddTask={hasPermission('canAssignTasks') ? openAddTaskModal : undefined}
            availableUsers={availableUsers}
            businessId={user?.business_id || 1}
            branchId={selectedBranchId || undefined}
            onTasksChange={fetchReminders}
          />
        )}

        {/* Drag cursor indicator */}
        {draggedNote && (
          <div className={styles.dragIndicator}>
            <i className="fa-solid fa-arrows-up-down-left-right" style={{ marginRight: '0.25rem' }}></i>
            Dragging reminder...
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p>
          <i className="fa-solid fa-lightbulb" style={{ marginRight: '0.25rem' }}></i>
          Tips: Shift+Enter for new lines • Escape to cancel editing • Right-click to edit • Drag reminders around freely
        </p>
      </div>

      {/* Add Reminder Modal */}
      {showModal && (
        <div className={`${styles.modalOverlay} ${styles.open}`}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <i className="fa-solid fa-sticky-note" style={{ marginRight: '0.5rem', color: '#fbbf24' }}></i>
                Create New Reminder
              </h2>
              <button
                onClick={closeModal}
                className={styles.modalClose}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className={styles.modalBody}>
              <form onSubmit={(e) => { e.preventDefault(); addReminder(); }} className={styles.modalForm}>
                {/* Error Display */}
                {error && (
                  <div className={styles.errorMessage}>
                    <div className={styles.errorContent}>
                      <i className="fa-solid fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                      <span style={{ fontSize: '0.875rem' }}>{error}</span>
                    </div>
                  </div>
                )}

                {/* Title Input */}
                <div className={styles.formGroup}>
                  <label htmlFor="title" className={styles.formLabel}>
                    Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={modalForm.title}
                    onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
                    className={styles.formInput}
                    placeholder="Enter reminder title..."
                    required
                    autoFocus
                  />
                </div>

                {/* Date Input */}
                <div className={styles.formGroup}>
                  <label htmlFor="remind_date" className={styles.formLabel}>
                    Remind Date *
                  </label>
                  <input
                    type="date"
                    id="remind_date"
                    value={modalForm.remind_date}
                    onChange={(e) => setModalForm({ ...modalForm, remind_date: e.target.value })}
                    className={styles.formInput}
                    required
                  />
                </div>

                {/* Color Selection */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Color
                  </label>
                  <div className={styles.colorSelection}>
                    {Object.entries(colors).map(([colorName, colorClasses]) => (
                      <button
                        key={colorName}
                        type="button"
                        onClick={() => setModalForm({ ...modalForm, color: colorName })}
                        className={`${styles.colorOption} ${colorClasses.bg} ${
                          modalForm.color === colorName 
                            ? styles.colorOptionSelected 
                            : ''
                        }`}
                        title={colorName}
                      />
                    ))}
                  </div>
                </div>

                {/* Body Input */}
                <div className={styles.formGroup}>
                  <label htmlFor="body" className={styles.formLabel}>
                    Details *
                  </label>
                  <textarea
                    id="body"
                    value={modalForm.body}
                    onChange={(e) => setModalForm({ ...modalForm, body: e.target.value })}
                    className={styles.formTextarea}
                    rows={4}
                    placeholder="Enter reminder details..."
                    required
                  />
                </div>

                {/* Preview */}
                {modalForm.title && modalForm.body && (
                  <div className={styles.preview}>
                    <label className={styles.previewLabel}>
                      Preview
                    </label>
                    <div className={`${styles.previewNote} ${colors[modalForm.color as keyof typeof colors]?.bg} ${colors[modalForm.color as keyof typeof colors]?.border}`}>
                      <div className={styles.previewTitle}>
                        {modalForm.title}
                      </div>
                      <div className={styles.previewDate}>
                        <i className="fa-solid fa-calendar" style={{ marginRight: '0.25rem' }}></i>
                        {new Date(modalForm.remind_date).toLocaleDateString()}
                      </div>
                      <div className={styles.previewBody}>
                        {modalForm.body}
                      </div>
                    </div>
                  </div>
                )}

              </form>
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={closeModal}
                  className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={(e) => { e.preventDefault(); addReminder(); }}
                  className={`${styles.modalButton} ${styles.modalButtonSubmit}`}
                >
                  <i className="fa-solid fa-plus"></i>
                  Create Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Edit Reminder Modal */}
        {showEditModal && editingReminder && (
          <div className={`${styles.modalOverlay} ${styles.open}`}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  <i className="fa-solid fa-edit" style={{ marginRight: '0.5rem', color: '#fbbf24' }}></i>
                  Edit Reminder
                </h2>
                <button
                  onClick={closeEditModal}
                  className={styles.modalClose}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>

              <div className={styles.modalBody}>
                <form onSubmit={(e) => { e.preventDefault(); updateReminderFromModal(); }} className={styles.modalForm}>
                  {/* Error Display */}
                  {error && (
                    <div className={styles.errorMessage}>
                      <div className={styles.errorContent}>
                        <i className="fa-solid fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                        <span style={{ fontSize: '0.875rem' }}>{error}</span>
                      </div>
                    </div>
                  )}

                  {/* Title Input */}
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-title" className={styles.formLabel}>
                      Title *
                    </label>
                    <input
                      type="text"
                      id="edit-title"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className={styles.formInput}
                      placeholder="Enter reminder title..."
                      required
                      autoFocus
                    />
                  </div>

                  {/* Date Input */}
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-remind_date" className={styles.formLabel}>
                      Remind Date *
                    </label>
                    <input
                      type="date"
                      id="edit-remind_date"
                      value={editForm.remind_date}
                      onChange={(e) => setEditForm({ ...editForm, remind_date: e.target.value })}
                      className={styles.formInput}
                      required
                    />
                  </div>

                  {/* Color Selection */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Color
                    </label>
                    <div className={styles.colorSelection}>
                      {Object.entries(colors).map(([colorName, colorClasses]) => (
                        <button
                          key={colorName}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, color: colorName })}
                          className={`${styles.colorOption} ${colorClasses.bg} ${
                            editForm.color === colorName 
                              ? styles.colorOptionSelected 
                              : ''
                          }`}
                          title={colorName}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Resolved Checkbox */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Status
                    </label>
                    <div className={styles.checkboxContainer}>
                      <input
                        type="checkbox"
                        id="edit-resolved"
                        checked={editForm.resolved}
                        onChange={(e) => setEditForm({ ...editForm, resolved: e.target.checked })}
                        className={styles.formCheckbox}
                      />
                      <label htmlFor="edit-resolved" className={styles.checkboxLabel}>
                        <i className={`fa-solid ${editForm.resolved ? 'fa-check-square' : 'fa-square'}`} style={{ marginRight: '0.5rem' }}></i>
                        Mark as completed/resolved
                      </label>
                    </div>
                  </div>

                  {/* Body Input */}
                  <div className={styles.formGroup}>
                    <label htmlFor="edit-body" className={styles.formLabel}>
                      Details *
                    </label>
                    <textarea
                      id="edit-body"
                      value={editForm.body}
                      onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                      className={styles.formTextarea}
                      rows={4}
                      placeholder="Enter reminder details..."
                      required
                    />
                  </div>

                  {/* Preview */}
                  {editForm.title && editForm.body && (
                    <div className={styles.preview}>
                      <label className={styles.previewLabel}>
                        Preview
                      </label>
                      <div className={`${styles.previewNote} ${colors[editForm.color as keyof typeof colors]?.bg} ${colors[editForm.color as keyof typeof colors]?.border}`}>
                        <div className={styles.previewTitle}>
                          {editForm.title}
                        </div>
                        <div className={styles.previewDate}>
                          <i className="fa-solid fa-calendar" style={{ marginRight: '0.25rem' }}></i>
                          {new Date(editForm.remind_date).toLocaleDateString()}
                        </div>
                        <div className={styles.previewBody}>
                          {editForm.body}
                        </div>
                      </div>
                    </div>
                  )}

                </form>
              </div>

              <div className={styles.modalFooter}>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => {
                      deleteReminder(editingReminder.reminder_id);
                      closeEditModal();
                    }}
                    className={`${styles.modalButton} ${styles.modalButtonDanger}`}
                  >
                    <i className="fa-solid fa-trash"></i>
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={(e) => { e.preventDefault(); updateReminderFromModal(); }}
                    className={`${styles.modalButton} ${styles.modalButtonSubmit}`}
                  >
                    <i className="fa-solid fa-save"></i>
                    Update Reminder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className={styles.confirmationDialog}>
            <div className={styles.confirmationContent}>
              <div className={styles.confirmationHeader}>
                <div className={styles.confirmationIcon}>
                  <i className="fa-solid fa-exclamation-triangle"></i>
                </div>
                <h3>Remove All Reminders</h3>
              </div>
              <p>Are you sure you want to remove all reminders? This action cannot be undone.</p>
              <div className={styles.confirmationButtons}>
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className={`${styles.confirmationButton} ${styles.confirmationButtonCancel}`}
                >
                  <i className="fa-solid fa-times" style={{ marginRight: '0.5rem' }}></i>
                  Cancel
                </button>
                <button
                  onClick={removeAllReminders}
                  className={`${styles.confirmationButton} ${styles.confirmationButtonConfirm}`}
                >
                  <i className="fa-solid fa-trash" style={{ marginRight: '0.5rem' }}></i>
                  Remove All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task Assignment Modal */}
        <TaskAssignmentModal
          open={showTaskModal}
          onClose={closeTaskModal}
          onSave={editingTask ? updateTask : createTask}
          editingTask={editingTask}
          availableUsers={availableUsers}
        />
    </div>
  );
}