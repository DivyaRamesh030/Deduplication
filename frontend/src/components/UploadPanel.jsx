import React, { useCallback, useRef, useState, useEffect } from 'react';
import { uploadCsv, listDatasets, runProfile } from '../api';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function UploadPanel({ onProfiled }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [profiling, setProfiling] = useState(false);
  const [recentDatasets, setRecentDatasets] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    listDatasets().then(setRecentDatasets).catch(() => {});
  }, []);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError(null);
    setMetadata(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError(`"${file.name}" is not a .csv file. Only CSV uploads are accepted.`);
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadCsv(file, setProgress);
      setMetadata(result);
      setRecentDatasets((prev) => [result, ...prev.filter((d) => d.dataset_id !== result.dataset_id)]);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      handleFile(file);
    },
    [handleFile]
  );

  const startProfiling = async (datasetId) => {
    setProfiling(true);
    setError(null);
    try {
      const report = await runProfile(datasetId);
      onProfiled(report);
    } catch (e) {
      setError(e.message);
      setProfiling(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.heroText}>
        <div style={styles.eyebrow}>MODULE 2 · CSV UPLOAD &amp; INGESTION</div>
        <h1 style={styles.h1}>Bring in your master data.</h1>
        <p style={styles.sub}>
          Upload a raw CSV extract — customer, party, or account records. We validate structure,
          store the original file untouched as your source of truth, and generate a dataset ID
          you can profile and, later, de-duplicate against.
        </p>
      </div>

      <div style={styles.grid}>
        <div
          style={{ ...styles.dropzone, ...(dragging ? styles.dropzoneActive : {}) }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {uploading ? (
            <div style={styles.uploadingState}>
              <div style={styles.spinner} />
              <div style={styles.uploadingLabel}>Uploading &amp; validating… {progress}%</div>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <div style={styles.dropIcon}>⇪</div>
              <div style={styles.dropTitle}>Drop your CSV here</div>
              <div style={styles.dropSub}>or click to browse · .csv only</div>
            </>
          )}
        </div>

        <div style={styles.checklistCard}>
          <div style={styles.checklistTitle}>Validated on upload</div>
          {[
            'Correct .csv extension',
            'File is not empty',
            'Headers present, no empty column names',
            'No duplicate column names',
            'At least one data row',
            'Readable text encoding',
          ].map((item) => (
            <div style={styles.checklistItem} key={item}>
              <span style={styles.checkDot} />
              {item}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <strong>Upload rejected.</strong>&nbsp;{error}
        </div>
      )}

      {metadata && (
        <div style={styles.metadataCard}>
          <div style={styles.metaHeader}>
            <div>
              <div style={styles.metaFilename}>{metadata.filename}</div>
              <div style={styles.metaId} className="mono">dataset_id: {metadata.dataset_id}</div>
            </div>
            <span style={styles.statusBadge}>{metadata.status}</span>
          </div>
          <div style={styles.metaStats}>
            <Stat label="Rows" value={metadata.rows.toLocaleString()} />
            <Stat label="Columns" value={metadata.columns} />
            <Stat label="File size" value={formatBytes(metadata.file_size_bytes)} />
            <Stat label="Uploaded" value={timeAgo(metadata.upload_timestamp)} />
          </div>
          <div style={styles.colChipRow} className="scrollbar-thin">
            {metadata.column_names.slice(0, 14).map((c) => (
              <span style={styles.colChip} key={c}>{c}</span>
            ))}
            {metadata.column_names.length > 14 && (
              <span style={styles.colChip}>+{metadata.column_names.length - 14} more</span>
            )}
          </div>
          <button
            style={styles.profileBtn}
            onClick={() => startProfiling(metadata.dataset_id)}
            disabled={profiling}
          >
            {profiling ? 'Running profiling checks…' : 'Run Data Profiling →'}
          </button>
        </div>
      )}

      {recentDatasets.length > 0 && (
        <div style={styles.recentSection}>
          <div style={styles.recentTitle}>Recent datasets</div>
          <div style={styles.recentList}>
            {recentDatasets.slice(0, 6).map((d) => (
              <div key={d.dataset_id} style={styles.recentRow}>
                <div style={styles.recentInfo}>
                  <div style={styles.recentName}>{d.filename}</div>
                  <div style={styles.recentMeta} className="mono">
                    {d.rows?.toLocaleString()} rows · {d.columns} cols · {timeAgo(d.upload_timestamp)}
                  </div>
                </div>
                <button style={styles.recentBtn} onClick={() => startProfiling(d.dataset_id)} disabled={profiling}>
                  Profile →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.statBox}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 980,
    margin: '0 auto',
    padding: '56px 28px 80px',
    animation: 'fade-up 0.4s ease',
  },
  heroText: { marginBottom: 36 },
  eyebrow: {
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: 1.2,
    color: 'var(--violet)',
    marginBottom: 10,
  },
  h1: {
    fontSize: 36,
    fontWeight: 700,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  sub: {
    fontSize: 15.5,
    lineHeight: 1.6,
    color: 'var(--text-secondary)',
    maxWidth: 640,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 1fr',
    gap: 20,
    marginBottom: 24,
  },
  dropzone: {
    background: 'var(--white)',
    border: '2px dashed var(--border)',
    borderRadius: 'var(--radius-lg)',
    minHeight: 230,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
  },
  dropzoneActive: {
    borderColor: 'var(--blue-light)',
    background: 'var(--blue-light-soft)',
  },
  dropIcon: {
    fontSize: 30,
    color: 'var(--violet)',
    marginBottom: 10,
    transform: 'rotate(180deg)',
  },
  dropTitle: {
    fontSize: 17,
    fontWeight: 600,
    marginBottom: 4,
  },
  dropSub: {
    fontSize: 13,
    color: 'var(--text-muted)',
  },
  uploadingState: {
    width: '70%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  spinner: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    border: '3px solid var(--surface-alt)',
    borderTopColor: 'var(--violet)',
    animation: 'spin 0.8s linear infinite',
  },
  uploadingLabel: {
    fontSize: 13.5,
    color: 'var(--text-secondary)',
    fontWeight: 600,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 4,
    background: 'var(--surface-alt)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--gradient-accent)',
    transition: 'width 0.15s ease',
  },
  checklistCard: {
    background: 'var(--blue-dark)',
    borderRadius: 'var(--radius-lg)',
    padding: '22px 22px',
    color: '#fff',
  },
  checklistTitle: {
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.9)',
    padding: '7px 0',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  checkDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--blue-light)',
    flexShrink: 0,
  },
  errorBanner: {
    background: '#fdecee',
    border: '1px solid #f3c3c8',
    color: '#a3303c',
    borderRadius: 'var(--radius-md)',
    padding: '14px 18px',
    fontSize: 13.5,
    marginBottom: 24,
  },
  metadataCard: {
    background: 'var(--white)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 24,
    boxShadow: 'var(--shadow-md)',
    marginBottom: 32,
    animation: 'fade-up 0.35s ease',
  },
  metaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  metaFilename: { fontSize: 17, fontWeight: 700 },
  metaId: { fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 },
  statusBadge: {
    background: 'var(--violet-soft)',
    color: 'var(--violet)',
    fontSize: 11.5,
    fontWeight: 700,
    padding: '5px 12px',
    borderRadius: 999,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginBottom: 18,
  },
  statBox: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
  },
  statValue: { fontSize: 19, fontWeight: 700, fontFamily: 'var(--font-mono)' },
  statLabel: { fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 },
  colChipRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  colChip: {
    fontSize: 11.5,
    background: 'var(--blue-light-soft)',
    color: 'var(--blue-dark-2)',
    padding: '4px 9px',
    borderRadius: 6,
    fontFamily: 'var(--font-mono)',
  },
  profileBtn: {
    width: '100%',
    padding: '13px 0',
    borderRadius: 10,
    border: 'none',
    background: 'var(--gradient-primary)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 14.5,
    boxShadow: 'var(--shadow-sm)',
  },
  recentSection: { marginTop: 8 },
  recentTitle: {
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: 0.4,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  recentList: { display: 'flex', flexDirection: 'column', gap: 8 },
  recentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--white)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '12px 16px',
  },
  recentName: { fontSize: 13.5, fontWeight: 600 },
  recentMeta: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },
  recentBtn: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 12.5,
    fontWeight: 600,
    color: 'var(--blue-dark-2)',
  },
};
