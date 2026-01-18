import type { AISettings } from '../types';

export const DEFAULT_AI_SETTINGS: AISettings = {
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  temperature: 0.7,
  useDeepThinking: false,
  enableWebSearch: true,
};

export function getAISettings(): AISettings {
  const saved = localStorage.getItem('ai_settings');
  if (saved) {
    try {
      return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      return DEFAULT_AI_SETTINGS;
    }
  }
  return DEFAULT_AI_SETTINGS;
}

export function saveAISettings(settings: AISettings) {
  localStorage.setItem('ai_settings', JSON.stringify(settings));
}

export async function chatWithAI(messages: { role: string; content: string }[]) {
  const settings = getAISettings();
  
  if (!settings.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  // 根据设置动态选择模型
  const targetModel = settings.useDeepThinking ? 'deepseek-reasoner' : settings.model;

  const response = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: targetModel,
      messages,
      temperature: settings.useDeepThinking ? 1.0 : settings.temperature, // 深度思考建议 1.0
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `请求失败: ${response.status}`);
  }

  const data = await response.json();
  const choice = data.choices[0].message;
  
  return {
    content: choice.content,
    reasoning_content: choice.reasoning_content || null
  };
}
