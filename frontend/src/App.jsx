import React, { useState } from 'react';
import Header from './components/Header';
import UploadPanel from './components/UploadPanel';
import ProfileDashboard from './components/ProfileDashboard';

export default function App() {
  const [step, setStep] = useState('upload'); // 'upload' | 'profile'
  const [report, setReport] = useState(null);

  const handleProfiled = (profileReport) => {
    setReport(profileReport);
    setStep('profile');
  };

  const handleReset = () => {
    setReport(null);
    setStep('upload');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header step={step} onReset={handleReset} datasetName={report?.filename} />
      <main style={{ flex: 1 }}>
        {step === 'upload' && <UploadPanel onProfiled={handleProfiled} />}
        {step === 'profile' && report && <ProfileDashboard report={report} />}
      </main>
      <footer style={{ textAlign: 'center', padding: '20px', fontSize: 11.5, color: 'var(--text-muted)' }}>
        ChainSys MDM Platform · Module 2 (Ingestion) &amp; Module 3 (Profiling)
      </footer>
    </div>
  );
}
