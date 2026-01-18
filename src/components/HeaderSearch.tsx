import { useState, useRef, useEffect, useMemo } from 'react';
import { History, Star, X } from 'lucide-react';
import './HeaderSearch.css';

interface FilterState {
  text: string;
  tags: string[];
}

interface HeaderSearchProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  allTags: string[];
  pinnedTags?: string[];
  onTogglePinTag?: (tag: string) => void;
  allStocks?: { code: string; name: string }[];
  placeholder?: string;
}

export function HeaderSearch({ 
  filter, 
  onFilterChange, 
  allTags, 
  pinnedTags = [], 
  onTogglePinTag,
  allStocks = [], 
  placeholder 
}: HeaderSearchProps) {
  const [inputValue, setInputValue] = useState(filter.text);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentStocks, setRecentStocks] = useState<string[]>(() => {
    const saved = localStorage.getItem('recent_stocks');
    return saved ? JSON.parse(saved) : [];
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 保存常用股票
  const addToRecent = (stock: string) => {
    if (!stock || stock.trim().length < 1) return;
    const trimmed = stock.trim();
    setRecentStocks(prev => {
      const filtered = prev.filter(s => s !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, 3); // 只保留最近3个
      localStorage.setItem('recent_stocks', JSON.stringify(updated));
      return updated;
    });
  };

  // 同步外部文本变化
  useEffect(() => {
    setInputValue(filter.text);
    if (filter.text && !showSuggestions) {
      addToRecent(filter.text);
    }
  }, [filter.text]);

  // 1. 标签建议 (最多3条)
  const filteredTagSuggestions = useMemo(() => 
    allTags.filter(
      tag => 
        tag.toLowerCase().includes(inputValue.toLowerCase()) && 
        !filter.tags.includes(tag)
    ).slice(0, 3)
  , [allTags, inputValue, filter.tags]);

  // 2. 股票匹配建议 (最多5条)
  const filteredStockSuggestions = useMemo(() => {
    if (!inputValue || inputValue.length < 1) return [];
    const lowerInput = inputValue.toLowerCase();
    return allStocks.filter(
      s => s.code.toLowerCase().includes(lowerInput) || 
           s.name.toLowerCase().includes(lowerInput)
    ).slice(0, 5);
  }, [inputValue, allStocks]);

  const handleAddTag = (tag: string) => {
    onFilterChange({
      text: '',
      tags: [...filter.tags, tag]
    });
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleStockClick = (stock: { code: string; name: string }) => {
    handleInputChange(stock.code);
    addToRecent(stock.code);
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onFilterChange({
      ...filter,
      tags: filter.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    onFilterChange({ ...filter, text: val });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue) {
      addToRecent(inputValue);
      const matchedTag = allTags.find(t => t.toLowerCase() === inputValue.toLowerCase());
      if (matchedTag) {
        e.preventDefault();
        handleAddTag(matchedTag);
      } else {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Backspace' && !inputValue && filter.tags.length > 0) {
      handleRemoveTag(filter.tags[filter.tags.length - 1]);
    }
  };

  const handleRecentClick = (stock: string) => {
    handleInputChange(stock);
    addToRecent(stock);
    setShowSuggestions(false);
  };

  const clearRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentStocks([]);
    localStorage.removeItem('recent_stocks');
  };

  const clearAll = () => {
    onFilterChange({ text: '', tags: [] });
    setInputValue('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="header-search-container" ref={dropdownRef}>
      <div className="header-search-box">
        {filter.tags.map(tag => (
          <span key={tag} className={`search-tag-pill ${pinnedTags.includes(tag) ? 'pinned' : ''}`}>
            <span 
              className="pin-icon" 
              onClick={(e) => {
                e.stopPropagation();
                onTogglePinTag?.(tag);
              }}
              title={pinnedTags.includes(tag) ? "取消固定" : "固定标签"}
            >
              <Star 
                size={14} 
                fill={pinnedTags.includes(tag) ? "currentColor" : "none"} 
                strokeWidth={2}
              />
            </span>
            {tag}
            <button type="button" onClick={() => handleRemoveTag(tag)}>
              <X size={14} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            handleInputChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            setTimeout(() => addToRecent(inputValue), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={filter.tags.length === 0 ? placeholder : ""}
        />
        {(inputValue || filter.tags.length > 0) && (
          <button className="header-clear-btn" onClick={clearAll}>
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div className="search-tag-suggestions">
          {/* 最近搜索 */}
          {recentStocks.length > 0 && !inputValue && (
            <div className="suggestion-section">
              <div className="suggestion-header">
                最近搜索
                <button className="clear-recent-btn" onClick={clearRecent}>清空</button>
              </div>
              <div className="recent-list">
                {recentStocks.map(stock => (
                  <div
                    key={stock}
                    className="suggestion-item recent-item"
                    onClick={() => handleRecentClick(stock)}
                  >
                    <History size={14} className="clock-icon" />
                    {stock}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 股票匹配建议 */}
          {filteredStockSuggestions.length > 0 && (
            <div className="suggestion-section">
              <div className="suggestion-header">匹配股票</div>
              <div className="stock-list">
                {filteredStockSuggestions.map(stock => (
                  <div
                    key={stock.code}
                    className="suggestion-item stock-suggestion-item"
                    onClick={() => handleStockClick(stock)}
                  >
                    <span className="stock-suggestion-code">{stock.code}</span>
                    <span className="stock-suggestion-name">{stock.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 标签建议 */}
          {filteredTagSuggestions.length > 0 && (
            <div className="suggestion-section">
              <div className="suggestion-header">筛选标签</div>
              <div className="tag-list">
                {filteredTagSuggestions.map(suggestion => (
                  <div
                    key={suggestion}
                    className={`suggestion-item tag-suggestion-item ${pinnedTags.includes(suggestion) ? 'pinned' : ''}`}
                    onClick={() => handleAddTag(suggestion)}
                  >
                    <span>{suggestion}</span>
                    <span 
                      className="pin-icon-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePinTag?.(suggestion);
                      }}
                      title={pinnedTags.includes(suggestion) ? "取消固定" : "固定标签"}
                    >
                      <Star 
                        size={12} 
                        fill={pinnedTags.includes(suggestion) ? "currentColor" : "none"} 
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {!inputValue && recentStocks.length === 0 && filteredTagSuggestions.length === 0 && (
            <div className="suggestion-empty">输入代码或名称进行搜索</div>
          )}
        </div>
      )}
    </div>
  );
}
