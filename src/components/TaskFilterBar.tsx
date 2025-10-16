import React, { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * TaskFilterBar (Minimal, De-noised)
 * - One slim row: Search • Status • Priority • Assignees • Clear
 * - Subtle borders, no heavy panels, low visual noise
 * - Keyboard accessible, zero external UI libs
 */

type StatusKey = "all" | "pending" | "in_progress" | "review" | "completed";
type PriorityKey = "all" | "low" | "medium" | "high";

const STATUS_OPTIONS: { key: StatusKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "completed", label: "Completed" },
];

const PRIORITY_OPTIONS: { key: PriorityKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
];

// Icons (inline SVGs keep deps at zero)
const IconSearch = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconChevronDown = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconUsers = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);


interface User {
  user_id: number;
  username: string;
  role: string;
  icon?: string;
  full_name?: string;
}

interface TaskFilterBarProps {
  query: string;
  setQuery: (query: string) => void;
  statusFilter: StatusKey;
  setStatusFilter: (status: StatusKey) => void;
  priorityFilter: PriorityKey;
  setPriorityFilter: (priority: PriorityKey) => void;
  assigneeFilter: number | 'All';
  setAssigneeFilter: (assignee: number | 'All') => void;
  availableUsers: User[];
  onClearAll: () => void;
}

// Pure utility so we can test summary generation
export function makeSummary(status: StatusKey, priority: PriorityKey, assignees: string[]) {
  const s = STATUS_OPTIONS.find((x) => x.key === status)?.label;
  const p = PRIORITY_OPTIONS.find((x) => x.key === priority)?.label;
  const a = assignees.length === 0 ? "All assignees" : assignees.join(", ");
  return `${s} • ${p} • ${a}`;
}

export default function TaskFilterBar({
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  assigneeFilter,
  setAssigneeFilter,
  availableUsers,
  onClearAll
}: TaskFilterBarProps) {
  const [assignees, setAssignees] = useState<string[]>([]);

  // Convert user IDs to names for display
  const assigneeNames = useMemo(() => {
    if (assigneeFilter === 'All') return [];
    const user = availableUsers.find(u => u.user_id === assigneeFilter);
    return user ? [user.full_name || user.username] : [];
  }, [assigneeFilter, availableUsers]);

  const summary = useMemo(() => makeSummary(statusFilter, priorityFilter, assigneeNames), [statusFilter, priorityFilter, assigneeNames]);

  const handleClearAll = () => {
    setQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("All");
    setAssignees([]);
    onClearAll();
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Hairline toolbar */}
      <div style={{ 
        borderBottom: '1px solid rgba(125, 141, 134, 0.6)', 
        background: 'transparent' 
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          padding: '0 1rem' 
        }}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 0' 
          }}>
            {/* Search */}
            <label style={{ 
              position: 'relative', 
              width: '280px',
              flexShrink: 0
            }}>
              <span className="sr-only">Search tasks</span>
              <IconSearch style={{ 
                position: 'absolute', 
                left: '0.75rem', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                height: '1rem', 
                width: '1rem', 
                color: '#aeb4be' 
              }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                style={{
                  width: '100%',
                  height: '2.25rem',
                  padding: '0 0.75rem 0 2.25rem',
                  border: '1px solid rgba(125, 141, 134, 0.6)',
                  borderRadius: '0.5rem',
                  background: 'transparent',
                  color: '#ffffff',
                  outline: 'none',
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </label>

            {/* Quiet dropdowns */}
            <MenuSelect
              label="Status"
              valueKey={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusKey)}
              options={STATUS_OPTIONS}
            />

            <MenuSelect
              label="Priority"
              valueKey={priorityFilter}
              onChange={(v) => setPriorityFilter(v as PriorityKey)}
              options={PRIORITY_OPTIONS}
            />

            <AssigneeMenu 
              people={availableUsers} 
              value={assigneeFilter} 
              onChange={setAssigneeFilter} 
            />

            <button
              onClick={handleClearAll}
              style={{
                marginLeft: 'auto',
                height: '2.25rem',
                padding: '0 0.75rem',
                border: '1px solid rgba(125, 141, 134, 0.6)',
                borderRadius: '0.5rem',
                background: 'transparent',
                color: '#aeb4be',
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            >
              Clear
            </button>
          </div>
          <div style={{ 
            paddingBottom: '0.5rem', 
            fontSize: '0.75rem', 
            color: '#aeb4be' 
          }}>{summary}</div>
        </div>
      </div>
    </div>
  );
}

// Hook for detecting clicks outside an element
function useClickOutside(ref: React.RefObject<HTMLElement>, callback: () => void) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback]);
}

