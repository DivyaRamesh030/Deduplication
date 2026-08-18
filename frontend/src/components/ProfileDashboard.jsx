import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import ColumnTable from './ColumnTable';

const TYPE_COLORS = {
  integer: '#4fa3e3',
  float: '#3b7fd1',
  string: '#6e4fe0',
  date: '#8f6ff0',
  boolean: '#2bb3a3',
  unknown: '#98a4ba',
};

export default function ProfileDashboard({ report }) {
  const { summary, columns, filename, dataset_id, created_at } = report;

  const completenessData = useMemo(
    () =>
      [...columns]
        .sort((a, b) => b.null_percentage - a.null_percentage)
        .slice(0, 12)
        .map((c) => ({ name: c.column_name, value: c.null_percentage })),
    [columns]
  );

  const uniquenessData = useMemo(
    () =>
      [...columns]
        .sort((a, b) => b.uniqueness_percentage - a.uniqueness_percentage)
        .slice(0, 12)
        .map((c) => ({ name: c.column_name, value: c.uniqueness_percentage })),
    [columns]
  );

  const cardinalityData = useMemo(
    () =>
      [...columns]
        .sort((a, b) => b.distinct_count - a.distinct_count)
        .slice(0, 12)
        .map((c) => ({ name: c.column_name, value: c.distinct_count })),
    [columns]
  );

  const typeDistData = useMemo(
    () =>
      Object.entries(summary.data_type_distribution).map(([type, count]) => ({
        name: type,
        value: count,
      })),
    [summary]
  );

  const formatData = [
    { name: 'Invalid emails', value: summary.invalid_emails },
    { name: 'Invalid phones', value: summary.invalid_phones },
    { name: 'Invalid dates', value: summary.invalid_dates },
  ].filter((d) => d.value > 0);

  return (
    <div style={styles.page}>
      <div style={styles.headRow}>
        <div>
          <div style={styles.eyebrow}>MODULE 3 · DATA PROFILING REPORT</div>
          <h1 style={styles.h1}>{filename}</h1>
          <div style={styles.metaLine} className="mono">
            {dataset_id} · generated {new Date(created_at).toLocaleString()}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={styles.kpiRow}>
        <KpiCard label="Rows" value={summary.rows.toLocaleString()} />
        <KpiCard label="Columns" value={summary.columns} />
        <KpiCard label="Exact duplicate rows" value={summary.exact_duplicate_rows.toLocaleString()} accent={summary.exact_duplicate_rows > 0 ? 'var(--error)' : undefined} />
        <KpiCard label="Columns with nulls" value={summary.columns_with_nulls} />
        <KpiCard label="Potential ID columns" value={summary.potential_id_columns.length} accent="var(--violet)" />
        <KpiCard label="Constant columns" value={summary.constant_columns.length} accent="var(--warning)" />
      </div>

      {/* Quality scores */}
      <div style={styles.sectionTitle}>Data quality scores</div>
      <div style={styles.scoreRow}>
        <ScoreCard label="Completeness" value={summary.quality_scores.completeness_score} />
        <ScoreCard label="Validity" value={summary.quality_scores.validity_score} note={summary.quality_scores.validity_score === null ? 'No format-checked columns' : null} />
        <ScoreCard label="Uniqueness" value={summary.quality_scores.uniqueness_score} />
        <ScoreCard label="Consistency" value={summary.quality_scores.consistency_score} />
      </div>

      {/* Charts row 1 */}
      <div style={styles.chartGrid2}>
        <ChartCard title="Data type distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={typeDistData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {typeDistData.map((entry) => (
                  <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || TYPE_COLORS.unknown} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Format validation summary" subtitle={formatData.length === 0 ? 'No invalid formats detected' : null}>
          {formatData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={formatData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2fa" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--error, #d9505c)" radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.emptyChart}>✓ Every checked email, phone and date field is valid.</div>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div style={styles.chartGrid2}>
        <ChartCard title="Highest null % by column" subtitle="Top 12">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={completenessData} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2fa" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="value" fill="#6e4fe0" radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Highest uniqueness % by column" subtitle="Top 12">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={uniquenessData} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2fa" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="value" fill="#4fa3e3" radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div style={styles.chartGrid1}>
        <ChartCard title="Cardinality — distinct values by column" subtitle="Top 12">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cardinalityData} margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2fa" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0b2a4a" radius={[6, 6, 0, 0]} barSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Flags */}
      <div style={styles.flagsGrid}>
        <FlagCard title="Potential ID columns" items={summary.potential_id_columns} color="var(--violet)" empty="None detected" />
        <FlagCard title="Constant columns" items={summary.constant_columns} color="var(--warning)" empty="None" />
        <FlagCard title="Near-constant columns" items={summary.near_constant_columns} color="var(--warning)" empty="None" />
      </div>

      {/* Column table */}
      <div style={styles.sectionTitle}>Column-level profile</div>
      <ColumnTable columns={columns} />
    </div>
  );
}

