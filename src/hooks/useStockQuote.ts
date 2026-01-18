import { useState, useCallback } from 'react';
import type { StockQuote } from '../types';
import { getFullCode } from '../utils/calculations';

/**
 * 使用新浪财经 API 获取 A 股实时行情
 * 股票代码格式：
 * - 上海：sh + 代码，如 sh600519
 * - 深圳：sz + 代码，如 sz000001
 * - 北京：bj + 代码，如 bj430047
 */
export function useStockQuote() {
  const [quotes, setQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 解析新浪行情数据
   * 格式：var hq_str_sh600519="贵州茅台,1799.00,1785.00,..."
   */
  const parseQuoteData = (text: string, code: string): StockQuote | null => {
    try {
      const match = text.match(/="(.*)"/);
      if (!match || !match[1]) return null;

      const parts = match[1].split(',');
      if (parts.length < 4) return null;

      const name = parts[0];
      const prevClose = parseFloat(parts[2]);
      const price = parseFloat(parts[3]);

      if (isNaN(price) || price === 0) return null;

      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

      return {
        code: code.replace(/^(sh|sz|bj)/i, ''),
        name,
        price,
        change,
        changePercent,
      };
    } catch {
      return null;
    }
  };

  /**
   * 获取单只股票行情
   */
  const fetchQuote = useCallback(async (code: string): Promise<StockQuote | null> => {
    const fullCode = getFullCode(code);
    
    try {
      // 通过 Vite 代理请求新浪行情 API
      const response = await fetch(`/api/sina/list=${fullCode}`);
      
      const text = await response.text();
      return parseQuoteData(text, code);
    } catch (err) {
      console.error('获取行情失败:', err);
      return null;
    }
  }, []);

  /**
   * 批量获取行情
   */
  const fetchQuotes = useCallback(async (codes: string[], silent = false) => {
    if (codes.length === 0) return;

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const fullCodes = codes.map(getFullCode).join(',');
      
      // 通过 Vite 代理请求新浪行情 API
      const response = await fetch(`/api/sina/list=${fullCodes}`);

      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());

      const newQuotes = new Map<string, StockQuote>();

      lines.forEach((line, index) => {
        const code = codes[index];
        if (code) {
          const quote = parseQuoteData(line, code);
          if (quote) {
            newQuotes.set(code, quote);
          }
        }
      });

      setQuotes(newQuotes);
    } catch (err) {
      if (!silent) {
        setError('获取行情失败，请稍后重试');
      }
      console.error('批量获取行情失败:', err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * 手动更新价格
   */
  const setManualPrice = useCallback((code: string, price: number, name?: string) => {
    setQuotes(prev => {
      const newQuotes = new Map(prev);
      const existing = prev.get(code);
      newQuotes.set(code, {
        code,
        name: name || existing?.name || code,
        price,
        change: 0,
        changePercent: 0,
      });
      return newQuotes;
    });
  }, []);

  return {
    quotes,
    loading,
    error,
    fetchQuote,
    fetchQuotes,
    setManualPrice,
  };
}
