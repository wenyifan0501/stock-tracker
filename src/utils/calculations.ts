import type { Trade, Position } from '../types';

/**
 * 根据交易记录计算各股票持仓
 * 使用加权平均法计算成本
 */
export function calculatePositions(
  trades: Trade[],
  currentPrices: Map<string, number>
): Position[] {
  const positionMap = new Map<string, {
    stockCode: string;
    stockName: string;
    totalQuantity: number;
    totalCost: number;
  }>();

  // 按时间排序处理交易
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const trade of sortedTrades) {
    const key = trade.stockCode;
    const existing = positionMap.get(key) || {
      stockCode: trade.stockCode,
      stockName: trade.stockName,
      totalQuantity: 0,
      totalCost: 0,
    };

    if (trade.type === 'buy') {
      // 买入：增加持仓和成本
      existing.totalCost += trade.price * trade.quantity + (trade.commission || 0);
      existing.totalQuantity += trade.quantity;
    } else {
      // 卖出：减少持仓，按比例减少成本
      if (existing.totalQuantity > 0) {
        const costPerShare = existing.totalCost / existing.totalQuantity;
        const soldQuantity = Math.min(trade.quantity, existing.totalQuantity);
        existing.totalCost -= costPerShare * soldQuantity;
        existing.totalQuantity -= soldQuantity;
      }
    }

    // 更新股票名称（使用最新的）
    existing.stockName = trade.stockName || existing.stockName;
    positionMap.set(key, existing);
  }

  // 转换为 Position 数组并计算浮盈
  const positions: Position[] = [];

  for (const [stockCode, data] of positionMap) {
    if (data.totalQuantity <= 0) continue; // 跳过已清仓的

    const currentPrice = currentPrices.get(stockCode) ?? null;
    const averageCost = data.totalQuantity > 0 
      ? data.totalCost / data.totalQuantity 
      : 0;

    let marketValue: number | null = null;
    let profitLoss: number | null = null;
    let profitLossPercent: number | null = null;

    if (currentPrice !== null) {
      marketValue = currentPrice * data.totalQuantity;
      profitLoss = marketValue - data.totalCost;
      profitLossPercent = data.totalCost > 0 
        ? (profitLoss / data.totalCost) * 100 
        : 0;
    }

    positions.push({
      stockCode,
      stockName: data.stockName,
      totalQuantity: data.totalQuantity,
      totalCost: data.totalCost,
      averageCost,
      currentPrice,
      marketValue,
      profitLoss,
      profitLossPercent,
    });
  }

  return positions;
}

/**
 * 计算总浮盈
 */
export function calculateTotalProfitLoss(positions: Position[]): {
  totalCost: number;
  totalMarketValue: number | null;
  totalProfitLoss: number | null;
  totalProfitLossPercent: number | null;
} {
  let totalCost = 0;
  let totalMarketValue = 0;
  let hasAnyPrice = false;

  for (const pos of positions) {
    totalCost += pos.totalCost;
    if (pos.marketValue !== null) {
      totalMarketValue += pos.marketValue;
      hasAnyPrice = true;
    }
  }

  if (positions.length === 0) {
    return { totalCost: 0, totalMarketValue: 0, totalProfitLoss: 0, totalProfitLossPercent: 0 };
  }

  const totalProfitLoss = hasAnyPrice ? totalMarketValue - totalCost : null;
  const totalProfitLossPercent = (hasAnyPrice && totalCost > 0) 
    ? (totalProfitLoss! / totalCost) * 100 
    : null;

  return {
    totalCost,
    totalMarketValue: hasAnyPrice ? totalMarketValue : null,
    totalProfitLoss,
    totalProfitLossPercent,
  };
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 格式化金额
 */
export function formatMoney(value: number | null): string {
  if (value === null) return '-';
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number | null): string {
  if (value === null) return '-';
  if (value === 0) return '0.00%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * 根据股票代码推断市场前缀
 */
export function getFullCode(code: string): string {
  const cleanCode = code.replace(/^(sh|sz|bj)/i, '');
  
  // 已经有前缀的直接返回
  if (/^(sh|sz|bj)/i.test(code)) {
    return code.toLowerCase();
  }
  
  // 根据代码特征判断市场
  if (cleanCode.startsWith('6')) {
    return `sh${cleanCode}`; // 上海主板
  } else if (cleanCode.startsWith('5')) {
    return `sh${cleanCode}`; // 上海 ETF/基金
  } else if (cleanCode.startsWith('0') || cleanCode.startsWith('3')) {
    return `sz${cleanCode}`; // 深圳主板/创业板
  } else if (cleanCode.startsWith('1')) {
    return `sz${cleanCode}`; // 深圳 ETF/LOF/债券
  } else if (cleanCode.startsWith('4') || cleanCode.startsWith('8')) {
    return `bj${cleanCode}`; // 北京
  }
  
  // 默认尝试深圳
  return `sz${cleanCode}`;
}

/**
 * 判断 A 股市场是否开盘
 * 开盘时间：周一至周五 9:30-11:30, 13:00-15:00
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  
  // 周六周日不开盘
  if (day === 0 || day === 6) return false;
  
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeValue = hour * 100 + minute;
  
  // 上午 9:30 - 11:30
  if (timeValue >= 930 && timeValue <= 1130) return true;
  
  // 下午 13:00 - 15:00
  if (timeValue >= 1300 && timeValue <= 1500) return true;
  
  return false;
}

export interface AnalysisPoint {
  date: string;
  cost: number;          // 当前交易的成本
  profit: number;        // 当前交易的理论盈亏（如果是卖出）
  cumulativeCost: number; // 累计总持仓成本
}

/**
 * 分析选中交易的历史变化
 */
export function analyzeTradeHistory(trades: Trade[]): AnalysisPoint[] {
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const points: AnalysisPoint[] = [];
  let currentCumulativeCost = 0;
  
  // 用于计算分步成本和盈亏的辅助 Map
  const stockInventory = new Map<string, { quantity: number, totalCost: number }>();

  for (const trade of sortedTrades) {
    const tradeDate = trade.date.split('T')[0];
    const tradeAmount = trade.price * trade.quantity;
    const inventory = stockInventory.get(trade.stockCode) || { quantity: 0, totalCost: 0 };
    
    let tradeProfit = 0;

    if (trade.type === 'buy') {
      const costBasis = tradeAmount + (trade.commission || 0);
      inventory.quantity += trade.quantity;
      inventory.totalCost += costBasis;
      currentCumulativeCost += costBasis;
    } else {
      if (inventory.quantity > 0) {
        const avgCost = inventory.totalCost / inventory.quantity;
        const soldQuantity = Math.min(trade.quantity, inventory.quantity);
        const costOfSold = avgCost * soldQuantity;
        
        tradeProfit = tradeAmount - (trade.commission || 0) - costOfSold;
        
        inventory.quantity -= soldQuantity;
        inventory.totalCost -= costOfSold;
        currentCumulativeCost -= costOfSold;
      }
    }

    stockInventory.set(trade.stockCode, inventory);

    points.push({
      date: tradeDate,
      cost: tradeAmount,
      profit: tradeProfit,
      cumulativeCost: currentCumulativeCost
    });
  }

  return points;
}
