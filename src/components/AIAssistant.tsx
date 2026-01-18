import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, Settings, Send, Bot, User, ChevronRight, MessageSquare } from 'lucide-react';
import type { Position, Message, Conversation } from '../types';
import { formatMoney, formatPercent } from '../utils/calculations';
import { chatWithAI, getAISettings } from '../utils/aiService';
import { AISettingsModal } from './AISettingsModal';
import './AIAssistant.css';

interface AIAssistantProps {
  positions: Position[];
  totals: {
    totalCost: number;
    totalMarketValue: number | null;
    totalProfitLoss: number | null;
    totalProfitLossPercent: number | null;
  };
  pendingAnalysis?: {
    positions: Position[];
    totals: any;
  } | null;
  onAnalysisComplete?: () => void;
}

export function AIAssistant({ positions, totals, pendingAnalysis, onAnalysisComplete }: AIAssistantProps) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('ai_conversations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  const [activeId, setActiveId] = useState<string | null>(() => {
    const savedActiveId = localStorage.getItem('ai_active_conversation_id');
    return savedActiveId || null;
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(() => 
    conversations.find(c => c.id === activeId) || null, 
    [conversations, activeId]
  );

  const messages = activeConversation?.messages || [];

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // 持久化
  useEffect(() => {
    localStorage.setItem('ai_conversations', JSON.stringify(conversations));
    if (activeId) {
      localStorage.setItem('ai_active_conversation_id', activeId);
    }
  }, [conversations, activeId]);

  // 当有待分析数据时，自动触发分析
  useEffect(() => {
    if (pendingAnalysis) {
      const summary = getPortfolioSummary(pendingAnalysis.positions, pendingAnalysis.totals);
      
      let targetId = activeId;
      if (!targetId || !activeConversation) {
        targetId = handleNewChat('交易分析');
      }
      
      handleSend(summary, targetId);
      onAnalysisComplete?.();
    }
  }, [pendingAnalysis]);

  const handleNewChat = (title: string = '新对话') => {
    const newId = Date.now().toString();
    const newConversation: Conversation = {
      id: newId,
      title,
      messages: [],
      updatedAt: Date.now()
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveId(newId);
    return newId;
  };

  const handleSwitchChat = (id: string) => {
    setActiveId(id);
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个对话吗？')) {
      const newConversations = conversations.filter(c => c.id !== id);
      setConversations(newConversations);
      if (activeId === id) {
        setActiveId(newConversations.length > 0 ? newConversations[0].id : null);
      }
    }
  };

  const getPortfolioSummary = (customPositions?: Position[], customTotals?: any) => {
    const targetPositions = customPositions || positions;
    const targetTotals = customTotals || totals;

    const stockList = targetPositions.map(p => 
      `- ${p.stockName} (${p.stockCode}): 持仓数量 ${p.totalQuantity}, 成本价 ¥${p.averageCost.toFixed(3)}, 当前盈亏 ${formatPercent(p.profitLossPercent)}`
    ).join('\n');

    const header = customPositions 
      ? `### 选中交易分析汇总\n- 总成本：¥${formatMoney(targetTotals.totalCost)}\n- 当前市值：¥${formatMoney(targetTotals.totalMarketValue)}\n- 总盈亏：¥${formatMoney(targetTotals.totalProfitLoss)} (${formatPercent(targetTotals.totalProfitLossPercent)})`
      : `请分析我的当前持仓汇总并给出建议：`;

    return `${header}\n${stockList}${customPositions ? '\n\n请针对以上选中的交易记录进行详细分析，包括成本分布、盈亏原因及后续操作建议。' : ''}`;
  };

  const systemPrompt = useMemo(() => {
    const settings = getAISettings();
    let prompt = `你是一个专业的投资顾问助手。你的任务是基于用户的持仓数据提供分析建议。
你的回复应该专业、客观、严谨，同时包含风险提示。

请务必遵循以下格式规范：
1. 使用 **加粗** 来突出关键词、股票名称、重要数值或核心结论。
2. 使用 - 或 * 开头的列表来组织多项分析或建议。
3. 保持段落清晰，重要建议前可以使用数字或符号。
4. 使用 ### 开头表示三级标题。

当前用户持仓概况：
- 总资产：¥${formatMoney(totals.totalMarketValue)}
- 总盈亏：¥${formatMoney(totals.totalProfitLoss)} (${formatPercent(totals.totalProfitLossPercent)})
- 持仓品种数：${positions.length}
`;
    if (settings.enableWebSearch) {
      prompt += `\n你已启用联网搜索功能，请在回答时参考最新的市场行情和资讯。`;
    }
    return prompt;
  }, [totals, positions]);

  const handleSend = async (text: string = input, targetConversationId: string | null = activeId) => {
    const messageText = text.trim();
    if (!messageText) return;

    let currentId = targetConversationId;
    if (!currentId) {
      currentId = handleNewChat();
    }

    const userMessage: Message = { role: 'user', content: messageText };
    
    // 更新 UI 显示用户消息
    setConversations(prev => prev.map(c => {
      if (c.id === currentId) {
        const newMessages = [...c.messages, userMessage];
        const newTitle = c.messages.length === 0 ? (messageText.slice(0, 15) + (messageText.length > 15 ? '...' : '')) : c.title;
        return { ...c, messages: newMessages, title: newTitle, updatedAt: Date.now() };
      }
      return c;
    }));

    if (currentId === activeId) setInput('');
    setIsTyping(true);

    try {
      // 获取当前对话的历史
      const currentConv = conversations.find(c => c.id === currentId);
      const history = currentConv ? currentConv.messages : [];
      
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...history,
        userMessage
      ];

      const result = await chatWithAI(apiMessages.map(m => ({ role: m.role, content: m.content })));
      
      setConversations(prev => prev.map(c => {
        if (c.id === currentId) {
          const assistantMsg: Message = { 
            role: 'assistant', 
            content: result.content,
            reasoning_content: result.reasoning_content 
          };
          return { 
            ...c, 
            messages: [...c.messages, assistantMsg],
            updatedAt: Date.now()
          };
        }
        return c;
      }));
    } catch (error: any) {
      setConversations(prev => prev.map(c => {
        if (c.id === currentId) {
          return { 
            ...c, 
            messages: [...c.messages, { role: 'assistant', content: `错误: ${error.message || '调用 API 失败'}` }],
            updatedAt: Date.now()
          };
        }
        return c;
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const formatAIResponse = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="ai-bold">{part.slice(2, -2)}</strong>;
      }
      const codeParts = part.split(/(`.*?`)/g);
      return codeParts.map((codePart, j) => {
        if (codePart.startsWith('`') && codePart.endsWith('`')) {
          return <code key={`${i}-${j}`} className="ai-code">{codePart.slice(1, -1)}</code>;
        }
        return codePart;
      });
    });
  };

  const renderMessageContent = (msg: Message) => {
    return (
      <div className="bubble">
        {msg.reasoning_content && (
          <details className="reasoning-block" open>
            <summary>
              <ChevronRight size={14} className="reasoning-chevron" />
              深度思考过程
            </summary>
            <div className="reasoning-content">
              {msg.reasoning_content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </details>
        )}
        {(() => {
          const lines = msg.content.split('\n');
          const elements: React.ReactNode[] = [];
          let textBuffer: string[] = [];

          const flushBuffer = (key: string) => {
            if (textBuffer.length > 0) {
              elements.push(
                <div key={`p-${key}`} className="ai-paragraph">
                  {formatAIResponse(textBuffer.join(' '))}
                </div>
              );
              textBuffer = [];
            }
          };

          lines.forEach((line, j) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('### ')) {
              flushBuffer(`h-${j}`);
              elements.push(<h3 key={j} className="ai-h3">{formatAIResponse(trimmed.substring(4))}</h3>);
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              flushBuffer(`l-${j}`);
              elements.push(
                <div key={j} className="list-item">
                  <span className="list-bullet">•</span>
                  <span>{formatAIResponse(trimmed.substring(2))}</span>
                </div>
              );
            } else if (!trimmed) {
              flushBuffer(`g-${j}`);
              elements.push(<div key={j} className="ai-gap" />);
            } else {
              textBuffer.push(line);
            }
          });
          flushBuffer('end');
          return elements;
        })()}
      </div>
    );
  };

  return (
    <div className="ai-assistant-container">
      <div className="ai-sidebar">
        <button className="new-chat-btn" onClick={() => handleNewChat()}>
          <Plus size={18} /> 新建对话
        </button>
        <div className="conversation-list">
          {conversations.map(conv => (
            <div 
              key={conv.id} 
              className={`conv-item ${activeId === conv.id ? 'active' : ''}`}
              onClick={() => handleSwitchChat(conv.id)}
            >
              <MessageSquare size={14} className="conv-icon" />
              <span className="conv-title" title={conv.title}>{conv.title}</span>
              <button className="conv-delete" onClick={(e) => handleDeleteChat(conv.id, e)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="ai-main">
        <div className="ai-card">
          <div className="ai-header">
            <div className="ai-title-group">
              <span className="ai-status-dot"></span>
              <h3>{activeConversation?.title || 'AI 投资顾问'}</h3>
            </div>
            <div className="ai-header-actions">
              <button 
                className="quick-analyze-btn" 
                onClick={() => handleSend(getPortfolioSummary())}
                disabled={positions.length === 0 || isTyping || !activeId}
              >
                分析持仓
              </button>
            </div>
          </div>

          <div className="chat-window" ref={scrollRef}>
            {!activeId || messages.length === 0 ? (
              <div className="chat-empty">
                <div className="ai-avatar-large">
                  <Bot size={48} strokeWidth={1.5} />
                </div>
                <h4>我是您的私人投资助手</h4>
                <p>您可以向我咨询持仓情况，或了解市场动态</p>
                <div className="suggested-questions">
                  <button onClick={() => handleSend("分析我的持仓风险")}>风险评估</button>
                  <button onClick={() => handleSend("现在的行情如何？")}>市场行情</button>
                </div>
              </div>
            ) : (
              <div className="message-list">
                {messages.map((msg, i) => (
                  <div key={i} className={`message-row ${msg.role}`}>
                    <div className="avatar">
                      {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                    </div>
                    <div className="message-content">
                      {renderMessageContent(msg)}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="message-row assistant">
                    <div className="avatar"><Bot size={20} /></div>
                    <div className="message-content">
                      <div className="bubble typing">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="chat-input-wrapper">
            <button 
              className="settings-toggle-btn" 
              onClick={() => setShowSettings(true)}
              title="AI 设置"
            >
              <Settings size={20} />
            </button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={activeId ? "输入您的问题 (Shift+Enter 换行)" : "请先开启新对话"}
              rows={1}
              disabled={!activeId}
            />
            <button 
              className="send-btn" 
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping || !activeId}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <AISettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
