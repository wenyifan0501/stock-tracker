import { useState, useCallback, useRef, useEffect } from 'react';

export interface StockSearchResult {
  code: string;
  name: string;
  market: 'sh' | 'sz' | 'bj';
}

interface StockSearchProps {
  value: string;
  onChange: (code: string, name: string) => void;
  placeholder?: string;
}

// 解析 Unicode 转义字符，如 \u534a -> 中
function unescapeUnicode(str: string): string {
  return str.replace(/\\u([a-fA-F0-9]{4})/g, (_, inline) => 
    String.fromCharCode(parseInt(inline, 16))
  );
}

export function StockSearch({ value, onChange, placeholder = '输入代码/名称，如: 512480' }: StockSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchStocks = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 1) {
      setResults([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);

    try {
      const cleanQuery = searchQuery.toUpperCase().replace(/^(SH|SZ|BJ)/, '');
      
      // 调用腾讯搜索接口 (通过 Vite 代理)
      const response = await fetch(
        `/api/tencent-search/s3/?q=${encodeURIComponent(cleanQuery)}&t=all&_=${Date.now()}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) throw new Error('Network error');

      // 处理 GBK 编码
      const buffer = await response.arrayBuffer();
      const decoder = new TextDecoder('gbk');
      const text = decoder.decode(buffer);
      
      // 解析 v_hint="market~code~name~pinyin~type^..." 格式
      const match = text.match(/="([^"]+)"/);
      if (match && match[1]) {
        const rawData = match[1];
        const items = rawData.split('^');
        
        const stocks: StockSearchResult[] = items
          .map(item => {
            const parts = item.split('~');
            if (parts.length >= 3) {
              const market = parts[0] as 'sh' | 'sz' | 'bj';
              const code = parts[1];
              const name = unescapeUnicode(parts[2]);
              // 过滤掉非 A 股/基金等（可选，目前保留全部）
              return { market, code, name };
            }
            return null;
          })
          .filter((s): s is StockSearchResult => s !== null);
          
        setResults(stocks.slice(0, 10));
      } else {
        setResults([]);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('搜索失败:', error);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query && query !== value) {
        searchStocks(query);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, searchStocks, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (stock: StockSearchResult) => {
    const fullCode = `${stock.market}${stock.code}`;
    setQuery(fullCode);
    onChange(fullCode, stock.name);
    setShowDropdown(false);
    setResults([]);
  };

  return (
    <div className="stock-search" ref={dropdownRef} style={{ position: 'relative' }}>
      <div className="input-with-clear">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {query && (
          <button 
            type="button" 
            className="input-clear-btn" 
            onClick={() => {
              setQuery('');
              onChange('', '');
              setResults([]);
            }}
          >
            ×
          </button>
        )}
      </div>
      
      {showDropdown && (query || loading) && (
        <div className="stock-dropdown">
          {loading ? (
            <div className="dropdown-item loading">搜索中...</div>
          ) : results.length > 0 ? (
            results.map((stock) => (
              <div
                key={`${stock.market}${stock.code}`}
                className="dropdown-item"
                onClick={() => handleSelect(stock)}
              >
                <span className="stock-code">{stock.code}</span>
                <span className="stock-name">{stock.name}</span>
                <span className={`market-tag ${stock.market}`}>
                  {stock.market.toUpperCase()}
                </span>
              </div>
            ))
          ) : query ? (
            <div className="dropdown-item empty">未找到相关结果</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
