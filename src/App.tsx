import { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, History, MessageSquare, RefreshCcw, Plus } from 'lucide-react';
import { TradeForm } from './components/TradeForm';
import { TradeList } from './components/TradeList';
import { PositionSummary } from './components/PositionSummary';
import { AIAssistant } from './components/AIAssistant';
import { HeaderSearch } from './components/HeaderSearch';
import { useTrades } from './hooks/useTrades';
import type { Trade } from './types';
import { useStockQuote } from './hooks/useStockQuote';
import { calculatePositions, calculateTotalProfitLoss, isMarketOpen } from './utils/calculations';
import './App.css';

interface FilterState {
  text: string;
  tags: string[];
}

function App() {
  const { 
    trades, 
    allTags, 
    pinnedTags, 
    addTrade, 
    updateTrade, 
    deleteTrade, 
    batchDeleteTrades, 
    importTrades,
    togglePinTag 
  } = useTrades();
  const { quotes, loading, fetchQuotes, setManualPrice } = useStockQuote();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'trades' | 'ai'>('positions');
  const [pendingAIAnalysis, setPendingAIAnalysis] = useState<{
    positions: any[];
    totals: any;
  } | null>(null);
  
  // 统一全局筛选状态，跨页面同步
  const [globalFilter, setGlobalFilter] = useState<FilterState>({ text: '', tags: [] });

  // 首次进入页面时，默认显示星标标签
  useEffect(() => {
    if (pinnedTags.length > 0 && globalFilter.tags.length === 0 && !globalFilter.text) {
      setGlobalFilter(prev => ({ ...prev, tags: pinnedTags }));
    }
  }, []); // 仅在初次加载时执行

  // 1. 提取所有涉及的股票代码和名称，用于搜索建议
  const allStocks = useMemo(() => {
    const stockMap = new Map<string, string>();
    trades.forEach(t => {
      if (!stockMap.has(t.stockCode)) {
        stockMap.set(t.stockCode, t.stockName);
      }
    });
    return Array.from(stockMap.entries()).map(([code, name]) => ({ code, name }));
  }, [trades]);

  // 2. 提取所有涉及的股票代码，用于获取行情
  const allStockCodes = useMemo(() => {
    return allStocks.map(s => s.code);
  }, [allStocks]);

  // 2. 将 quotes Map 转换为价格 Map
  const currentPrices = useMemo(() => {
    const prices = new Map<string, number>();
    quotes.forEach((quote, code) => {
      prices.set(code, quote.price);
    });
    return prices;
  }, [quotes]);

  // 3. 核心筛选逻辑：使用全局统一的 globalFilter
  const currentFilteredTrades = useMemo(() => {
    const { text, tags } = globalFilter;
    if (!text && tags.length === 0) return trades;
    const lowerText = text.toLowerCase();
    return trades.filter(t => {
      const matchesTags = tags.length === 0 || tags.every(tag => t.tags?.includes(tag));
      const matchesText = !text || t.stockCode.toLowerCase().includes(lowerText) || t.stockName.toLowerCase().includes(lowerText);
      return matchesTags && matchesText;
    });
  }, [trades, globalFilter]);

  // 4. 根据过滤后的交易计算显示的持仓（持仓汇总页使用）
  const displayPositions = useMemo(
    () => calculatePositions(currentFilteredTrades, currentPrices),
    [currentFilteredTrades, currentPrices]
  );

  // 5. 计算当前过滤视图的总计
  const displayTotals = useMemo(
    () => calculateTotalProfitLoss(displayPositions),
    [displayPositions]
  );

  // 自动加载行情
  useEffect(() => {
    if (allStockCodes.length > 0) {
      fetchQuotes(allStockCodes).catch(() => {});
    }
  }, [allStockCodes]);

  // 轮询行情逻辑
  useEffect(() => {
    let intervalId: number | undefined;
    const poll = () => {
      if (activeTab === 'positions' && allStockCodes.length > 0 && isMarketOpen()) {
        fetchQuotes(allStockCodes, true).catch(() => {});
      }
    };
    if (activeTab === 'positions') {
      intervalId = window.setInterval(poll, 2000);
    }
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [activeTab, allStockCodes, fetchQuotes]);

  const handleRefreshQuotes = () => {
    fetchQuotes(allStockCodes);
  };

  const handleManualPriceUpdate = (code: string, price: number) => {
    const position = displayPositions.find(p => p.stockCode === code);
    setManualPrice(code, price, position?.stockName);
  };

  const handleAddTrade = (trade: Trade) => {
    if (editingTrade) {
      updateTrade(editingTrade.id, trade);
    } else {
      addTrade(trade);
    }
    setIsModalOpen(false);
    setEditingTrade(null);
  };

  const handleEditClick = (trade: Trade) => {
    setEditingTrade(trade);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTrade(null);
  };

  const handleViewTrades = (code: string) => {
    setGlobalFilter({ text: code, tags: [] });
    setActiveTab('trades');
  };

  const handleAIAnalyzeSelected = (selectedIds: string[]) => {
    const selectedTrades = trades.filter(t => selectedIds.includes(t.id));
    const positions = calculatePositions(selectedTrades, currentPrices);
    const totals = calculateTotalProfitLoss(positions);
    
    setPendingAIAnalysis({ positions, totals });
    setActiveTab('ai');
  };

  return (
    <div className="app-container">
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <h2>StockTracker</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'positions' ? 'active' : ''}`}
            onClick={() => setActiveTab('positions')}
          >
            <LayoutDashboard className="nav-icon" size={18} strokeWidth={2} />
            持仓汇总
          </button>
          <button 
            className={`nav-item ${activeTab === 'trades' ? 'active' : ''}`}
            onClick={() => setActiveTab('trades')}
          >
            <History className="nav-icon" size={18} strokeWidth={2} />
            交易记录
          </button>
          <button 
            className={`nav-item ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <MessageSquare className="nav-icon" size={18} strokeWidth={2} />
            AI 助手
          </button>
        </nav>
      </aside>

      <div className="app-content">
        <header className="content-header">
          <div className="header-title-area">
            <h1>
              {activeTab === 'positions' ? '持仓汇总' : 
               activeTab === 'trades' ? '交易记录' : 'AI 投资顾问'}
            </h1>
          </div>
          
          <div className="header-actions">
            {(activeTab === 'positions' || activeTab === 'trades') && (
              <HeaderSearch 
                filter={globalFilter} 
                onFilterChange={setGlobalFilter} 
                allTags={allTags}
                pinnedTags={pinnedTags}
                onTogglePinTag={togglePinTag}
                allStocks={allStocks}
                placeholder={activeTab === 'positions' ? "搜索股票/标签..." : "搜索记录/标签..."}
              />
            )}

            {activeTab === 'positions' && (
              <button 
                className="header-btn-primary" 
                onClick={handleRefreshQuotes}
                disabled={loading}
              >
                <RefreshCcw size={16} className={loading ? 'spinning' : ''} style={{ marginRight: '8px' }} />
                <span>{loading ? '刷新中' : '刷新行情'}</span>
              </button>
            )}

            {activeTab === 'trades' && (
              <button className="header-btn-primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} style={{ marginRight: '6px' }} />
                <span>新增记录</span>
              </button>
            )}
          </div>
        </header>

        <main className="main-viewport">
          {activeTab === 'positions' ? (
            <PositionSummary
              positions={displayPositions}
              totalCost={displayTotals.totalCost}
              totalMarketValue={displayTotals.totalMarketValue}
              totalProfitLoss={displayTotals.totalProfitLoss}
              totalProfitLossPercent={displayTotals.totalProfitLossPercent}
              quotes={quotes}
              onManualPriceUpdate={handleManualPriceUpdate}
              onViewTrades={handleViewTrades}
            />
          ) : activeTab === 'trades' ? (
            <TradeList 
              trades={currentFilteredTrades} 
              onDelete={deleteTrade} 
              onBatchDelete={batchDeleteTrades}
              onImport={importTrades}
              onEdit={handleEditClick}
              onAIAnalyze={handleAIAnalyzeSelected}
            />
          ) : (
            <AIAssistant 
              positions={displayPositions} 
              totals={displayTotals} 
              pendingAnalysis={pendingAIAnalysis}
              onAnalysisComplete={() => setPendingAIAnalysis(null)}
            />
          )}
        </main>
      </div>

      {isModalOpen && (
        <div 
          className="modal-overlay" 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              (e.currentTarget as any)._mouseDownOnOverlay = true;
            }
          }}
          onMouseUp={(e) => {
            if (e.target === e.currentTarget && (e.currentTarget as any)._mouseDownOnOverlay) {
              handleCloseModal();
            }
            (e.currentTarget as any)._mouseDownOnOverlay = false;
          }}
        >
          <div className="modal-content" onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>×</button>
            <TradeForm 
              onSubmit={handleAddTrade} 
              initialValues={editingTrade || undefined} 
              allExistingTags={allTags}
              pinnedTags={pinnedTags}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
