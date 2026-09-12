import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { taskApi } from '../services/api';
import ReportsPage from './ReportsPage';
import './DashboardPage.css';

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  user_id: number;
}

const COLUMNS: { key: Task['status']; label: string; color: string }[] = [
  { key: 'todo',        label: '📋 To Do',      color: '#6366f1' },
  { key: 'in-progress', label: '⚙️ In Progress', color: '#f59e0b' },
  { key: 'done',        label: '✅ Done',        color: '#22c55e' },
];

type View = 'dashboard' | 'my-tasks' | 'team' | 'reports';

// Role → ring color map for avatar glow (#5)
const ROLE_COLORS: Record<string, string> = {
  'Admin / Manager': '#a855f7',
  'Frontend Dev':    '#3b82f6',
  'Backend Dev':     '#0ea5e9',
  'UI/UX Designer':  '#ec4899',
  'QA Engineer':     '#f59e0b',
  'DevOps':          '#22c55e',
};

const TEAM_MEMBERS = [
  { name: 'Alok Rajbhar', role: 'Admin / Manager',  avatar: 'A', color: '#6366f1', tasks: 5, done: 3 },
  { name: 'Priya Sharma', role: 'Frontend Dev',      avatar: 'P', color: '#ec4899', tasks: 4, done: 2 },
  { name: 'Rohan Mehta',  role: 'Backend Dev',       avatar: 'R', color: '#f59e0b', tasks: 6, done: 4 },
  { name: 'Sneha Gupta',  role: 'UI/UX Designer',    avatar: 'S', color: '#22c55e', tasks: 3, done: 3 },
  { name: 'Vikram Patel', role: 'QA Engineer',       avatar: 'V', color: '#0ea5e9', tasks: 4, done: 1 },
  { name: 'Nisha Joshi',  role: 'DevOps',            avatar: 'N', color: '#a855f7', tasks: 2, done: 2 },
];

type TeamSort = 'name' | 'completion-high' | 'needs-attention';

/* ─── CountUp hook (#2) ─── */
function useCountUp(target: number, duration = 500, active = true): number {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) { setVal(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setVal(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, active]);

  return val;
}

/* ─── CountUp component wrapper ─── */
const CountUp: React.FC<{ value: number; suffix?: string; active?: boolean }> = ({ value, suffix = '', active = true }) => {
  const display = useCountUp(value, 500, active);
  return <span className="count-up">{display}{suffix}</span>;
};

/* ─── Status helpers (#3) ─── */
function getStatusInfo(pct: number): { className: string; label: string; tooltip: string } {
  if (pct >= 80) return { className: 'status-green',  label: 'On track',       tooltip: `${pct}% complete — On track` };
  if (pct >= 40) return { className: 'status-orange', label: 'In progress',    tooltip: `${pct}% complete — Needs attention` };
  return              { className: 'status-red',    label: 'Needs attention', tooltip: `${pct}% complete — Behind schedule` };
}

