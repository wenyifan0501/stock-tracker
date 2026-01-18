import { useState } from 'react';
import { getFullCode } from '../utils/calculations';
import './StockChart.css';

interface StockChartProps {
  stockCode: string;
  stockName: string;
  onClose: () => void;
}

type ChartType = 'min' | 'daily' | 'weekly' | 'monthly';

export function StockChart({ stockCode, stockName, onClose }: StockChartProps) {
  const [chartType, setChartType] = useState<ChartType>('min');
  const fullCode = getFullCode(stockCode);

  const getChartUrl = (type: ChartType) => {
    // 使用新浪财经图表接口
    return `https://image.sinajs.cn/newchart/${type}/n/${fullCode}.gif?${Date.now()}`;
  };

  return (
    <div 
      className="chart-modal-overlay" 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          (e.currentTarget as any)._mouseDownOnOverlay = true;
        }
      }}
      onMouseUp={(e) => {
        if (e.target === e.currentTarget && (e.currentTarget as any)._mouseDownOnOverlay) {
          onClose();
        }
        (e.currentTarget as any)._mouseDownOnOverlay = false;
      }}
    >
      <div className="chart-modal-content" onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>
        <div className="chart-modal-header">
          <div className="stock-info">
            <span className="name">{stockName}</span>
            <span className="code">{stockCode.toUpperCase()}</span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="chart-tabs">
          <button 
            className={chartType === 'min' ? 'active' : ''} 
            onClick={() => setChartType('min')}
          >
            分时
          </button>
          <button 
            className={chartType === 'daily' ? 'active' : ''} 
            onClick={() => setChartType('daily')}
          >
            日K
          </button>
          <button 
            className={chartType === 'weekly' ? 'active' : ''} 
            onClick={() => setChartType('weekly')}
          >
            周K
          </button>
          <button 
            className={chartType === 'monthly' ? 'active' : ''} 
            onClick={() => setChartType('monthly')}
          >
            月K
          </button>
        </div>

        <div className="chart-container">
          <img 
            src={getChartUrl(chartType)} 
            alt={`${stockName} ${chartType} chart`}
            className="stock-chart-img"
          />
        </div>
        
        <div className="chart-modal-footer">
          <p>行情数据由新浪财经提供</p>
        </div>
      </div>
    </div>
  );
}
