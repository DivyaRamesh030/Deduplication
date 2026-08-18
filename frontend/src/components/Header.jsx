import React from 'react';

export default function Header({ step, onReset, datasetName }) {
  return (
    <header style={styles.wrap}>
      <div style={styles.inner}>
        <div style={styles.brand}>
          <div style={styles.mark}>
            <span style={styles.markDot} />
          </div>
          <div>
            <div style={styles.brandTitle}>ChainSys MDM</div>
            <div style={styles.brandSub}>Data Quality &amp; Golden Record Platform</div>
          </div>
        </div>

        <div style={styles.steps}>
          <StepPill label="1. Ingest" active={step === 'upload'} done={step !== 'upload'} />
          <div style={styles.connector} />
          <StepPill label="2. Profile" active={step === 'profile'} done={false} />
        </div>

        <div style={styles.right}>
          {datasetName && (
            <div style={styles.datasetChip} title={datasetName}>
              <span style={styles.chipLabel}>Dataset</span>
              <span style={styles.chipName}>{datasetName}</span>
            </div>
          )}
          {step === 'profile' && (
            <button style={styles.newBtn} onClick={onReset}>
              + New dataset
            </button>
          )}
        </div>
      </div>
      <div style={styles.accentBar} />
    </header>
  );
}

function StepPill({ label, active, done }) {
  return (
    <div
      style={{
        ...styles.pill,
        ...(active ? styles.pillActive : {}),
        ...(done ? styles.pillDone : {}),
      }}
    >
      {label}
    </div>
  );
}

const styles = {
  wrap: {
    background: 'var(--gradient-primary)',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  inner: {
    maxWidth: 1320,
    margin: '0 auto',
    padding: '16px 28px',
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: 'var(--gradient-accent)',
  },
  brandTitle: {
    color: '#fff',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11.5,
    marginTop: 1,
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  connector: {
    width: 24,
    height: 1,
    background: 'rgba(255,255,255,0.25)',
  },
  pill: {
    fontSize: 12.5,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.55)',
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid transparent',
  },
  pillActive: {
    color: '#fff',
    background: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  pillDone: {
    color: 'rgba(255,255,255,0.85)',
  },
  right: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  datasetChip: {
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: '6px 12px',
    maxWidth: 220,
  },
  chipLabel: {
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.55)',
  },
  chipName: {
    fontSize: 12.5,
    color: '#fff',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  newBtn: {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    fontSize: 12.5,
    fontWeight: 600,
    padding: '8px 14px',
    borderRadius: 8,
  },
  accentBar: {
    height: 3,
    background: 'linear-gradient(90deg, var(--blue-light), var(--violet), var(--blue-light))',
    backgroundSize: '200% 100%',
    animation: 'pulse-stream 6s linear infinite',
  },
};
