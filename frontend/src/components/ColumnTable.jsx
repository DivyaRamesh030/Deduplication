import React, { useMemo, useState } from 'react';

const TYPE_COLORS = {
  integer: 'var(--type-integer)',
  float: 'var(--type-float)',
  string: 'var(--type-string)',
  date: 'var(--type-date)',
  boolean: 'var(--type-boolean)',
  unknown: 'var(--type-unknown)',
};

export default function ColumnTable({ columns }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    let rows = columns.filter((c) => c.column_name.toLowerCase().includes(query.toLowerCase()));
    if (filter === 'id') rows = rows.filter((c) => c.is_potential_id);
    if (filter === 'constant') rows = rows.filter((c) => c.is_constant || c.is_near_constant);
    if (filter === 'nulls') rows = rows.filter((c) => c.null_count > 0);
    if (filter === 'format') rows = rows.filter((c) => c.format_validation);
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const va = a[sortKey] ?? 0;
        const vb = b[sortKey] ?? 0;
        return sortDir === 'asc' ? va - vb : vb - va;
      });
    }
    return rows;
  }, [columns, query, filter, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.toolbar}>
        <input
          style={styles.search}
          placeholder="Search columns…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div style={styles.filterRow}>
          {[
            ['all', 'All'],
            ['id', 'Potential IDs'],
            ['constant', 'Constant / near-constant'],
            ['nulls', 'Has nulls'],
            ['format', 'Format-checked'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{ ...styles.filterChip, ...(filter === key ? styles.filterChipActive : {}) }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.tableScroll} className="scrollbar-thin">
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Column</th>
              <th style={styles.th}>Type</th>
              <th style={styles.thSortable} onClick={() => toggleSort('null_percentage')}>Null %</th>
              <th style={styles.thSortable} onClick={() => toggleSort('uniqueness_percentage')}>Unique %</th>
              <th style={styles.thSortable} onClick={() => toggleSort('distinct_count')}>Distinct</th>
              <th style={styles.th}>Flags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((col) => (
              <React.Fragment key={col.column_name}>
                <tr
                  style={styles.tr}
                  onClick={() => setExpanded(expanded === col.column_name ? null : col.column_name)}
                >
                  <td style={{ ...styles.td, fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
                    {col.column_name}
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.typeTag, background: TYPE_COLORS[col.data_type] || TYPE_COLORS.unknown }}>
                      {col.data_type}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <MiniBar value={col.null_percentage} color="var(--error)" />
                  </td>
                  <td style={styles.td}>
                    <MiniBar value={col.uniqueness_percentage} color="var(--blue-light)" />
                  </td>
                  <td style={styles.td}>{col.distinct_count.toLocaleString()}</td>
                  <td style={styles.td}>
                    <div style={styles.flagRow}>
                      {col.is_potential_id && <Flag label="ID" color="var(--violet)" />}
                      {col.is_constant && <Flag label="Constant" color="var(--warning)" />}
                      {col.is_near_constant && !col.is_constant && <Flag label="Near-constant" color="var(--warning)" />}
                      {col.format_validation && <Flag label={col.format_validation.format_type} color="var(--blue-dark-2)" />}
                    </div>
                  </td>
                </tr>
                {expanded === col.column_name && (
                  <tr>
                    <td colSpan={6} style={styles.expandCell}>
                      <ColumnDetail col={col} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={styles.emptyRow}>No columns match this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniBar({ value, color }) {
  return (
    <div style={styles.miniBarWrap}>
      <div style={styles.miniBarTrack}>
        <div style={{ ...styles.miniBarFill, width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
      <span style={styles.miniBarLabel}>{value?.toFixed?.(1) ?? value}%</span>
    </div>
  );
}

function Flag({ label, color }) {
  return (
    <span style={{ ...styles.flag, color, borderColor: color }}>
      {label}
    </span>
  );
}

function ColumnDetail({ col }) {
  return (
    <div style={styles.detailGrid}>
      <div>
        <DetailRow label="Total count" value={col.total_count.toLocaleString()} />
        <DetailRow label="Null count" value={col.null_count.toLocaleString()} />
        <DetailRow label="Empty strings" value={col.empty_string_count.toLocaleString()} />
        <DetailRow label="Duplicate values" value={col.duplicate_count.toLocaleString()} />
        {col.id_detection_reason && <DetailRow label="ID reason" value={col.id_detection_reason} />}
      </div>

      {col.statistics && (
        <div>
          <div style={styles.detailHeading}>Numeric statistics</div>
          <DetailRow label="Min / Max" value={`${col.statistics.min} – ${col.statistics.max}`} />
          <DetailRow label="Mean / Median" value={`${col.statistics.mean} / ${col.statistics.median}`} />
          <DetailRow label="Std dev" value={col.statistics.standard_deviation} />
          <DetailRow label="P25 / P75" value={`${col.statistics['25th_percentile']} / ${col.statistics['75th_percentile']}`} />
          <DetailRow label="Outliers (IQR)" value={`${col.statistics.outlier_count} (${col.statistics.outlier_percentage}%)`} />
        </div>
      )}

      {col.categorical_profile && (
        <div>
          <div style={styles.detailHeading}>Top values</div>
          {col.categorical_profile.top_values.slice(0, 6).map((tv) => (
            <div key={tv.value} style={styles.topValueRow}>
              <span style={styles.topValueLabel} title={tv.value}>{tv.value || '(blank)'}</span>
              <span style={styles.topValueCount}>{tv.count.toLocaleString()} ({tv.percentage}%)</span>
            </div>
          ))}
        </div>
      )}

      {col.top_duplicate_values?.length > 0 && (
        <div>
          <div style={styles.detailHeading}>Duplicate values</div>
          {col.top_duplicate_values.slice(0, 6).map((dv) => (
            <div key={dv.value} style={styles.topValueRow}>
              <span style={styles.topValueLabel} title={dv.value}>{dv.value}</span>
              <span style={styles.topValueCount}>×{dv.occurrences}</span>
            </div>
          ))}
        </div>
      )}

      {col.format_validation && (
        <div>
          <div style={styles.detailHeading}>Format check — {col.format_validation.format_type}</div>
          <DetailRow label="Valid" value={col.format_validation.valid_count.toLocaleString()} />
          <DetailRow label="Invalid" value={`${col.format_validation.invalid_count.toLocaleString()} (${col.format_validation.invalid_percentage}%)`} />
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

const styles = {
  wrap: {
    background: 'var(--white)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
    gap: 12,
  },
  search: {
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 13,
    width: 220,
    outline: 'none',
  },
  filterRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  filterChip: {
    fontSize: 12,
    fontWeight: 600,
    padding: '7px 12px',
    borderRadius: 999,
    border: '1px solid var(--border)',
    background: 'var(--white)',
    color: 'var(--text-secondary)',
  },
  filterChipActive: {
    background: 'var(--violet-soft)',
    color: 'var(--violet)',
    borderColor: 'var(--violet)',
  },
  tableScroll: { overflowX: 'auto', maxHeight: 560, overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left',
    padding: '11px 16px',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'var(--text-muted)',
    background: 'var(--surface)',
    position: 'sticky',
    top: 0,
  },
  thSortable: {
    textAlign: 'left',
    padding: '11px 16px',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'var(--text-muted)',
    background: 'var(--surface)',
    cursor: 'pointer',
    position: 'sticky',
    top: 0,
  },
  tr: {
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
  },
  td: { padding: '10px 16px', verticalAlign: 'middle' },
  typeTag: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 5,
    textTransform: 'uppercase',
  },
  miniBarWrap: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 110 },
  miniBarTrack: { width: 60, height: 5, background: 'var(--surface-alt)', borderRadius: 3, overflow: 'hidden' },
  miniBarFill: { height: '100%' },
  miniBarLabel: { fontSize: 11.5, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' },
  flagRow: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  flag: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 5,
    border: '1px solid',
    textTransform: 'uppercase',
  },
  expandCell: { background: 'var(--surface)', padding: '18px 24px' },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 22,
  },
  detailHeading: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  detailRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5 },
  detailLabel: { color: 'var(--text-muted)' },
  detailValue: { fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 },
  topValueRow: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '3px 0', fontSize: 12 },
  topValueLabel: { color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 },
  topValueCount: { fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0 },
  emptyRow: { padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 },
};
