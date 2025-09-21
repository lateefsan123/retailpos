import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import styles from './Reminders.module.css';

interface Reminder {
  reminder_id: number;
  owner_id: number;
  title: string;
  body: string;
  remind_date: string;
  created_at: string;
  resolved?: boolean;
  x?: number;
  y?: number;
  rotation?: number;
  isEditing?: boolean;
  color?: string;
}

export default function Reminders() {
  const { user, currentUserId } = useAuth();
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
  const [showLilyMessage, setShowLilyMessage] = useState(false);
  const [lilyMessage, setLilyMessage] = useState("Hi! I'm Lily, your reminder assistant! I can help you understand how to manage your reminders. Hover over different elements to learn more! Double-click me to disable me.");
  const [lilyEnabled, setLilyEnabled] = useState(() => {
    const saved = localStorage.getItem('lilyEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showResolved, setShowResolved] = useState(true);

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

  const toggleLily = () => {
    const newState = !lilyEnabled;
    setLilyEnabled(newState);
    localStorage.setItem('lilyEnabled', JSON.stringify(newState));
    if (newState) {
      setLilyMessage("Hi! I'm back! I can help you understand how to manage your reminders. Hover over different elements to learn more! Double-click me to disable me.");
      setShowLilyMessage(true);
    }
  };

  const LilyMascot = () => {
    if (!lilyEnabled) return null;
    
    return (
      <div className={styles.lilyMascot}>
        {/* Speech Bubble */}
        {showLilyMessage && (
          <div className={styles.lilySpeechBubble}>
            <p>{lilyMessage}</p>
            <div className={styles.lilySpeechTail}></div>
          </div>
        )}
        
        {/* Lily Image */}
        <div 
          className={styles.lilyImage}
          onClick={() => {
            if (showLilyMessage) {
              // If message is showing, clicking toggles it off
              setShowLilyMessage(false);
            } else {
              // If message is not showing, clicking toggles it on
              setShowLilyMessage(true);
            }
          }}
          onDoubleClick={() => {
            // Double click to disable Lily
            toggleLily();
          }}
        >
          <img 
            src={user?.icon ? `/retailpos/images/icons/${user.icon}.png` : "/retailpos/images/backgrounds/lily.png"} 
            alt={user?.icon || "Lily"} 
          />
        </div>
      </div>
    );
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
      const resolvedFilter = showResolved || !reminder.resolved;

      return dateMatches && resolvedFilter;
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
      
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('business_id', user.business_id)
        .order('remind_date', { ascending: true });

      if (error) {
        console.error('Database fetch error:', error);
        throw error;
      }

      console.log('Fetched reminders from database:', data);

      // Add UI properties to each reminder
      const remindersWithUI = data?.map((reminder, index) => ({
        ...reminder,
        x: Math.random() * 400 + 50,
        y: Math.random() * 300 + 50,
        rotation: (Math.random() - 0.5) * 6,
        isEditing: false,
        color: Object.keys(colors)[index % Object.keys(colors).length]
      })) || [];

      console.log('Reminders with UI properties:', remindersWithUI);
      setReminders(remindersWithUI);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      setError('Failed to load reminders. Please try again.');
    } finally {
      setLoading(false);
    }
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
          console.log('Table exists, fetching reminders...');
          fetchReminders();
        }
      } catch (err) {
        console.error('Table test failed:', err);
        setError('Failed to connect to database. Please check your connection.');
      }
    };
    
    testTable();
  }, []);

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
      business_id: user?.business_id || 1 // Use current business ID
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
          owner_id: newReminder.owner_id
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
    console.log('updateReminder called with:', { id, updates, offlineMode });
    // Update local state first
    setReminders(reminders.map(reminder => 
      reminder.reminder_id === id ? { ...reminder, ...updates } : reminder
    ));

    if (offlineMode) {
      console.log('Offline mode - skipping database update');
      return;
    }

    try {
      if (updates.title || updates.body || updates.remind_date || updates.resolved !== undefined) {
        console.log('Updating database with:', {
          title: updates.title,
          body: updates.body,
          remind_date: updates.remind_date,
          resolved: updates.resolved
        });
        
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
        } else {
          console.log('Successfully updated reminder in database');
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
                  console.log('Note right-clicked for reminder:', reminder.reminder_id);
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
                  <span className={reminder.resolved ? styles.noteTitleResolved : ''}>
                    {reminder.title}
                  </span>
                </div>
                <div className={`${styles.noteDate} ${isOverdue ? styles.noteDateOverdue : isDueToday ? styles.noteDateToday : ''}`}>
                  <i className="fa-solid fa-calendar" style={{ marginRight: '0.25rem' }}></i>
                  {new Date(reminder.remind_date).toLocaleDateString()}
                  {isOverdue && <span style={{ color: '#dc2626', marginLeft: '0.5rem', fontWeight: '700' }}>OVERDUE</span>}
                  {isDueToday && !isOverdue && <span style={{ color: '#d97706', marginLeft: '0.5rem', fontWeight: '700' }}>TODAY</span>}
                </div>
                <div
                  className={`${styles.noteBody} ${reminder.resolved ? styles.noteBodyResolved : ''}`}
                  style={{ fontFamily: 'Comic Sans MS, cursive, sans-serif' }}
                >
                  {reminder.body}
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

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <i className={`fa-solid fa-spinner fa-spin ${styles.loadingIcon}`}></i>
          <p className={styles.loadingText}>Loading reminders...</p>
        </div>
      </div>
    );
  }

    return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.title}>
          <h1>
            <i className="fa-solid fa-sticky-note" style={{ marginRight: '0.75rem' }}></i>
            Reminders
          </h1>
          <p>Click and drag to move reminders around • Right-click to edit</p>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Date Navigation */}
        <div className={styles.dateNavigation}>
          <button
            onClick={goToPreviousDay}
            className={styles.navButton}
            onMouseEnter={() => {
              if (lilyEnabled) {
                setLilyMessage("Click this arrow to go to the previous day! This helps you navigate through your reminders day by day.");
                setShowLilyMessage(true);
              }
            }}
            onMouseLeave={() => {
              if (lilyEnabled) {
                setShowLilyMessage(false);
              }
            }}
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          
          <div 
            className={styles.currentDate} 
            onClick={() => setShowCalendar(!showCalendar)} 
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => {
              if (lilyEnabled) {
                setLilyMessage("Click on this date to open the calendar modal! You can see all your reminders and navigate to any date quickly.");
                setShowLilyMessage(true);
              }
            }}
            onMouseLeave={() => {
              if (lilyEnabled) {
                setShowLilyMessage(false);
              }
            }}
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
            onMouseEnter={() => {
              if (lilyEnabled) {
                setLilyMessage("Click this arrow to go to the next day! This helps you navigate through your reminders day by day.");
                setShowLilyMessage(true);
              }
            }}
            onMouseLeave={() => {
              if (lilyEnabled) {
                setShowLilyMessage(false);
              }
            }}
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
      </div>

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
          <button
            onClick={openAddReminderModal}
            className={`${styles.button} ${styles.buttonPrimary}`}
            onMouseEnter={() => {
              if (lilyEnabled) {
                setLilyMessage("Click this button to add a new reminder! You can set the title, content, date, and color for your reminder.");
                setShowLilyMessage(true);
              }
            }}
            onMouseLeave={() => {
              if (lilyEnabled) {
                setShowLilyMessage(false);
              }
            }}
          >
            <i className="fa-solid fa-plus-circle"></i>
            <span style={{ marginLeft: '0.5rem' }}>Add Reminder</span>
          </button>
          
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
            onMouseEnter={() => {
              if (lilyEnabled) {
                setLilyMessage("Click this button to shuffle all your reminders around! This gives them new random positions on the board.");
                setShowLilyMessage(true);
              }
            }}
            onMouseLeave={() => {
              if (lilyEnabled) {
                setShowLilyMessage(false);
              }
            }}
          >
            <i className="fa-solid fa-random"></i>
            <span style={{ marginLeft: '0.5rem' }}>Shuffle</span>
          </button>

          <button
            onClick={() => setShowResolved(!showResolved)}
            className={`${styles.button} ${showResolved ? styles.buttonPrimary : styles.buttonSecondary}`}
            onMouseEnter={() => {
              if (lilyEnabled) {
                setLilyMessage(showResolved ? "Click to hide completed reminders and focus on what's still pending!" : "Click to show all reminders including completed ones!");
                setShowLilyMessage(true);
              }
            }}
            onMouseLeave={() => {
              if (lilyEnabled) {
                setShowLilyMessage(false);
              }
            }}
          >
            <i className={`fa-solid ${showResolved ? 'fa-eye' : 'fa-eye-slash'}`}></i>
            <span style={{ marginLeft: '0.5rem' }}>
              {showResolved ? 'Show All' : 'Hide Completed'}
            </span>
          </button>

          {reminders.length > 0 && (
            <button
              onClick={() => setShowConfirmDialog(true)}
              className={`${styles.button} ${styles.buttonDanger}`}
              onMouseEnter={() => {
                if (lilyEnabled) {
                  setLilyMessage("Click this button to remove all reminders at once! Be careful - this action cannot be undone.");
                  setShowLilyMessage(true);
                }
              }}
              onMouseLeave={() => {
                if (lilyEnabled) {
                  setShowLilyMessage(false);
                }
              }}
            >
              <i className="fa-solid fa-trash-can"></i>
              <span style={{ marginLeft: '0.5rem' }}>Clear All</span>
            </button>
          )}
        </div>

        {/* Notes Container */}
      <div 
        id="sticky-container"
        className={styles.notesContainer}
        style={{ minHeight: '600px' }}
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
              <div className={styles.emptyStateIcon}>
                <i className="fa-solid fa-sticky-note"></i>
              </div>
              <h3 className={styles.emptyStateTitle}>
                No reminders for this date
              </h3>
              <p>
                Click "Add Reminder" to create your first reminder for {currentDate.toLocaleDateString()}
              </p>
            </div>
          </div>
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
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <h2>
                  <i className="fa-solid fa-sticky-note" style={{ marginRight: '0.5rem', color: '#fbbf24' }}></i>
                  Create New Reminder
                </h2>
                <button
                  onClick={closeModal}
                  className={styles.modalClose}
                >
                  <i className="fa-solid fa-times" style={{ fontSize: '1.25rem' }}></i>
                </button>
              </div>

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

                {/* Action Buttons */}
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
                    className={`${styles.modalButton} ${styles.modalButtonSubmit}`}
                  >
                    <i className="fa-solid fa-plus"></i>
                    Create Reminder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        )}

        {/* Edit Reminder Modal */}
        {showEditModal && editingReminder && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>
                  <h2>
                    <i className="fa-solid fa-edit" style={{ marginRight: '0.5rem', color: '#fbbf24' }}></i>
                    Edit Reminder
                  </h2>
                  <button
                    onClick={closeEditModal}
                    className={styles.modalClose}
                  >
                    <i className="fa-solid fa-times" style={{ fontSize: '1.25rem' }}></i>
                  </button>
                </div>

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

                  {/* Action Buttons */}
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
                      className={`${styles.modalButton} ${styles.modalButtonSubmit}`}
                    >
                      <i className="fa-solid fa-save"></i>
                      Update Reminder
                    </button>
                  </div>
                </form>
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
      </div>

      {/* Lily Mascot */}
      <LilyMascot />
    </div>
  );
}