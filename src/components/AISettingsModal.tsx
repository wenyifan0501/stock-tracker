import { useState } from 'react';
import type { AISettings } from '../types';
import { getAISettings, saveAISettings } from '../utils/aiService';
import './AISettingsModal.css';

interface AISettingsModalProps {
  onClose: () => void;
}

export function AISettingsModal({ onClose }: AISettingsModalProps) {
  const [settings, setSettings] = useState<AISettings>(getAISettings());

  const handleSave = () => {
    saveAISettings(settings);
    onClose();
  };

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={e => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h3>AI 助手设置</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-form">
          <div className="form-group">
            <label>API Key</label>
            <input 
              type="password" 
              value={settings.apiKey} 
              onChange={e => setSettings({...settings, apiKey: e.target.value})}
              placeholder="DeepSeek API Key"
            />
          </div>

          <div className="form-group">
            <label>Base URL</label>
            <input 
              type="text" 
              value={settings.baseUrl} 
              onChange={e => setSettings({...settings, baseUrl: e.target.value})}
              placeholder="https://api.deepseek.com/v1"
            />
          </div>

          <div className="form-group">
            <label>Model</label>
            <input 
              type="text" 
              value={settings.model} 
              onChange={e => setSettings({...settings, model: e.target.value})}
              placeholder="deepseek-chat"
            />
          </div>

          <div className="form-group">
            <label>Temperature ({settings.temperature})</label>
            <input 
              type="range" 
              min="0" 
              max="2" 
              step="0.1"
              value={settings.temperature} 
              onChange={e => setSettings({...settings, temperature: parseFloat(e.target.value)})}
            />
          </div>

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label className="switch-label">
                <input 
                  type="checkbox" 
                  checked={settings.useDeepThinking} 
                  onChange={e => setSettings({...settings, useDeepThinking: e.target.checked})}
                />
                <span>深度思考 (R1)</span>
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label className="switch-label">
                <input 
                  type="checkbox" 
                  checked={settings.enableWebSearch} 
                  onChange={e => setSettings({...settings, enableWebSearch: e.target.checked})}
                />
                <span>联网搜索</span>
              </label>
            </div>
          </div>
        </div>

        <div className="settings-modal-footer">
          <button className="secondary-btn" onClick={onClose}>取消</button>
          <button className="primary-btn" onClick={handleSave}>保存设置</button>
        </div>
      </div>
    </div>
  );
}