function KpiCard({ label, value, accent }) {
  return (
    <div style={styles.kpiCard}>
      <div style={{ ...styles.kpiValue, color: accent || 'var(--text-primary)' }}>{value}</div>
      <div style={styles.kpiLabel}>{label}</div>
    </div>
  );
}

function ScoreCard({ label, value, note }) {
  const display = value === null || value === undefined ? '—' : `${value}%`;
  const color = value === null ? 'var(--text-muted)' : value >= 90 ? 'var(--success)' : value >= 70 ? 'var(--warning)' : 'var(--error)';
  return (
    <div style={styles.scoreCard}>
      <div style={styles.scoreRing}>
        <svg viewBox="0 0 64 64" width="64" height="64">
          <circle cx="32" cy="32" r="27" fill="none" stroke="#eef2fa" strokeWidth="7" />
          {value !== null && value !== undefined && (
            <circle
              cx="32" cy="32" r="27" fill="none" stroke={color} strokeWidth="7"
              strokeDasharray={`${(value / 100) * 169.6} 169.6`}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
            />
          )}
        </svg>
        <div style={styles.scoreRingLabel}>{display}</div>
      </div>
      <div style={styles.scoreLabel}>{label}</div>
      {note && <div style={styles.scoreNote}>{note}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartCardHead}>
        <div style={styles.chartCardTitle}>{title}</div>
        {subtitle && <div style={styles.chartCardSub}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function FlagCard({ title, items, color, empty }) {
  return (
    <div style={styles.flagCard}>
      <div style={{ ...styles.flagCardTitle, color }}>{title}</div>
      {items.length === 0 ? (
        <div style={styles.flagEmpty}>{empty}</div>
      ) : (
        <div style={styles.flagChips}>
          {items.map((name) => (
            <span key={name} style={{ ...styles.flagChip, borderColor: color, color }}>{name}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 1320, margin: '0 auto', padding: '40px 28px 100px', animation: 'fade-up 0.4s ease' },
  headRow: { marginBottom: 28 },
  eyebrow: { fontSize: 11.5, fontWeight: 700, letterSpacing: 1.2, color: 'var(--violet)', marginBottom: 8 },
  h1: { fontSize: 26, fontWeight: 700, marginBottom: 6 },
  metaLine: { fontSize: 11.5, color: 'var(--text-muted)' },

  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 32 },
  kpiCard: {
    background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
    padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
  },
  kpiValue: { fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)' },
  kpiLabel: { fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 },

  sectionTitle: { fontSize: 13, fontWeight: 700, letterSpacing: 0.4, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: '8px 0 14px' },

  scoreRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 },
  scoreCard: {
    background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
    padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  scoreRing: { position: 'relative', width: 64, height: 64 },
  scoreRingLabel: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
  },
  scoreLabel: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' },
  scoreNote: { fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' },

  chartGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  chartGrid1: { display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 32 },
  chartCard: {
    background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
    padding: '20px 20px 8px',
  },
  chartCardHead: { marginBottom: 8 },
  chartCardTitle: { fontSize: 13.5, fontWeight: 700 },
  chartCardSub: { fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 },
  emptyChart: { padding: '70px 10px', textAlign: 'center', color: 'var(--success)', fontSize: 13, fontWeight: 600 },

  flagsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36 },
  flagCard: { background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18 },
  flagCardTitle: { fontSize: 12.5, fontWeight: 700, marginBottom: 10 },
  flagEmpty: { fontSize: 12, color: 'var(--text-muted)' },
  flagChips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  flagChip: { fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, border: '1px solid', fontFamily: 'var(--font-mono)' },
};
