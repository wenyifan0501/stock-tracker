// 交易类型：买入或卖出
export type TradeType = 'buy' | 'sell';

// 单笔交易记录
export interface Trade {
  id: string;
  stockCode: string;      // 股票代码，如 "600519" 或 "AAPL"
  stockName: string;      // 股票名称
  type: TradeType;        // 买入/卖出
  price: number;          // 成交价格
  quantity: number;       // 成交数量（股）
  date: string;           // 成交时间 ISO 格式
  commission?: number;    // 手续费（可选）
  tags?: string[];        // 标签
}

// 单只股票的持仓汇总
export interface Position {
  stockCode: string;
  stockName: string;
  totalQuantity: number;       // 持有股数
  totalCost: number;           // 总成本
  averageCost: number;         // 平均成本
  currentPrice: number | null; // 当前价格
  marketValue: number | null;  // 市值
  profitLoss: number | null;   // 浮动盈亏
  profitLossPercent: number | null; // 浮动盈亏百分比
}

// 股票实时行情
export interface StockQuote {
  code: string;
  name: string;
  price: number;
  change: number;        // 涨跌额
  changePercent: number; // 涨跌幅
}

// AI 助手设置
export interface AISettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  useDeepThinking: boolean;
  enableWebSearch: boolean;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning_content?: string | null;
  isThinking?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