const DashboardPage: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [apiError, setApiError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Team state
  const [teamSort, setTeamSort] = useState<TeamSort>('name');
  const [selectedMember, setSelectedMember] = useState<typeof TEAM_MEMBERS[0] | null>(null);

  const fetchTasks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await taskApi.getAll(token);
      setTasks(data.tasks || []);
      setApiError('');
    } catch {
      setApiError('Cannot connect to backend. Start the server with npm run dev in the backend folder.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [token]);

  // Close panel on Escape (#1)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedMember) setSelectedMember(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedMember]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newTitle.trim()) return;
    setCreating(true);
    await taskApi.create(token, newTitle, newDesc);
    setNewTitle('');
    setNewDesc('');
    setShowModal(false);
    setCreating(false);
    fetchTasks();
  };

  const handleStatusChange = async (id: number, status: string) => {
    if (!token) return;
    await taskApi.updateStatus(token, id, status);
    fetchTasks();
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    await taskApi.delete(token, id);
    fetchTasks();
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Sorted team members (#6)
  const getSortedMembers = useCallback(() => {
    const members = [...TEAM_MEMBERS];
    switch (teamSort) {
      case 'name':
        return members.sort((a, b) => a.name.localeCompare(b.name));
      case 'completion-high':
        return members.sort((a, b) => {
          const pctA = a.done / Math.max(a.tasks, 1);
          const pctB = b.done / Math.max(b.tasks, 1);
          return pctB - pctA;
        });
      case 'needs-attention':
        return members.sort((a, b) => {
          const pctA = a.done / Math.max(a.tasks, 1);
          const pctB = b.done / Math.max(b.tasks, 1);
          return pctA - pctB;
        });
      default:
        return members;
    }
  }, [teamSort]);

  // Count of members needing attention (< 50% completion) — for sidebar badge (#10)
  const membersNeedingAttention = TEAM_MEMBERS.filter(m => {
    const pct = Math.round((m.done / Math.max(m.tasks, 1)) * 100);
    return pct < 50;
  }).length;

  const navItems: { key: View; icon: string; label: string }[] = [
    { key: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { key: 'my-tasks',  icon: '📋', label: 'My Tasks'  },
    { key: 'team',      icon: '👥', label: 'Team'      },
    { key: 'reports',   icon: '📊', label: 'Reports'   },
  ];

  const filteredTasks = tasks.filter(t => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Aggregate team stats
  const totalTeamTasks = TEAM_MEMBERS.reduce((a, m) => a + m.tasks, 0);
  const totalTeamDone  = TEAM_MEMBERS.reduce((a, m) => a + m.done, 0);
  const totalTeamPending = totalTeamTasks - totalTeamDone;
  const teamCompletionPct = Math.round((totalTeamDone / Math.max(totalTeamTasks, 1)) * 100);

  /* ─── My Tasks View ─── */
  const renderMyTasks = () => (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h1>📋 My Tasks</h1>
          <p className="view-subtitle">Manage and track all your personal tasks</p>
        </div>
        <button id="create-task-btn" className="btn-primary" onClick={() => setShowModal(true)}>
          + New Task
        </button>
      </div>

      {/* Filters toolbar */}
      <div className="tasks-toolbar glass-card">
        <input
          className="task-search"
          type="text"
          placeholder="🔍  Search tasks…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div className="filter-tabs">
          {['all', 'todo', 'in-progress', 'done'].map(s => (
            <button
              key={s}
              className={`filter-tab ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? '🗂 All' : s === 'todo' ? '📋 To Do' : s === 'in-progress' ? '⚙️ In Progress' : '✅ Done'}
            </button>
          ))}
        </div>
      </div>

      {apiError && <div className="api-error-banner">⚠️ &nbsp;{apiError}</div>}

      {/* Stats row */}
      <div className="stats-strip">
        {COLUMNS.map(col => (
          <div key={col.key} className="stat-card glass-card" onClick={() => setFilterStatus(col.key)} style={{ cursor: 'pointer' }}>
            <span className="stat-label">{col.label}</span>
            <span className="stat-count" style={{ color: col.color }}>
              {tasks.filter(t => t.status === col.key).length}
            </span>
          </div>
        ))}
        <div className="stat-card glass-card" onClick={() => setFilterStatus('all')} style={{ cursor: 'pointer' }}>
          <span className="stat-label">🗂 Total</span>
          <span className="stat-count" style={{ color: '#94a3b8' }}>{tasks.length}</span>
        </div>
      </div>

      {/* Task rows */}
      <div className="my-tasks-list">
        {loading ? (
          <div className="task-loading">Loading…</div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-state glass-card">
            <div className="empty-icon">📭</div>
            <h3>No tasks found</h3>
            <p>Try changing your filter or create a new task.</p>
            <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowModal(true)}>+ Create Task</button>
          </div>
        ) : (
          filteredTasks.map(task => {
            const col = COLUMNS.find(c => c.key === task.status)!;
            return (
              <div key={task.id} className="task-row glass-card">
                <div className="task-row-dot" style={{ background: col.color }} />
                <div className="task-row-body">
                  <p className="task-title">{task.title}</p>
                  {task.description && <p className="task-desc">{task.description}</p>}
                </div>
                <div className="task-row-badge" style={{ color: col.color, borderColor: col.color }}>
                  {col.label}
                </div>
                <select
                  className="status-select"
                  value={task.status}
                  onChange={e => handleStatusChange(task.id, e.target.value)}
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                {user?.role === 'admin' && (
                  <button className="delete-btn" onClick={() => handleDelete(task.id)} title="Delete">🗑</button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  /* ─── Member Detail Panel (#1) ─── */
  const renderMemberPanel = () => {
    if (!selectedMember) return null;
    const memberTasks = tasks.filter(t => t.user_id === (TEAM_MEMBERS.indexOf(selectedMember) + 1));
    const todoTasks = memberTasks.filter(t => t.status === 'todo');
    const inProgressTasks = memberTasks.filter(t => t.status === 'in-progress');
    const doneTasks = memberTasks.filter(t => t.status === 'done');
    const ringColor = ROLE_COLORS[selectedMember.role] || '#6366f1';

    const groups = [
      { label: '📋 To Do',      tasks: todoTasks,       color: '#6366f1', badgeBg: '#6366f1' },
      { label: '⚙️ In Progress', tasks: inProgressTasks, color: '#f59e0b', badgeBg: '#f59e0b' },
      { label: '✅ Done',        tasks: doneTasks,        color: '#22c55e', badgeBg: '#22c55e' },
    ];

    return (
      <>
        <div className="team-panel-overlay" onClick={() => setSelectedMember(null)} />
        <div className="team-panel">
          <div className="panel-header">
            <div className="panel-avatar" style={{ background: `linear-gradient(135deg, ${selectedMember.color}, ${selectedMember.color}88)`, boxShadow: `0 0 16px ${ringColor}44` }}>
              {selectedMember.avatar}
            </div>
            <div className="panel-header-info">
              <h2>{selectedMember.name}</h2>
              <p>{selectedMember.role}</p>
            </div>
            <button className="panel-close-btn" onClick={() => setSelectedMember(null)} title="Close panel">✕</button>
          </div>

          <div className="panel-stats">
            <div className="panel-stat-card">
              <div className="panel-stat-val" style={{ color: selectedMember.color }}>{selectedMember.tasks}</div>
              <div className="panel-stat-label">Total</div>
            </div>
            <div className="panel-stat-card">
              <div className="panel-stat-val" style={{ color: '#22c55e' }}>{selectedMember.done}</div>
              <div className="panel-stat-label">Done</div>
            </div>
            <div className="panel-stat-card">
              <div className="panel-stat-val" style={{ color: '#f59e0b' }}>{selectedMember.tasks - selectedMember.done}</div>
              <div className="panel-stat-label">Pending</div>
            </div>
          </div>

          {groups.map(group => (
            <div key={group.label} className="panel-task-group">
              <div className="panel-task-group-header">
                <span>{group.label}</span>
                <span className="panel-task-group-badge" style={{ background: group.badgeBg }}>{group.tasks.length}</span>
              </div>
              {group.tasks.length === 0 ? (
                <div className="panel-empty">No tasks in this category</div>
              ) : (
                group.tasks.map(task => (
                  <div key={task.id} className="panel-task-item">
                    <p className="task-title">{task.title}</p>
                    {task.description && <p className="task-desc">{task.description}</p>}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </>
    );
  };

  /* ─── Team View ─── */
  const isTeamActive = view === 'team';

  const renderTeam = () => {
    const sortedMembers = getSortedMembers();

    return (
      <div className="view-container">
        <div className="view-header">
          <div>
            <h1>👥 Team</h1>
            <p className="view-subtitle">Meet your team members and track their progress</p>
          </div>
          {/* (#6) Sort + (#7) Accurate label */}
          <div className="team-header-actions">
            <select
              className="team-sort-select"
              value={teamSort}
              onChange={e => setTeamSort(e.target.value as TeamSort)}
            >
              <option value="name">Sort: Name (A–Z)</option>
              <option value="completion-high">Sort: Completion ↓</option>
              <option value="needs-attention">Sort: Needs Attention</option>
            </select>
            <div className="team-stat-pill glass-card">
              <span>👥</span> <strong>{TEAM_MEMBERS.length}</strong> team members
            </div>
          </div>
        </div>

        {/* (#8) Section label: Overview */}
        <div className="team-section-label">Overview</div>

        {/* Team overview stats with count-up (#2) */}
        <div className="team-overview-stats">
          <div className="glass-card team-ov-card">
            <span className="ov-icon">👥</span>
            <div>
              <p className="ov-val"><CountUp value={TEAM_MEMBERS.length} active={isTeamActive} /></p>
              <p className="ov-label">Total Members</p>
            </div>
          </div>
          <div className="glass-card team-ov-card">
            <span className="ov-icon">✅</span>
            <div>
              <p className="ov-val"><CountUp value={totalTeamDone} active={isTeamActive} /></p>
              <p className="ov-label">Tasks Completed</p>
            </div>
          </div>
          <div className="glass-card team-ov-card">
            <span className="ov-icon">⚙️</span>
            <div>
              <p className="ov-val"><CountUp value={totalTeamPending} active={isTeamActive} /></p>
              <p className="ov-label">In Progress</p>
            </div>
          </div>
          <div className="glass-card team-ov-card">
            <span className="ov-icon">📈</span>
            <div>
              <p className="ov-val"><CountUp value={teamCompletionPct} suffix="%" active={isTeamActive} /></p>
              <p className="ov-label">Team Completion</p>
            </div>
          </div>
        </div>

        {/* (#8) Section label: Members */}
        <div className="team-section-label">Members</div>

        {/* Member cards */}
        <div className="team-grid">
          {sortedMembers.map((member, i) => {
            const pct = Math.round((member.done / Math.max(member.tasks, 1)) * 100);
            const statusInfo = getStatusInfo(pct);
            const ringColor = ROLE_COLORS[member.role] || '#6366f1';

            return (
              <div
                key={i}
                className="member-card glass-card clickable"
                onClick={() => setSelectedMember(member)}
                title={`Click to view ${member.name}'s tasks`}
              >
                {/* (#3) 3-state status indicator */}
                <div className={`member-status-indicator ${statusInfo.className}`} title={statusInfo.tooltip}>
                  <span className="status-indicator-dot" />
                  {statusInfo.label}
                </div>

                {/* (#5) Role-based avatar ring */}
                <div className="member-avatar-wrap">
                  <div className="member-avatar-ring" style={{ borderColor: ringColor, boxShadow: `0 0 10px ${ringColor}33` }} />
                  <div className="member-avatar" style={{ background: `linear-gradient(135deg, ${member.color}, ${member.color}88)` }}>
                    {member.avatar}
                  </div>
                </div>

                <h3 className="member-name">{member.name}</h3>
                <span className="member-role-badge">{member.role}</span>

                {/* Stats with count-up (#2) */}
                <div className="member-stats">
                  <div className="member-stat">
                    <span className="ms-val" style={{ color: member.color }}>
                      <CountUp value={member.tasks} active={isTeamActive} />
                    </span>
                    <span className="ms-label">Total</span>
                  </div>
                  <div className="member-stat">
                    <span className="ms-val" style={{ color: '#22c55e' }}>
                      <CountUp value={member.done} active={isTeamActive} />
                    </span>
                    <span className="ms-label">Done</span>
                  </div>
                  <div className="member-stat">
                    <span className="ms-val" style={{ color: '#f59e0b' }}>
                      <CountUp value={member.tasks - member.done} active={isTeamActive} />
                    </span>
                    <span className="ms-label">Pending</span>
                  </div>
                </div>

                {/* (#4) Progress bar with label */}
                <div className="member-progress-header">
                  <span className="member-progress-label">Completion</span>
                  <span className="member-pct" style={{ color: member.color }}>{pct}%</span>
                </div>
                <div className="member-progress-wrap" style={{ marginTop: '4px' }}>
                  <div className="member-progress-bar">
                    <div className="member-progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${member.color}, ${member.color}99)` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* (#9) Note: Due-date field */}
        {/* NOTE: No due_date column exists in the tasks table yet.
            Once a migration adds `due_date DATE` to the tasks table,
            Pending stats can show a red warning icon for overdue tasks.
            This is a follow-up requiring: ALTER TABLE tasks ADD COLUMN due_date DATE DEFAULT NULL; */}
      </div>
    );
  };

  /* ─── Dashboard (Kanban) View ─── */
  const renderDashboard = () => (
    <main className="main-content">
      <header className="dashboard-header">
        <div>
          <h1>{getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0]}!</span> 👋</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
            {tasks.filter(t => t.status !== 'done').length} tasks remaining today
          </p>
        </div>
        <button id="create-task-btn" className="btn-primary" onClick={() => setShowModal(true)}>
          + New Task
        </button>
      </header>

      <div className="stats-strip">
        {COLUMNS.map(col => (
          <div key={col.key} className="stat-card glass-card" onClick={() => { setView('my-tasks'); setFilterStatus(col.key); }} style={{ cursor: 'pointer' }}>
            <span className="stat-label">{col.label}</span>
            <span className="stat-count" style={{ color: col.color }}>
              {tasks.filter(t => t.status === col.key).length}
            </span>
          </div>
        ))}
        <div className="stat-card glass-card" onClick={() => setView('my-tasks')} style={{ cursor: 'pointer' }}>
          <span className="stat-label">🗂 Total</span>
          <span className="stat-count" style={{ color: '#94a3b8' }}>{tasks.length}</span>
        </div>
      </div>

      {apiError && <div className="api-error-banner">⚠️ &nbsp;{apiError}</div>}

      <div className="kanban-board">
        {COLUMNS.map(col => (
          <div key={col.key} className="kanban-col glass-card">
            <div className="col-header" style={{ borderBottom: `2px solid ${col.color}` }}>
              <h3>{col.label}</h3>
              <span className="col-badge" style={{ background: col.color }}>
                {tasks.filter(t => t.status === col.key).length}
              </span>
            </div>
            <div className="task-list">
              {loading ? (
                <div className="task-loading">Loading…</div>
              ) : tasks.filter(t => t.status === col.key).length === 0 ? (
                <div className="task-empty">No tasks here yet.</div>
              ) : (
                tasks.filter(t => t.status === col.key).map(task => (
                  <div key={task.id} className="task-card glass-card">
                    <p className="task-title">{task.title}</p>
                    {task.description && <p className="task-desc">{task.description}</p>}
                    <div className="task-actions">
                      <select
                        className="status-select"
                        value={task.status}
                        onChange={e => handleStatusChange(task.id, e.target.value)}
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                      {user?.role === 'admin' && (
                        <button className="delete-btn" onClick={() => handleDelete(task.id)} title="Delete task">🗑</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );

  return (
    <div className="dashboard">
      {/* ── Sidebar ── */}
      <aside className="sidebar glass-card">
        <div className="sidebar-logo">
          <div className="logo-icon">T</div>
          <span className="gradient-text">TaskFlow</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <a
              key={item.key}
              href="#"
              id={`nav-${item.key}`}
              className={`nav-item ${view === item.key ? 'active' : ''}`}
              onClick={e => { e.preventDefault(); setView(item.key); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {/* (#10) My Tasks badge */}
              {item.key === 'my-tasks' && tasks.filter(t => t.status !== 'done').length > 0 && (
                <span className="nav-badge">{tasks.filter(t => t.status !== 'done').length}</span>
              )}
              {/* (#10) Team badge — members below 50% completion */}
              {item.key === 'team' && membersNeedingAttention > 0 && (
                <span className="nav-badge-warn" title={`${membersNeedingAttention} member(s) below 50% completion`}>{membersNeedingAttention}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <div>
            <p className="user-name">{user?.name}</p>
            <p className="user-role">{user?.role}</p>
          </div>
          <button id="logout-btn" onClick={logout} className="logout-btn" title="Logout">⏏</button>
        </div>
      </aside>

      {/* ── Page Content ── */}
      {view === 'dashboard' && renderDashboard()}
      {view === 'my-tasks'  && <main className="main-content">{renderMyTasks()}</main>}
      {view === 'team'      && <main className="main-content">{renderTeam()}</main>}
      {view === 'reports'   && <ReportsPage onBack={() => setView('dashboard')} />}

      {/* ── Member Detail Panel (#1) ── */}
      {selectedMember && renderMemberPanel()}

      {/* ── Create Task Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal glass-card" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px' }}>Create New Task</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="task-title">Task Title *</label>
                <input
                  id="task-title"
                  type="text"
                  placeholder="e.g. Design login screen"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label htmlFor="task-desc">Description (optional)</label>
                <textarea
                  id="task-desc"
                  rows={3}
                  placeholder="Add details about this task…"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button id="modal-cancel-btn" type="button" className="modal-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button id="modal-create-btn" type="submit" className="btn-primary" disabled={creating} style={{ flex: 1 }}>
                  {creating ? 'Creating…' : '+ Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
