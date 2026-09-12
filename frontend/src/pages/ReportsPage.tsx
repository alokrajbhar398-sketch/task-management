import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import './ReportsPage.css';

const BASE_URL = 'http://localhost:5000/api';

interface ReportSummary {
  total: number;
  done: number;
  in_progress: number;
  todo: number;
  completion_pct: number;
}

interface ReportData {
  generated_at: string;
  summary: ReportSummary;
  tasks: any[];
}

interface ScheduleEntry {
  slot: number;
  start_time: string;
  end_time: string;
  task_title: string;
  priority_score: number;
  urgency: number;
  complexity: number;
}

interface ScheduleData {
  generated_at: string;
  algorithm: string;
  schedule: ScheduleEntry[];
}

const ReportsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { token } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [error, setError] = useState('');

  const generateReport = async () => {
    setLoadingReport(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.report) setReportData(data.report);
      else setError(data.message || 'Failed to generate report. Ensure backend and Python are running.');
    } catch {
      setError('Cannot reach the backend server. Start it with "npm run dev" in the backend folder.');
    } finally {
      setLoadingReport(false);
    }
  };

  const generateSchedule = async () => {
    setLoadingSchedule(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/reports/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slots: 5 }),
      });
      const data = await res.json();
      if (data.schedule) setScheduleData(data.schedule);
      else setError(data.message || 'Failed to generate schedule.');
    } catch {
      setError('Cannot reach the backend server.');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const downloadCSV = () => {
    window.open(`${BASE_URL}/reports/csv?token=${token}`, '_blank');
  };

  const getChartData = (summary: ReportSummary) => [
    { name: 'Completed', value: summary.done, color: '#22c55e' },
    { name: 'In Progress', value: summary.in_progress, color: '#f59e0b' },
    { name: 'To Do', value: summary.todo, color: '#6366f1' },
  ].filter(d => d.value > 0);

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="reports-header">
        <button id="back-btn" className="back-btn" onClick={onBack}>← Back to Dashboard</button>
        <div>
          <h1>📊 Reports & Analytics</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
            Automated reports powered by Python scripts
          </p>
        </div>
      </div>

      {error && <div className="api-error-banner">⚠️ &nbsp;{error}</div>}

      {/* Action Cards */}
      <div className="report-actions">
        <div className="glass-card report-action-card">
          <div className="action-icon">🐍</div>
          <h3>Generate Full Report</h3>
          <p>Runs <code>generate_report.py</code> — exports CSV and productivity summary from MySQL.</p>
          <button id="generate-report-btn" className="btn-primary" onClick={generateReport} disabled={loadingReport}>
            {loadingReport ? '⏳ Running Python…' : 'Generate Report'}
          </button>
        </div>

        <div className="glass-card report-action-card">
          <div className="action-icon">⚙️</div>
          <h3>Smart Task Scheduler</h3>
          <p>Runs <code>task_scheduler.py</code> — applies O(n log n) greedy algorithm to prioritise tasks.</p>
          <button id="generate-schedule-btn" className="btn-primary" onClick={generateSchedule} disabled={loadingSchedule}>
            {loadingSchedule ? '⏳ Running Algorithm…' : 'Run Scheduler'}
          </button>
        </div>

        <div className="glass-card report-action-card">
          <div className="action-icon">📥</div>
          <h3>Download CSV</h3>
          <p>Download the raw task data export as a spreadsheet file.</p>
          <button id="download-csv-btn" style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid var(--glass-border)' }} onClick={downloadCSV}>
            Download CSV
          </button>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="glass-card results-card">
          <h2>📈 Productivity Summary <span className="gen-time">Generated: {reportData.generated_at}</span></h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
            <div style={{ flex: '1 1 300px' }}>
              <div className="summary-grid">
                <div className="summary-stat" style={{ borderColor: '#94a3b8' }}>
                  <span className="s-val">{reportData.summary.total}</span>
                  <span className="s-label">Total Tasks</span>
                </div>
                <div className="summary-stat" style={{ borderColor: '#22c55e' }}>
                  <span className="s-val">{reportData.summary.done}</span>
                  <span className="s-label">Completed</span>
                </div>
                <div className="summary-stat" style={{ borderColor: '#f59e0b' }}>
                  <span className="s-val">{reportData.summary.in_progress}</span>
                  <span className="s-label">In Progress</span>
                </div>
                <div className="summary-stat" style={{ borderColor: '#6366f1' }}>
                  <span className="s-val">{reportData.summary.todo}</span>
                  <span className="s-label">To Do</span>
                </div>
                <div className="summary-stat" style={{ borderColor: '#ec4899' }}>
                  <span className="s-val">{reportData.summary.completion_pct}%</span>
                  <span className="s-label">Completion Rate</span>
                </div>
              </div>
              <div className="progress-bar-wrap" style={{ marginTop: '20px' }}>
                <div className="progress-bar-fill" style={{ width: `${reportData.summary.completion_pct}%` }}></div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                {reportData.summary.completion_pct}% of all tasks are completed
              </p>
            </div>
            {reportData.summary.total > 0 && (
              <div style={{ flex: '1 1 200px', height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getChartData(reportData.summary)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {getChartData(reportData.summary).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Results */}
      {scheduleData && (
        <div className="glass-card results-card">
          <h2>🗓 Optimised Schedule <span className="gen-time">{scheduleData.algorithm}</span></h2>
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Time</th>
                <th>Task</th>
                <th>Urgency</th>
                <th>Complexity</th>
                <th>Priority Score</th>
              </tr>
            </thead>
            <tbody>
              {scheduleData.schedule.map(entry => (
                <tr key={entry.slot}>
                  <td>#{entry.slot}</td>
                  <td>{entry.start_time} – {entry.end_time}</td>
                  <td>{entry.task_title}</td>
                  <td>{'⭐'.repeat(entry.urgency)}</td>
                  <td>{'🔷'.repeat(entry.complexity)}</td>
                  <td>
                    <span className="score-badge">{entry.priority_score}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
