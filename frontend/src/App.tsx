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
import { WelcomeScreen } from './components/WelcomeScreen';
import { Toast } from './components/Toast';
import { stockService } from './services/stock.service';
import './index.css';

type ViewMode = 'TERMINAL' | 'INTELLIGENCE';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  // null = no stock selected → show WelcomeScreen
  const [curStock, setCurStock] = useState<string | null>(
    localStorage.getItem('loondx_last_stock') || null
  );
  const [stockData, setStockData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('TERMINAL');
  const [toastMsg, setToastMsg] = useState('');

  // Fetch on first load if a stock was persisted
  useEffect(() => {
    if (curStock) handleStockChange(curStock);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  }, []);

  const handleLoadComplete = useCallback(() => {
    setLoading(false);
  }, []);

  const handleStockChange = useCallback((ticker: string) => {
    if (!ticker) return;
    setLoading(true);
    setCurStock(ticker);
    localStorage.setItem('loondx_last_stock', ticker); // persist for refresh
    
    stockService.getStockData(ticker)
      .then((data) => {
        // If the backend resolved a canonical ticker (e.g. INFY for INFOSYS), sync it
        if (data?.stock?.ticker && data.stock.ticker !== ticker) {
          setCurStock(data.stock.ticker);
          localStorage.setItem('loondx_last_stock', data.stock.ticker);
        }
        setStockData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Stock change error:', err);
        showToast(`✘ Engine Error: ${err.message || 'Failed to reach LOONDX Intelligence'}`);
        setLoading(false);
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
        {loading && curStock && (
          <LoadingScreen key={`${curStock}-${viewMode}`} curStock={curStock} onComplete={handleLoadComplete} />
        )}

        <Topbar
          curStock={curStock ?? ''}
          setCurStock={handleStockChange}
          viewMode={viewMode}
          setViewMode={handleViewChange}
          showToast={showToast}
        />

        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {!curStock ? (
            <WelcomeScreen onSelect={handleStockChange} />
          ) : viewMode === 'TERMINAL' ? (
            <TerminalBoard key={curStock} curStock={curStock} stockData={stockData} loading={loading} />
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
