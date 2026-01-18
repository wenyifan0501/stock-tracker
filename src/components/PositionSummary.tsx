import { useState, useMemo } from 'react';
import { ChevronsUpDown, ChevronUp, ChevronDown, LineChart, FileSearch } from 'lucide-react';
import type { Position, StockQuote } from '../types';
import { formatMoney, formatPercent } from '../utils/calculations';
import { StockChart } from './StockChart';
import './PositionSummary.css';

interface PositionSummaryProps {
  positions: Position[];
  totalCost: number;
  totalMarketValue: number | null;
  totalProfitLoss: number | null;
  totalProfitLossPercent: number | null;
  quotes: Map<string, StockQuote>;
  onManualPriceUpdate: (code: string, price: number) => void;
  onViewTrades: (code: string) => void;
}

type SortKey = keyof Position | 'profitLoss' | 'profitLossPercent';
type SortOrder = 'asc' | 'desc';

export function PositionSummary({
  positions,
  totalCost,
  totalMarketValue,
  totalProfitLoss,
  totalProfitLossPercent,
  quotes,
  onManualPriceUpdate,
  onViewTrades,
}: Omit<PositionSummaryProps, 'onRefreshQuotes' | 'loading'>) {
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const [editPrice, setEditPrice] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder } | null>(null);
  const [chartStock, setChartStock] = useState<{ code: string; name: string } | null>(null);

  const handlePriceEdit = (code: string, currentPrice: number | null) => {
    setEditingCode(code);
    setEditPrice(currentPrice?.toString() || '');
  };

  const handlePriceSave = (code: string) => {
    const price = parseFloat(editPrice);
    if (!isNaN(price) && price > 0) {
      onManualPriceUpdate(code, price);
    }
    setEditingCode(null);
    setEditPrice('');
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, order: prev.order === 'asc' ? 'desc' : 'asc' };
      }
      return { key, order: 'desc' };
    });
  };

  const getProfitClass = (value: number | null) => {
    if (value === null || value === 0) return '';
    return value > 0 ? 'profit' : 'loss';
  };

  const filteredAndSortedPositions = useMemo(() => {
    let result = [...positions];

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof Position];
        let bVal: any = b[sortConfig.key as keyof Position];

        // Handle cases where values might be null
        if (aVal === null) aVal = -Infinity;
        if (bVal === null) bVal = -Infinity;

        if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [positions, sortConfig]);

  if (positions.length === 0) {
    return (
      <div className="position-summary empty">
        <p>暂无持仓数据</p>
      </div>
    );
  }

  const renderSortIndicator = (key: SortKey) => {
    if (sortConfig?.key !== key) return <ChevronsUpDown size={14} className="sort-indicator" />;
    return sortConfig.order === 'asc' ? 
      <ChevronUp size={14} className="sort-indicator active" /> : 
      <ChevronDown size={14} className="sort-indicator active" />;
  };

  return (
    <div className="position-summary">
      {/* 总览卡片 */}
      <div className="summary-cards">
        <div className="summary-card">
          <span className="label">总成本</span>
          <span className="value">¥{formatMoney(totalCost)}</span>
        </div>
        <div className="summary-card">
          <span className="label">总市值</span>
          <span className="value">
            {totalMarketValue !== null ? `¥${formatMoney(totalMarketValue)}` : '-'}
          </span>
        </div>
        <div className={`summary-card ${getProfitClass(totalProfitLoss)}`}>
          <span className="label">总浮盈</span>
          <span className="value">
            {totalProfitLoss !== null ? (
              <>
                {totalProfitLoss > 0 ? '+' : totalProfitLoss < 0 ? '-' : ''}¥{formatMoney(Math.abs(totalProfitLoss))}
                <small>({formatPercent(totalProfitLossPercent)})</small>
              </>
            ) : '-'}
          </span>
        </div>
      </div>

      {/* 持仓明细表格 */}
      <div className="position-table-wrapper">
        <table className="position-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('stockCode')} className="sortable">
                <div className="th-content">股票 {renderSortIndicator('stockCode')}</div>
              </th>
              <th onClick={() => handleSort('totalQuantity')} className="sortable number-cell">
                <div className="th-content justify-end">持仓数量 {renderSortIndicator('totalQuantity')}</div>
              </th>
              <th onClick={() => handleSort('averageCost')} className="sortable number-cell">
                <div className="th-content justify-end">成本价 {renderSortIndicator('averageCost')}</div>
              </th>
              <th onClick={() => handleSort('currentPrice')} className="sortable number-cell">
                <div className="th-content justify-end">现价 {renderSortIndicator('currentPrice')}</div>
              </th>
              <th onClick={() => handleSort('marketValue')} className="sortable number-cell">
                <div className="th-content justify-end">市值 {renderSortIndicator('marketValue')}</div>
              </th>
              <th onClick={() => handleSort('profitLoss')} className="sortable number-cell">
                <div className="th-content justify-end">浮盈 {renderSortIndicator('profitLoss')}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPositions.map(pos => {
              const quote = quotes.get(pos.stockCode);
              return (
                <tr key={pos.stockCode}>
                  <td className="stock-cell">
                    <div className="stock-info-row">
                      <span className="stock-code">{pos.stockCode}</span>
                      <div className="stock-actions-minimal">
                        <button 
                          className="chart-btn-minimal" 
                          onClick={() => setChartStock({ code: pos.stockCode, name: pos.stockName })}
                          title="查看图表"
                        >
                          <LineChart size={14} />
                        </button>
                        <button 
                          className="chart-btn-minimal" 
                          onClick={() => onViewTrades(pos.stockCode)}
                          title="查看交易记录"
                        >
                          <FileSearch size={14} />
                        </button>
                      </div>
                    </div>
                    <span className="stock-name">{pos.stockName}</span>
                  </td>
                  <td className="number-cell">{pos.totalQuantity.toLocaleString()}</td>
                  <td className="number-cell">¥{pos.averageCost.toFixed(3)}</td>
                  <td className="number-cell price-cell">
                    {editingCode === pos.stockCode ? (
                      <div className="price-edit">
                        <input
                          type="number"
                          step="0.001"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handlePriceSave(pos.stockCode);
                            if (e.key === 'Escape') setEditingCode(null);
                          }}
                          autoFocus
                        />
                        <button onClick={() => handlePriceSave(pos.stockCode)}>确定</button>
                      </div>
                    ) : (
                      <span 
                        className="editable-price"
                        onClick={() => handlePriceEdit(pos.stockCode, pos.currentPrice)}
                        title="点击编辑价格"
                      >
                        {pos.currentPrice !== null ? (
                          <div className={quote ? (quote.change > 0 ? 'up' : quote.change < 0 ? 'down' : '') : ''}>
                            ¥{pos.currentPrice.toFixed(3)}
                            {quote && (
                              <small style={{ display: 'block', fontSize: '11px', color: 'inherit' }}>
                                {quote.change > 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                              </small>
                            )}
                          </div>
                        ) : (
                          <span className="no-price">点击输入</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="number-cell">
                    {pos.marketValue !== null ? `¥${formatMoney(pos.marketValue)}` : '-'}
                  </td>
                    <td className={`number-cell ${getProfitClass(pos.profitLoss)}`}>
                      {pos.profitLoss !== null ? (
                        <>
                          <span>
                            {pos.profitLoss > 0 ? '+' : pos.profitLoss < 0 ? '-' : ''}¥{formatMoney(Math.abs(pos.profitLoss))}
                          </span>
                          <small>({formatPercent(pos.profitLossPercent)})</small>
                        </>
                      ) : '-'}
                    </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredAndSortedPositions.length === 0 && (
          <div className="no-results">没有找到匹配的股票</div>
        )}
      </div>

      {chartStock && (
        <StockChart
          stockCode={chartStock.code}
          stockName={chartStock.name}
          onClose={() => setChartStock(null)}
        />
      )}
    </div>
  );
}
