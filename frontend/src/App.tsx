/**
 * App.tsx — Root orchestrator.
 *
 * Responsibilities:
 *  - Global state (curStock, viewMode, toast)
 *  - Cross-cutting concerns: loading gate, toast, routing between views
 *
 * Each view is a self-contained component. Business logic and charting
 * live inside their own files — this file stays thin on purpose.
 */
import React, { useState, useCallback } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { Topbar } from './components/Topbar';
import { TerminalBoard } from './components/TerminalBoard';
import { IntelligenceBoard } from './components/IntelligenceBoard';
import { Toast } from './components/Toast';
import './index.css';

type ViewMode = 'TERMINAL' | 'INTELLIGENCE';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [curStock, setCurStock] = useState('AAPL');
  const [viewMode, setViewMode] = useState<ViewMode>('TERMINAL');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  }, []);

  const handleLoadComplete = useCallback(() => {
    setLoading(false);
  }, []);

  const handleStockChange = useCallback((ticker: string) => {
    setLoading(true);   // trigger loader between stocks
    setCurStock(ticker);
  }, []);

  return (
    <>
      {loading && (
        <LoadingScreen curStock={curStock} onComplete={handleLoadComplete} />
      )}

      <div
        id="app"
        className={`h-screen flex flex-col transition-opacity duration-500 overflow-hidden ${loading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <Topbar
          curStock={curStock}
          setCurStock={handleStockChange}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showToast={showToast}
        />

        <main className="flex-1 min-h-0 overflow-hidden">
          {viewMode === 'TERMINAL' ? (
            <TerminalBoard curStock={curStock} loading={loading} />
          ) : (
            <IntelligenceBoard curStock={curStock} />
          )}
        </main>
      </div>

      <Toast message={toastMsg} />
    </>
  );
};

export default App;
