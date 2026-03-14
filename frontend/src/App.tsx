/**
 * App.tsx — Root orchestrator.
 *
 * Responsibilities:
 *  - Global state (curStock, viewMode, toast)
 *  - Cross-cutting concerns: loading gate, toast, routing between views
 */
import React, { useState, useCallback, useEffect } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { Topbar } from './components/Topbar';
import { TerminalBoard } from './components/TerminalBoard';
import { IntelligenceBoard } from './components/IntelligenceBoard';
import { Toast } from './components/Toast';
import { stockService } from './services/stock.service';
import './index.css';

type ViewMode = 'TERMINAL' | 'INTELLIGENCE';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [curStock, setCurStock] = useState('RELIANCE.NS');
  const [stockData, setStockData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('TERMINAL');
  const [toastMsg, setToastMsg] = useState('');

  // Initial load
  useEffect(() => {
    handleStockChange(curStock);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  }, []);

  const handleLoadComplete = useCallback(() => {
    setLoading(false);
  }, []);

  const handleStockChange = useCallback((ticker: string) => {
    setLoading(true);
    setCurStock(ticker);
    stockService.getStockData(ticker)
      .then((data) => {
        setStockData(data);
      })
      .catch(() => {
        showToast('✘ Connection Error: Failed to reach LOONDX Backend');
      });
  }, [showToast]);

  const handleViewChange = useCallback((mode: ViewMode) => {
    if (mode === viewMode) return;
    setLoading(true);
    setViewMode(mode);
  }, [viewMode]);

  return (
    <>
      <div
        id="app"
        className="h-screen flex flex-col overflow-hidden bg-brand-bg relative"
      >
        {loading && (
          <LoadingScreen key={`${curStock}-${viewMode}`} curStock={curStock} onComplete={handleLoadComplete} />
        )}

        <Topbar
          curStock={curStock}
          setCurStock={handleStockChange}
          viewMode={viewMode}
          setViewMode={handleViewChange}
          showToast={showToast}
        />

        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {viewMode === 'TERMINAL' ? (
            <TerminalBoard curStock={curStock} stockData={stockData} loading={loading} />
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