// Generic single-select popover
function MenuSelect<T extends string>({
  label,
  valueKey,
  onChange,
  options,
}: {
  label: string;
  valueKey: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.key === valueKey)?.label ?? label;
  
  useClickOutside(containerRef, () => setOpen(false));
  
  return (
    <div ref={containerRef} style={{ position: 'relative', overflow: 'visible' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          height: '2.25rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0 0.75rem',
          border: '1px solid rgba(125, 141, 134, 0.6)',
          borderRadius: '0.5rem',
          background: 'transparent',
          color: '#ffffff',
          fontSize: '0.875rem',
          cursor: 'pointer',
          fontFamily: 'inherit',
          boxSizing: 'border-box'
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={{ color: '#aeb4be' }}>{label}:</span>
        <span style={{ 
          maxWidth: '7rem', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap' 
        }} title={active}>{active}</span>
        <IconChevronDown style={{ 
          height: '1rem', 
          width: '1rem', 
          transition: 'transform 0.2s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
        }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12 }}
            role="listbox"
            style={{
              position: 'absolute',
              zIndex: 9999,
              marginTop: '0.5rem',
              width: '220px',
              overflow: 'hidden',
              border: '1px solid rgba(125, 141, 134, 0.6)',
              borderRadius: '0.5rem',
              background: '#14161a',
              boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              listStyle: 'none',
              margin: 0,
              padding: 0
            }}
          >
            {options.map((o) => (
              <li key={o.key} style={{ 
                borderBottom: '1px solid rgba(125, 141, 134, 0.4)',
                listStyle: 'none',
                margin: 0,
                padding: 0
              }}>
                <button
                  onClick={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: o.key === valueKey ? '#ffffff' : '#aeb4be',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// Single-select assignee menu
function AssigneeMenu({
  people,
  value,
  onChange,
}: {
  people: User[];
  value: number | 'All';
  onChange: (v: number | 'All') => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const display = value === 'All' ? 'All' : (() => {
    const user = people.find(p => p.user_id === value);
    return user?.full_name || user?.username || 'Unknown';
  })();

  const allPeople = ['All', ...people.map(p => p.full_name || p.username)];

  useClickOutside(containerRef, () => setOpen(false));

  return (
    <div ref={containerRef} style={{ position: 'relative', overflow: 'visible' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          height: '2.25rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0 0.75rem',
          border: '1px solid rgba(125, 141, 134, 0.6)',
          borderRadius: '0.5rem',
          background: 'transparent',
          color: '#ffffff',
          fontSize: '0.875rem',
          cursor: 'pointer',
          maxWidth: '220px',
          fontFamily: 'inherit',
          boxSizing: 'border-box'
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <IconUsers style={{ 
          height: '1rem', 
          width: '1rem', 
          color: '#aeb4be' 
        }} />
        <span style={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap' 
        }} title={display}>{display}</span>
        <IconChevronDown style={{ 
          height: '1rem', 
          width: '1rem', 
          transition: 'transform 0.2s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
        }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12 }}
            role="listbox"
            style={{
              position: 'absolute',
              zIndex: 9999,
              marginTop: '0.5rem',
              width: '260px',
              overflow: 'hidden',
              border: '1px solid rgba(125, 141, 134, 0.6)',
              borderRadius: '0.5rem',
              background: '#14161a',
              boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              listStyle: 'none',
              margin: 0,
              padding: 0
            }}
          >
            {allPeople.map((p, index) => {
              const isAll = p === 'All';
              const active = (isAll && value === 'All') || (!isAll && people[index - 1]?.user_id === value);
              return (
                <li key={isAll ? 'all' : people[index - 1]?.user_id} style={{ 
                  borderBottom: '1px solid rgba(125, 141, 134, 0.4)',
                  listStyle: 'none',
                  margin: 0,
                  padding: 0
                }}>
                  <button
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: active ? '#ffffff' : '#aeb4be',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (isAll) {
                        onChange('All');
                      } else {
                        const user = people[index - 1];
                        if (user) onChange(user.user_id);
                      }
                      setOpen(false);
                    }}
                  >
                    {p}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Lightweight runtime tests (dev-only)
 * These assert basic invariants without affecting UI.
 */
(function runToolbarTests() {
  try {
    // 1) options integrity
    if (STATUS_OPTIONS.length !== 5) throw new Error("STATUS_OPTIONS length should be 5");
    if (PRIORITY_OPTIONS.length !== 4) throw new Error("PRIORITY_OPTIONS length should be 4");

    // 2) summary generation
    const t1 = makeSummary("all", "all", []);
    if (!t1.includes("All") || !t1.includes("All assignees")) throw new Error("Summary for all/all failed");
    const t2 = makeSummary("pending", "high", ["You"]);
    if (!t2.includes("Pending") || !t2.includes("High") || !t2.includes("You")) throw new Error("Summary pending/high/You failed");

    // 3) assignee display fallback
    const t3 = makeSummary("review", "medium", []);
    if (!t3.includes("All assignees")) throw new Error("Assignee fallback failed");

    // 4) stable keys
    const keysOk = STATUS_OPTIONS.map((o) => o.key).join(",") === "all,pending,in_progress,review,completed";
    if (!keysOk) throw new Error("Status keys changed unexpectedly");

    console.log("TaskFilterBar tests passed");
  } catch (err) {
    console.error("TaskFilterBar tests FAILED:", err);
  }
})();
