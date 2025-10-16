import React, { useState, useEffect } from 'react';
import { Reminder, TaskStatus } from '../types/multitenant';
import { supabase } from '../lib/supabaseClient';
import { getTaskIconElement } from '../utils/taskIcons';
import styles from './UserProfileModal.module.css';

interface User {
  user_id: number;
  username: string;
  role: string;
  icon?: string;
  full_name?: string;
}

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  businessId: number;
  branchId?: number;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  open,
  onClose,
  user,
  businessId,
  branchId
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'completed'>('current');
  const [currentTasks, setCurrentTasks] = useState<Reminder[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's tasks
  const fetchUserTasks = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('reminders')
        .select(`
          *,
          assigned_to_user:users!assigned_to(user_id, username, role, icon, full_name),
          assigned_by_user:users!assigned_by(user_id, username, role, icon, full_name),
          completed_by_user:users!completed_by(user_id, username, role, icon, full_name)
        `)
        .eq('business_id', businessId)
        .eq('assigned_to', user.user_id)
        .eq('is_task', true);

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query.order('remind_date', { ascending: true });

      if (error) throw error;

      const tasks = data || [];
      setCurrentTasks(tasks.filter(task => !task.resolved));
      setCompletedTasks(tasks.filter(task => task.resolved));
    } catch (error) {
      // Error fetching user tasks
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user) {
      fetchUserTasks();
    }
  }, [open, user, businessId, branchId]);

  const getTaskStatus = (task: Reminder): TaskStatus => {
    if (task.status) return task.status;
    return task.resolved ? 'Completed' : 'Pending';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: TaskStatus) => {
    const colors = {
      'Pending': '#fbbf24',
      'In Progress': '#3b82f6',
      'Review': '#8b5cf6',
      'Completed': '#10b981'
    };
    return colors[status];
  };

  const getPriorityColor = (priority: string | undefined) => {
    const colors = {
      'Low': '#10b981',
      'Medium': '#fbbf24',
      'High': '#ef4444'
    };
    return colors[priority as keyof typeof colors] || '#6b7280';
  };

  if (!open || !user) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user.icon ? (
                <img
                  src={`/images/icons/${user.icon}.png`}
                  alt={user.full_name || user.username}
                  className={styles.avatarImage}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {(user.full_name || user.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={styles.userDetails}>
              <h2 className={styles.userName}>{user.full_name || user.username}</h2>
              <p className={styles.userRole}>{user.role}</p>
            </div>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.tabContainer}>
            <button
              className={`${styles.tab} ${activeTab === 'current' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('current')}
            >
              <i className="fa-solid fa-clock"></i>
              Current Tasks ({currentTasks.length})
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'completed' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              <i className="fa-solid fa-check-circle"></i>
              Completed Tasks ({completedTasks.length})
            </button>
          </div>

          <div className={styles.tabContent}>
            {loading ? (
              <div className={styles.loading}>
                <i className="fa-solid fa-spinner fa-spin"></i>
                Loading tasks...
              </div>
            ) : (
              <>
                {activeTab === 'current' && (
                  <div className={styles.tasksList}>
                    {currentTasks.length === 0 ? (
                      <div className={styles.emptyState}>
                        <i className="fa-solid fa-inbox"></i>
                        <p>No current tasks assigned</p>
                      </div>
                    ) : (
                      currentTasks.map(task => (
                        <div key={task.reminder_id} className={styles.taskCard}>
                          <div className={styles.taskHeader}>
                            <div className={styles.taskTitleRow}>
                              {task.task_icon && (() => {
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
                              })()}
                              <h3 className={styles.taskTitle}>{task.title}</h3>
                            </div>
                            <div className={styles.taskBadges}>
                              <span
                                className={styles.priorityBadge}
                                style={{ backgroundColor: getPriorityColor(task.priority) }}
                              >
                                {task.priority || 'None'}
                              </span>
                              <span
                                className={styles.statusBadge}
                                style={{ backgroundColor: getStatusColor(getTaskStatus(task)) }}
                              >
                                {getTaskStatus(task)}
                              </span>
                            </div>
                          </div>
                          <p className={styles.taskDescription}>{task.body}</p>
                          <div className={styles.taskMeta}>
                            <span className={styles.taskDate}>
                              <i className="fa-solid fa-calendar"></i>
                              Due: {formatDate(task.remind_date)}
                            </span>
                            {task.assigned_by_user && (
                              <span className={styles.taskAssignedBy}>
                                <i className="fa-solid fa-user-plus"></i>
                                Assigned by: {task.assigned_by_user.full_name || task.assigned_by_user.username}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'completed' && (
                  <div className={styles.tasksList}>
                    {completedTasks.length === 0 ? (
                      <div className={styles.emptyState}>
                        <i className="fa-solid fa-check-circle"></i>
                        <p>No completed tasks</p>
                      </div>
                    ) : (
                      completedTasks.map(task => (
                        <div key={task.reminder_id} className={styles.taskCard}>
                          <div className={styles.taskHeader}>
                            <div className={styles.taskTitleRow}>
                              {task.task_icon && (() => {
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
                              })()}
                              <h3 className={styles.taskTitle}>{task.title}</h3>
                            </div>
                            <div className={styles.taskBadges}>
                              <span
                                className={styles.priorityBadge}
                                style={{ backgroundColor: getPriorityColor(task.priority) }}
                              >
                                {task.priority || 'None'}
                              </span>
                              <span
                                className={styles.statusBadge}
                                style={{ backgroundColor: getStatusColor(getTaskStatus(task)) }}
                              >
                                {getTaskStatus(task)}
                              </span>
                            </div>
                          </div>
                          <p className={styles.taskDescription}>{task.body}</p>
                          <div className={styles.taskMeta}>
                            <span className={styles.taskDate}>
                              <i className="fa-solid fa-calendar"></i>
                              Due: {formatDate(task.remind_date)}
                            </span>
                            {task.completed_at && (
                              <span className={styles.taskCompleted}>
                                <i className="fa-solid fa-check"></i>
                                Completed: {formatDate(task.completed_at)}
                              </span>
                            )}
                            {task.assigned_by_user && (
                              <span className={styles.taskAssignedBy}>
                                <i className="fa-solid fa-user-plus"></i>
                                Assigned by: {task.assigned_by_user.full_name || task.assigned_by_user.username}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
