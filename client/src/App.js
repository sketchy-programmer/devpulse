import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n, dec = 1) => (typeof n === 'number' ? n.toFixed(dec) : '—');
const fmtMs = ms => ms >= 60000 ? `${(ms/60000).toFixed(1)}m` : ms >= 1000 ? `${(ms/1000).toFixed(1)}s` : `${ms}ms`;
const alertColor = level => ({ ok: '#00ff9d', warning: '#ffb800', critical: '#ff3b5c' }[level] || '#00ff9d');

// ── Auth ──────────────────────────────────────────────────────────────────────

function LoginPage({ onLogin }) {
  const [slug, setSlug] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!slug || !key) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/login`, { teamSlug: slug, agentKey: key });
      localStorage.setItem('dp_token', res.data.token);
      localStorage.setItem('dp_team', JSON.stringify(res.data.team));
      onLogin(res.data.team, res.data.token);
    } catch {
      setError('Invalid credentials. Check your team slug and agent key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginBox}>
        <div style={styles.loginLogo}>
          <span style={styles.logoMark}>◈</span>
          <span style={styles.logoText}>DevPulse</span>
        </div>
        <p style={styles.loginSub}>Team health monitoring</p>

        <div style={styles.field}>
          <label style={styles.label}>Team slug</label>
          <input
            style={styles.input}
            placeholder="my-team"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Agent key</label>
          <input
            style={{ ...styles.input, fontFamily: 'monospace', letterSpacing: '0.05em' }}
            placeholder="paste your agent key"
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && <p style={styles.errorMsg}>{error}</p>}

        <button
          style={{ ...styles.loginBtn, opacity: loading ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Enter dashboard →'}
        </button>
      </div>

      <div style={styles.loginBg}>
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{ ...styles.bgDot, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animationDelay: `${i * 0.4}s` }} />
        ))}
      </div>
    </div>
  );
}

// ── Metric Gauge ──────────────────────────────────────────────────────────────

function Gauge({ value, label, unit = '%', warn = 80, crit = 95 }) {
  const color = value >= crit ? '#ff3b5c' : value >= warn ? '#ffb800' : '#00ff9d';
  const pct = Math.min(value || 0, 100);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div style={styles.gaugeWrap}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1a1a2e" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s ease' }}
        />
        <text x="48" y="52" textAnchor="middle" fill={color} fontSize="14" fontFamily="'JetBrains Mono', monospace" fontWeight="700">
          {fmt(pct, 0)}{unit}
        </text>
      </svg>
      <span style={{ ...styles.gaugeLabel, color }}>{label}</span>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({ metric }) {
  if (!metric) return (
    <div style={styles.metricCard}>
      <div style={styles.cardHeader}>
        <span style={styles.hostName}>No data yet</span>
        <span style={{ ...styles.alertBadge, background: '#1a1a2e', color: '#555' }}>waiting</span>
      </div>
      <p style={{ color: '#444', fontSize: '13px', marginTop: '16px' }}>
        Run <code style={styles.code}>python3 agent/agent.py</code> to start sending metrics.
      </p>
    </div>
  );

  const { host, cpu, memory, disk, alertLevel, collectedAt } = metric;
  const ago = collectedAt ? Math.round((Date.now() - new Date(collectedAt)) / 1000) : null;

  return (
    <div style={{ ...styles.metricCard, borderColor: alertColor(alertLevel) + '33' }}>
      <div style={styles.cardHeader}>
        <span style={styles.hostName}>{host}</span>
        <span style={{ ...styles.alertBadge, background: alertColor(alertLevel) + '22', color: alertColor(alertLevel) }}>
          {alertLevel}
        </span>
      </div>
      <div style={styles.gaugeRow}>
        <Gauge value={cpu?.percent} label="CPU" warn={80} crit={95} />
        <Gauge value={memory?.percentUsed} label="MEM" warn={80} crit={95} />
        <Gauge value={disk?.percentUsed} label="DISK" warn={75} crit={90} />
      </div>
      <div style={styles.metaRow}>
        <span style={styles.metaItem}>Load: {fmt(cpu?.loadAvg1m, 2)}</span>
        <span style={styles.metaItem}>{fmt(memory?.usedMB / 1024, 1)} / {fmt(memory?.totalMB / 1024, 1)} GB</span>
        {ago !== null && <span style={styles.metaItem}>{ago}s ago</span>}
      </div>
    </div>
  );
}

// ── Pipeline Row ──────────────────────────────────────────────────────────────

function PipelineRow({ run }) {
  const statusColor = { success: '#00ff9d', failure: '#ff3b5c', running: '#ffb800', cancelled: '#666' }[run.status] || '#666';
  const statusIcon = { success: '✓', failure: '✗', running: '◌', cancelled: '—' }[run.status] || '?';
  const date = new Date(run.startedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={styles.pipelineRow}>
      <span style={{ ...styles.statusIcon, color: statusColor }}>{statusIcon}</span>
      <div style={styles.pipelineInfo}>
        <span style={styles.repoName}>{run.repoName}</span>
        <span style={styles.branchName}>{run.branch}</span>
      </div>
      <div style={styles.pipelineMeta}>
        {run.durationMs && <span style={styles.duration}>{fmtMs(run.durationMs)}</span>}
        <span style={styles.runDate}>{date}</span>
      </div>
      {run.stages?.length > 0 && (
        <div style={styles.stageRow}>
          {run.stages.map((s, i) => (
            <span key={i} style={{ ...styles.stagePill, background: { success: '#00ff9d22', failure: '#ff3b5c22', running: '#ffb80022', skipped: '#33333344' }[s.status] || '#333', color: { success: '#00ff9d', failure: '#ff3b5c', running: '#ffb800', skipped: '#555' }[s.status] || '#555' }}>
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sparkline chart ───────────────────────────────────────────────────────────

function Sparkline({ data, dataKey, color }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={`url(#grad-${dataKey})`} dot={false} />
        <Tooltip
          contentStyle={{ background: '#0d0d1a', border: `1px solid ${color}44`, borderRadius: 4, fontSize: 11 }}
          labelStyle={{ display: 'none' }}
          formatter={v => [`${fmt(v)}%`, '']}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

function Dashboard({ team, token, onLogout }) {
  const [metrics, setMetrics] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, pRes] = await Promise.all([
        axios.get(`${API}/metrics/${team.id}`, { headers }),
        axios.get(`${API}/pipeline/${team.id}`, { headers }),
      ]);
      setMetrics(mRes.data);
      setPipeline(pRes.data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [team.id, token]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Build sparkline data from history
  const sparkData = metrics?.history?.slice(0, 30).reverse().map((m, i) => ({
    i,
    cpu: m.cpu?.percent,
    mem: m.memory?.percentUsed,
    disk: m.disk?.percentUsed,
  })) || [];

  const passRate = pipeline?.passRate;
  const avgDuration = pipeline?.avgDurationMs;

  return (
    <div style={styles.dashWrap}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logoMark}>◈</span>
          <span style={styles.headerTitle}>DevPulse</span>
          <span style={styles.teamBadge}>{team.name}</span>
        </div>
        <div style={styles.headerRight}>
          {lastRefresh && <span style={styles.refreshTime}>Updated {lastRefresh.toLocaleTimeString()}</span>}
          <button style={styles.refreshBtn} onClick={fetchAll}>↻ Refresh</button>
          <button style={styles.logoutBtn} onClick={onLogout}>Sign out</button>
        </div>
      </header>

      {loading ? (
        <div style={styles.loadingWrap}>
          <span style={styles.loadingDot}>◈</span>
          <p style={{ color: '#444', marginTop: 12 }}>Fetching metrics...</p>
        </div>
      ) : (
        <main style={styles.main}>

          {/* Summary bar */}
          <div style={styles.summaryBar}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryValue} >{metrics?.count || 0}</span>
              <span style={styles.summaryLabel}>Metric samples (24h)</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={{ ...styles.summaryValue, color: passRate >= 90 ? '#00ff9d' : passRate >= 70 ? '#ffb800' : '#ff3b5c' }}>
                {passRate != null ? `${passRate}%` : '—'}
              </span>
              <span style={styles.summaryLabel}>Pipeline pass rate</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryValue}>{avgDuration ? fmtMs(avgDuration) : '—'}</span>
              <span style={styles.summaryLabel}>Avg build time</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={{ ...styles.summaryValue, color: alertColor(metrics?.latest?.alertLevel) }}>
                {metrics?.latest?.alertLevel || '—'}
              </span>
              <span style={styles.summaryLabel}>Current alert level</span>
            </div>
          </div>

          {/* Two column layout */}
          <div style={styles.grid}>

            {/* Left — Server metrics */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>
                <span style={styles.sectionDot} />
                Server health
              </h2>
              <MetricCard metric={metrics?.latest} />

              {sparkData.length > 0 && (
                <div style={styles.sparkSection}>
                  <p style={styles.sparkLabel}>CPU % — last 30 samples</p>
                  <Sparkline data={sparkData} dataKey="cpu" color="#00ff9d" />
                  <p style={{ ...styles.sparkLabel, marginTop: 12 }}>Memory % — last 30 samples</p>
                  <Sparkline data={sparkData} dataKey="mem" color="#7c6af7" />
                </div>
              )}
            </section>

            {/* Right — Pipeline */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>
                <span style={{ ...styles.sectionDot, background: '#7c6af7' }} />
                CI/CD pipeline
              </h2>

              {!pipeline?.runs?.length ? (
                <div style={styles.emptyState}>
                  <p>No pipeline runs yet.</p>
                  <p style={{ color: '#444', fontSize: 13, marginTop: 8 }}>
                    POST to <code style={styles.code}>/api/pipeline</code> with your agent key to record a run.
                  </p>
                </div>
              ) : (
                <div style={styles.pipelineList}>
                  {pipeline.runs.slice(0, 10).map(run => (
                    <PipelineRow key={run._id} run={run} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      )}
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────

export default function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('dp_token');
    const team = localStorage.getItem('dp_team');
    return token && team ? { token, team: JSON.parse(team) } : null;
  });

  const handleLogin = (team, token) => setAuth({ team, token });
  const handleLogout = () => {
    localStorage.removeItem('dp_token');
    localStorage.removeItem('dp_team');
    setAuth(null);
  };

  if (!auth) return <LoginPage onLogin={handleLogin} />;
  return <Dashboard team={auth.team} token={auth.token} onLogout={handleLogout} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  // Login
  loginWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050510', position: 'relative', overflow: 'hidden', fontFamily: "'JetBrains Mono', monospace" },
  loginBox: { position: 'relative', zIndex: 2, background: '#0a0a1a', border: '1px solid #1a1a3a', borderRadius: 12, padding: '48px 40px', width: 380, boxShadow: '0 0 80px #7c6af711' },
  loginLogo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  logoMark: { fontSize: 28, color: '#7c6af7', lineHeight: 1 },
  logoText: { fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' },
  loginSub: { color: '#333', fontSize: 13, marginBottom: 32 },
  field: { marginBottom: 18 },
  label: { display: 'block', color: '#555', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 },
  input: { width: '100%', boxSizing: 'border-box', background: '#0d0d22', border: '1px solid #1a1a3a', borderRadius: 6, padding: '10px 14px', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' },
  errorMsg: { color: '#ff3b5c', fontSize: 12, marginBottom: 16 },
  loginBtn: { width: '100%', background: 'linear-gradient(135deg, #7c6af7, #5b4de0)', border: 'none', borderRadius: 6, padding: '12px 0', color: '#fff', fontSize: 14, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em', transition: 'opacity 0.2s' },
  loginBg: { position: 'absolute', inset: 0, zIndex: 1 },
  bgDot: { position: 'absolute', width: 3, height: 3, borderRadius: '50%', background: '#7c6af744', animation: 'pulse 3s ease-in-out infinite' },

  // Dashboard shell
  dashWrap: { minHeight: '100vh', background: '#050510', color: '#ccc', fontFamily: "'JetBrains Mono', monospace" },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid #111', background: '#07071a', position: 'sticky', top: 0, zIndex: 10 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  headerTitle: { fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' },
  teamBadge: { background: '#7c6af722', color: '#7c6af7', fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid #7c6af733' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  refreshTime: { color: '#333', fontSize: 11 },
  refreshBtn: { background: 'transparent', border: '1px solid #1a1a3a', color: '#666', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' },
  logoutBtn: { background: 'transparent', border: 'none', color: '#333', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },

  // Loading
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)' },
  loadingDot: { fontSize: 32, color: '#7c6af7', animation: 'spin 2s linear infinite' },

  // Main layout
  main: { padding: '32px' },
  summaryBar: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 },
  summaryItem: { background: '#0a0a1a', border: '1px solid #111', borderRadius: 8, padding: '20px 24px' },
  summaryValue: { display: 'block', fontSize: 28, fontWeight: 700, color: '#00ff9d', letterSpacing: '-0.03em' },
  summaryLabel: { display: 'block', fontSize: 11, color: '#444', marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  section: { background: '#0a0a1a', border: '1px solid #111', borderRadius: 10, padding: 24 },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 400 },
  sectionDot: { width: 6, height: 6, borderRadius: '50%', background: '#00ff9d', display: 'inline-block' },

  // Metric card
  metricCard: { background: '#0d0d1a', border: '1px solid #1a1a3a', borderRadius: 8, padding: '20px' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  hostName: { fontSize: 15, color: '#fff', fontWeight: 600 },
  alertBadge: { fontSize: 10, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 },
  gaugeRow: { display: 'flex', justifyContent: 'space-around', marginBottom: 16 },
  gaugeWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  gaugeLabel: { fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' },
  metaRow: { display: 'flex', gap: 16, paddingTop: 12, borderTop: '1px solid #111' },
  metaItem: { fontSize: 11, color: '#444' },

  // Sparklines
  sparkSection: { marginTop: 20 },
  sparkLabel: { fontSize: 10, color: '#333', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 },

  // Pipeline
  pipelineList: { display: 'flex', flexDirection: 'column', gap: 2 },
  pipelineRow: { padding: '12px 14px', borderRadius: 6, background: '#0d0d1a', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  statusIcon: { fontSize: 16, fontWeight: 700, width: 20, textAlign: 'center', flexShrink: 0 },
  pipelineInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  repoName: { fontSize: 13, color: '#ccc', fontWeight: 600 },
  branchName: { fontSize: 11, color: '#444' },
  pipelineMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  duration: { fontSize: 12, color: '#7c6af7' },
  runDate: { fontSize: 11, color: '#333' },
  stageRow: { width: '100%', display: 'flex', gap: 4, flexWrap: 'wrap', paddingTop: 8 },
  stagePill: { fontSize: 10, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em' },

  // Empty / misc
  emptyState: { color: '#555', fontSize: 14, padding: '24px 0' },
  code: { background: '#111', color: '#7c6af7', padding: '1px 6px', borderRadius: 4, fontSize: 12 },
};

// Inject keyframes
const styleTag = document.createElement('style');
styleTag.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #050510; }
  input:focus { border-color: #7c6af7 !important; }
  @keyframes pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #050510; } ::-webkit-scrollbar-thumb { background: #1a1a3a; border-radius: 2px; }
`;
document.head.appendChild(styleTag);
