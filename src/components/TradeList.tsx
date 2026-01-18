import { useState, useMemo } from 'react';
import { 
  ChevronsUpDown, 
  ChevronUp, 
  ChevronDown, 
  LineChart, 
  Trash2, 
  Edit2, 
  Download, 
  Upload, 
  Bot, 
  BarChart2 
} from 'lucide-react';
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
    if (sortConfig.key !== key) return <ChevronsUpDown size={14} className="sort-indicator" />;
    return sortConfig.order === 'asc' ? 
      <ChevronUp size={14} className="sort-indicator active" /> : 
      <ChevronDown size={14} className="sort-indicator active" />;
  };

  return (
    <div className="trade-list">
      <div className="trade-list-header-minimal">
        <div className="header-left-minimal">
          {selectedIds.length > 0 && (
            <>
              <button className="batch-delete-btn" onClick={handleBatchDelete}>
                <Trash2 size={14} />
                <span>删除 ({selectedIds.length})</span>
              </button>
              <button className="analysis-btn" onClick={() => setShowAnalysis(true)}>
                <BarChart2 size={14} />
                <span>图表分析</span>
              </button>
              <button 
                className="ai-analysis-btn" 
                onClick={() => onAIAnalyze?.(selectedIds)}
              >
                <Bot size={14} />
                <span>AI 分析</span>
              </button>
            </>
          )}
        </div>
        <div className="header-right-minimal">
          <button className="secondary-btn" onClick={handleExport}>
            <Download size={14} />
            <span>导出</span>
          </button>
          <label className="secondary-btn import-label">
            <Upload size={14} />
            <span>导入</span>
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
                  <div className="th-content">时间 {renderSortIndicator('date')}</div>
                </th>
                <th onClick={() => handleSort('stockCode')} className="sortable">
                  <div className="th-content">股票 {renderSortIndicator('stockCode')}</div>
                </th>
                <th onClick={() => handleSort('type')} className="sortable">
                  <div className="th-content">类型 {renderSortIndicator('type')}</div>
                </th>
                <th onClick={() => handleSort('price')} className="sortable number-cell">
                  <div className="th-content justify-end">价格 {renderSortIndicator('price')}</div>
                </th>
                <th onClick={() => handleSort('quantity')} className="sortable number-cell">
                  <div className="th-content justify-end">数量 {renderSortIndicator('quantity')}</div>
                </th>
                <th onClick={() => handleSort('amount')} className="sortable number-cell">
                  <div className="th-content justify-end">金额 {renderSortIndicator('amount')}</div>
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
                        className="chart-btn-minimal" 
                        onClick={() => setChartStock({ code: trade.stockCode, name: trade.stockName })}
                        title="查看图表"
                      >
                        <LineChart size={14} />
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
                      title="修改"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => {
                        if (confirm('确定删除这条记录吗？')) {
                          onDelete(trade.id);
                        }
                      }}
                      title="删除"
                    >
                      <Trash2 size={14} />
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
