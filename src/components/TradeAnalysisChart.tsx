import { useMemo, useState } from 'react';
import type { AnalysisPoint } from '../utils/calculations';
import { formatMoney } from '../utils/calculations';
import './TradeAnalysisChart.css';

interface TradeAnalysisChartProps {
  data: AnalysisPoint[];
  onClose: () => void;
}

export function TradeAnalysisChart({ data, onClose }: TradeAnalysisChartProps) {
  const [visibleCurves, setVisibleCurves] = useState({
    cost: true,
    profit: true,
    cumulativeCost: true,
  });
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    date: string;
    value: number;
    label: string;
    color: string;
  } | null>(null);

  const chartWidth = 800;
  const chartHeight = 400;
  const padding = 50;

  const processedData = useMemo(() => {
    if (data.length === 0) return [];
    
    // Aggregate by date if multiple trades on same day for better curve
    const map = new Map<string, AnalysisPoint>();
    data.forEach(p => {
      const existing = map.get(p.date);
      if (existing) {
        existing.cost += p.cost;
        existing.profit += p.profit;
        existing.cumulativeCost = p.cumulativeCost; // Use the last one for cumulative
      } else {
        map.set(p.date, { ...p });
      }
    });
    return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  const stats = useMemo(() => {
    if (processedData.length === 0) return null;
    
    const activeValues = processedData.flatMap(p => {
      const vals: number[] = [];
      if (visibleCurves.cost) vals.push(p.cost);
      if (visibleCurves.profit) vals.push(p.profit);
      if (visibleCurves.cumulativeCost) vals.push(p.cumulativeCost);
      return vals;
    });

    if (activeValues.length === 0) return { min: 0, max: 100, count: processedData.length };
    
    const min = Math.min(...activeValues, 0);
    const max = Math.max(...activeValues, 100);
    
    return { min, max, count: processedData.length };
  }, [processedData, visibleCurves]);

  if (!stats || processedData.length < 1) {
    return (
      <div className="analysis-modal-overlay" onClick={onClose}>
        <div className="analysis-modal-content" onClick={e => e.stopPropagation()}>
          <button className="close-btn" onClick={onClose}>×</button>
          <p>数据不足，无法绘制图表</p>
        </div>
      </div>
    );
  }

  const { min, max, count } = stats;
  const range = Math.max(max - min, 1);
  const getY = (val: number) => chartHeight - padding - ((val - min) / range) * (chartHeight - 2 * padding);
  const getX = (index: number) => padding + (index / (count - 1 || 1)) * (chartWidth - 2 * padding);

  const toggleCurve = (key: keyof typeof visibleCurves) => {
    setVisibleCurves(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderLine = (
    key: keyof Pick<AnalysisPoint, 'cost' | 'profit' | 'cumulativeCost'>, 
    color: string,
    label: string
  ) => {
    if (!visibleCurves[key] || processedData.length === 0) return null;
    
    const points = processedData.map((p, i) => ({
      x: getX(i),
      y: getY(p[key] as number),
      date: p.date,
      value: p[key] as number
    }));

    if (points.length < 2) {
      const p = points[0];
      return (
        <circle 
          cx={p.x} cy={p.y} r="6" fill={color} 
          onMouseEnter={() => setHoverInfo({ x: p.x, y: p.y, date: p.date, value: p.value, label, color })}
          onMouseLeave={() => setHoverInfo(null)}
          style={{ cursor: 'pointer' }}
        />
      );
    }
    
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    return (
      <g>
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle 
            key={i} 
            cx={p.x} 
            cy={p.y} 
            r="4" 
            fill="white" 
            stroke={color} 
            strokeWidth="2" 
            onMouseEnter={() => setHoverInfo({ x: p.x, y: p.y, date: p.date, value: p.value, label, color })}
            onMouseLeave={() => setHoverInfo(null)}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </g>
    );
  };

  return (
    <div className="analysis-modal-overlay" onClick={onClose}>
      <div className="analysis-modal-content" onClick={e => e.stopPropagation()}>
        <div className="analysis-modal-header">
          <h3>交易分析图表</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="chart-wrapper" style={{ position: 'relative' }}>
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            {/* Grid Lines */}
            <line x1={padding} y1={getY(0)} x2={chartWidth - padding} y2={getY(0)} stroke="#eee" strokeWidth="1" />
            
            {/* Y Axis Labels */}
            <text x={padding - 10} y={getY(max)} textAnchor="end" fontSize="12" fill="#999">¥{formatMoney(max)}</text>
            <text x={padding - 10} y={getY(min)} textAnchor="end" fontSize="12" fill="#999">¥{formatMoney(min)}</text>
            <text x={padding - 10} y={getY(0)} textAnchor="end" fontSize="12" fill="#666">0</text>

            {/* X Axis Labels (Dates) */}
            {processedData.map((p, i) => (
              (i === 0 || i === count - 1 || count < 10) && (
                <text 
                  key={i} 
                  x={getX(i)} 
                  y={chartHeight - padding + 20} 
                  textAnchor="middle" 
                  fontSize="10" 
                  fill="#999"
                  transform={`rotate(45, ${getX(i)}, ${chartHeight - padding + 20})`}
                >
                  {p.date}
                </text>
              )
            ))}

            {/* Curves */}
            {renderLine('cost', '#4a90e2', '交易金额')}
            {renderLine('profit', '#2ecc71', '交易盈亏')}
            {renderLine('cumulativeCost', '#f1c40f', '累计总成本')}
          </svg>

          {hoverInfo && (
            <div 
              className="chart-tooltip"
              style={{
                left: `${(hoverInfo.x / chartWidth) * 100}%`,
                top: `${(hoverInfo.y / chartHeight) * 100}%`,
                borderColor: hoverInfo.color,
                transform: `translate(${
                  hoverInfo.x < chartWidth * 0.2 ? '0%' : 
                  hoverInfo.x > chartWidth * 0.8 ? '-100%' : 
                  '-50%'
                }, -100%) translateY(-10px)`
              }}
            >
              <div className="tooltip-date">{hoverInfo.date}</div>
              <div className="tooltip-value">
                <span className="tooltip-label">{hoverInfo.label}:</span>
                <span className="tooltip-number" style={{ color: hoverInfo.color }}>
                  ¥{formatMoney(hoverInfo.value)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="chart-legend">
          <label className={`legend-item ${visibleCurves.cost ? '' : 'inactive'}`}>
            <input type="checkbox" checked={visibleCurves.cost} onChange={() => toggleCurve('cost')} />
            <span className="dot cost"></span> 交易金额
          </label>
          <label className={`legend-item ${visibleCurves.profit ? '' : 'inactive'}`}>
            <input type="checkbox" checked={visibleCurves.profit} onChange={() => toggleCurve('profit')} />
            <span className="dot profit"></span> 交易盈亏
          </label>
          <label className={`legend-item ${visibleCurves.cumulativeCost ? '' : 'inactive'}`}>
            <input type="checkbox" checked={visibleCurves.cumulativeCost} onChange={() => toggleCurve('cumulativeCost')} />
            <span className="dot cumulative"></span> 累计总成本
          </label>
        </div>

        <div className="chart-tips">
          <p>* 交易盈亏仅在卖出操作时计算，基于对应股票的平均成本。</p>
          <p>* 累计总成本反映了所选交易对整体持仓成本的影响变化。</p>
        </div>
      </div>
    </div>
  );
}
