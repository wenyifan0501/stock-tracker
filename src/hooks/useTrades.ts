import { useState, useEffect } from 'react';
import type { Trade } from '../types';

const STORAGE_KEY = 'stock-tracker-trades';
const PINNED_TAGS_KEY = 'stock-tracker-pinned-tags';

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [pinnedTags, setPinnedTags] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(PINNED_TAGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 同步到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem(PINNED_TAGS_KEY, JSON.stringify(pinnedTags));
  }, [pinnedTags]);

  const togglePinTag = (tag: string) => {
    setPinnedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addTrade = (trade: Trade) => {
    setTrades(prev => [...prev, trade]);
  };

  const updateTrade = (id: string, updates: Partial<Trade>) => {
    setTrades(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deleteTrade = (id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const batchDeleteTrades = (ids: string[]) => {
    setTrades(prev => prev.filter(t => !ids.includes(t.id)));
  };

  const clearAllTrades = () => {
    setTrades([]);
  };

  const importTrades = (newTrades: Trade[]) => {
    // 简单的合并逻辑，可以根据 ID 去重
    setTrades(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const filteredNew = newTrades.filter(t => !existingIds.has(t.id));
      return [...prev, ...filteredNew];
    });
  };

  const allTags = Array.from(new Set(trades.flatMap(t => t.tags || []))).sort();

  return {
    trades,
    allTags,
    pinnedTags,
    addTrade,
    updateTrade,
    deleteTrade,
    batchDeleteTrades,
    importTrades,
    clearAllTrades,
    togglePinTag,
  };
}
