import { useState, useRef, useEffect } from 'react';
import './TagInput.css';

interface TagInputProps {
  tags: string[];
  allExistingTags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, allExistingTags, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = allExistingTags.filter(
    tag => 
      tag.toLowerCase().includes(inputValue.toLowerCase()) && 
      !tags.includes(tag)
  );

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue) {
        handleAddTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1]);
    }
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
    <div className="tag-input-container" ref={dropdownRef}>
      <div className="tag-input-box">
        {tags.map(tag => (
          <span key={tag} className="tag-pill">
            {tag}
            <button type="button" onClick={() => handleRemoveTag(tag)}>×</button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "输入标签..." : ""}
        />
      </div>

      {showSuggestions && (inputValue || filteredSuggestions.length > 0) && (
        <div className="tag-suggestions">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map(suggestion => (
              <div
                key={suggestion}
                className="suggestion-item"
                onClick={() => handleAddTag(suggestion)}
              >
                {suggestion}
              </div>
            ))
          ) : (
            inputValue && !tags.includes(inputValue) && (
              <div className="suggestion-item new-tag" onClick={() => handleAddTag(inputValue)}>
                添加新标签: "{inputValue}"
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
