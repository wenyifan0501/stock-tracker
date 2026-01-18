import React, { useState, useMemo } from 'react';
import type { Trade, TradeType } from '../types';
import { generateId } from '../utils/calculations';
import { StockSearch } from './StockSearch';
import { TagInput } from './TagInput';
import './TradeForm.css';

interface TradeFormProps {
  onSubmit: (trade: Trade) => void;
  initialValues?: Partial<Trade>;
  allExistingTags: string[];
  pinnedTags?: string[]; // 新增：已固定标签
}

const LAST_STOCK_KEY = 'stock-tracker-last-stock';

export function TradeForm({ onSubmit, initialValues, allExistingTags, pinnedTags = [] }: TradeFormProps) {
  // 尝试从本地存储获取上次使用的股票
  const getLastStock = () => {
    try {
      const stored = localStorage.getItem(LAST_STOCK_KEY);
      return stored ? JSON.parse(stored) : { code: '', name: '' };
    } catch {
      return { code: '', name: '' };
    }
  };

  const lastStock = useMemo(() => getLastStock(), []);

  const [stockCode, setStockCode] = useState(initialValues?.stockCode || (!initialValues ? lastStock.code : ''));
  const [stockName, setStockName] = useState(initialValues?.stockName || (!initialValues ? lastStock.name : ''));
  const [type, setType] = useState<TradeType>(initialValues?.type || 'buy');
  const [price, setPrice] = useState(initialValues?.price?.toString() || '');
  const [quantity, setQuantity] = useState(initialValues?.quantity?.toString() || '');
  const [date, setDate] = useState(
    initialValues?.date ? initialValues.date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [commission, setCommission] = useState(
    initialValues?.commission?.toString() || ''
  );
  const [tags, setTags] = useState<string[]>(initialValues?.tags || (!initialValues ? pinnedTags : []));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!stockCode || !price || !quantity) {
      alert('请填写股票代码、价格和数量');
      return;
    }

    // 记忆当前使用的股票
    localStorage.setItem(LAST_STOCK_KEY, JSON.stringify({
      code: stockCode,
      name: stockName
    }));

    const trade: Trade = {
      id: initialValues?.id || generateId(),
      stockCode: stockCode.toUpperCase(),
      stockName: stockName || stockCode.toUpperCase(),
      type,
      price: parseFloat(price),
      quantity: parseInt(quantity, 10),
      date,
      commission: commission ? parseFloat(commission) : undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    onSubmit(trade);

    // 重置表单
    if (!initialValues) {
      setStockCode('');
      setStockName('');
      setPrice('');
      setQuantity('');
      setCommission('');
      setTags([]);
      setDate(new Date().toISOString().split('T')[0]);
    }
  };

  const totalAmount = price && quantity 
    ? parseFloat(price) * parseInt(quantity, 10) + (commission ? parseFloat(commission) : 0)
    : 0;

  return (
    <form className="trade-form" onSubmit={handleSubmit}>
      <h3>{initialValues ? '编辑交易' : '添加交易记录'}</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label>股票代码 *</label>
          <StockSearch
            value={stockCode}
            onChange={(code, name) => {
              setStockCode(code);
              setStockName(name);
            }}
          />
        </div>
        
        <div className="form-group">
          <label>股票名称</label>
          <input
            type="text"
            value={stockName}
            onChange={e => setStockName(e.target.value)}
            placeholder="自动带出或手动输入"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>交易类型 *</label>
          <div className="trade-type-buttons">
            <button
              type="button"
              className={`type-btn ${type === 'buy' ? 'active buy' : ''}`}
              onClick={() => setType('buy')}
            >
              买入
            </button>
            <button
              type="button"
              className={`type-btn ${type === 'sell' ? 'active sell' : ''}`}
              onClick={() => setType('sell')}
            >
              卖出
            </button>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>成交价格 *</label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        
        <div className="form-group">
          <label>成交数量 *</label>
          <input
            type="number"
            step="1"
            min="1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="100"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group date-form-group">
          <label>成交日期 *</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>手续费</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={commission}
            onChange={e => setCommission(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>交易标签</label>
          <TagInput 
            tags={tags} 
            allExistingTags={allExistingTags} 
            onChange={setTags} 
          />
        </div>
      </div>

      {totalAmount > 0 && (
        <div className="total-preview">
          交易金额: <strong>¥{totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</strong>
        </div>
      )}

      <button type="submit" className="submit-btn">
        {initialValues ? '保存修改' : '添加记录'}
      </button>
    </form>
  );
}
