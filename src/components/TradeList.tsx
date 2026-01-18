import { useState, useMemo } from 'react';
import type { Trade } from '../types';
import { StockChart } from './StockChart';
import { TradeAnalysisChart } from './TradeAnalysisChart';
import { analyzeTradeHistory } from '../utils/calculations';
import './TradeList.css';

interface TradeListProps {
  trades: Trade[];
  onDelete: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onImport: (trades: Trade[]) => void;
  onEdit: (trade: Trade) => void;
  onAddClick: () => void;
  onAIAnalyze?: (ids: string[]) => void;
  externalFilter?: string;
}

type SortKey = keyof Trade | 'amount';
type SortOrder = 'asc' | 'desc';

export function TradeList({ trades, onDelete, onBatchDelete, onImport, onEdit, onAIAnalyze, externalFilter = '' }: Omit<TradeListProps, 'onAddClick'>) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({
    key: 'date',
    order: 'desc'
  });
  const [chartStock, setChartStock] = useState<{ code: string; name: string } | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const analysisData = useMemo(() => {
    if (!showAnalysis) return [];
    const selectedTrades = trades.filter(t => selectedIds.includes(t.id));
    return analyzeTradeHistory(selectedTrades);
  }, [showAnalysis, selectedIds, trades]);

  const handleExport = () => {
    if (trades.length === 0) {
      alert('暂无记录可导出');
      return;
    }
    const dataStr = JSON.stringify(trades, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock_trades_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedData = JSON.parse(content);
        if (Array.isArray(importedData)) {
          onImport(importedData);
          alert(`成功导入 ${importedData.length} 条记录`);
        } else {
          alert('导入文件格式不正确，请确保是有效的交易记录文件');
        }
      } catch (err) {
        alert('文件解析失败，请检查文件格式');
      }
      e.target.value = ''; // 清空 input 方便下次导入
    };
    reader.readAsText(file);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, order: prev.order === 'asc' ? 'desc' : 'asc' };
      }
      return { key, order: 'desc' };
    });
  };

  const filteredAndSortedTrades = useMemo(() => {
    let result = [...trades];

    // Filtering using external prop (supports tags)
    if (externalFilter) {
      const lowerFilter = externalFilter.toLowerCase();
      result = result.filter(
        t => t.stockCode.toLowerCase().includes(lowerFilter) || 
             t.stockName.toLowerCase().includes(lowerFilter) ||
             t.tags?.some(tag => tag.toLowerCase().includes(lowerFilter))
      );
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortConfig.key === 'amount') {
        aVal = a.price * a.quantity;
        bVal = b.price * b.quantity;
      } else {
        aVal = a[sortConfig.key as keyof Trade];
        bVal = b[sortConfig.key as keyof Trade];
      }

      if (aVal === bVal) return 0;
      if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
      return sortConfig.order === 'asc' ? 1 : -1;
    });

    return result;
  }, [trades, externalFilter, sortConfig]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredAndSortedTrades.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`确定删除选中的 ${selectedIds.length} 条记录吗？`)) {
      onBatchDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  const renderSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return <span className="sort-indicator">⇅</span>;
    return sortConfig.order === 'asc' ? 
      <span className="sort-indicator active">↑</span> : 
      <span className="sort-indicator active">↓</span>;
  };

  return (
    <div className="trade-list">
      <div className="trade-list-header-minimal">
        <div className="header-left-minimal">
          {selectedIds.length > 0 && (
            <>
              <button className="batch-delete-btn" onClick={handleBatchDelete}>
                删除选中 ({selectedIds.length})
              </button>
              <button className="analysis-btn" onClick={() => setShowAnalysis(true)}>
                图表分析
              </button>
              <button 
                className="ai-analysis-btn" 
                onClick={() => onAIAnalyze?.(selectedIds)}
              >
                AI 分析选中
              </button>
            </>
          )}
        </div>
        <div className="header-right-minimal">
          <button className="secondary-btn" onClick={handleExport}>
            导出 JSON
          </button>
          <label className="secondary-btn import-label">
            导入 JSON
            <input type="file" accept=".json" onChange={handleImport} hidden />
          </label>
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="trade-list empty">
          <p>暂无交易记录</p>
        </div>
      ) : (
        <div className="trade-table-wrapper">
          <table className="trade-table">
            <thead>
              <tr>
                <th className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredAndSortedTrades.length && filteredAndSortedTrades.length > 0}
                    onChange={e => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th onClick={() => handleSort('date')} className="sortable">
                  时间 {renderSortIndicator('date')}
                </th>
                <th onClick={() => handleSort('stockCode')} className="sortable">
                  股票 {renderSortIndicator('stockCode')}
                </th>
                <th onClick={() => handleSort('type')} className="sortable">
                  类型 {renderSortIndicator('type')}
                </th>
                <th onClick={() => handleSort('price')} className="sortable number-cell">
                  价格 {renderSortIndicator('price')}
                </th>
                <th onClick={() => handleSort('quantity')} className="sortable number-cell">
                  数量 {renderSortIndicator('quantity')}
                </th>
                <th onClick={() => handleSort('amount')} className="sortable number-cell">
                  金额 {renderSortIndicator('amount')}
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedTrades.map(trade => (
                <tr key={trade.id}>
                  <td className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(trade.id)}
                      onChange={e => handleSelectOne(trade.id, e.target.checked)}
                    />
                  </td>
                  <td className="date-cell">{formatDate(trade.date)}</td>
                  <td className="stock-cell">
                    <div className="stock-info-row">
                      <span className="stock-code">{trade.stockCode}</span>
                      <button 
                        className="chart-btn-small" 
                        onClick={() => setChartStock({ code: trade.stockCode, name: trade.stockName })}
                        title="查看图表"
                      >
                        📈
                      </button>
                    </div>
                    {trade.stockName && (
                      <span className="stock-name">{trade.stockName}</span>
                    )}
                    {trade.tags && trade.tags.length > 0 && (
                      <div className="trade-tags-list">
                        {trade.tags.map(tag => (
                          <span key={tag} className="trade-tag-badge">{tag}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`trade-type ${trade.type}`}>
                      {trade.type === 'buy' ? '买入' : '卖出'}
                    </span>
                  </td>
                  <td className="number-cell">¥{trade.price.toFixed(2)}</td>
                  <td className="number-cell">{trade.quantity.toLocaleString()}</td>
                  <td className="number-cell">
                    ¥{(trade.price * trade.quantity).toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="edit-btn"
                      onClick={() => onEdit(trade)}
                    >
                      修改
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => {
                        if (confirm('确定删除这条记录吗？')) {
                          onDelete(trade.id);
                        }
                      }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAndSortedTrades.length === 0 && trades.length > 0 && (
            <div className="no-results">没有找到匹配的交易记录</div>
          )}
        </div>
      )}

      {chartStock && (
        <StockChart
          stockCode={chartStock.code}
          stockName={chartStock.name}
          onClose={() => setChartStock(null)}
        />
      )}

      {showAnalysis && (
        <TradeAnalysisChart
          data={analysisData}
          onClose={() => setShowAnalysis(false)}
        />
      )}
    </div>
  );
}
