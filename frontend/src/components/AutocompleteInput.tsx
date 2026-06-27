import { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  storageKey: string; // unique key for localStorage history
  suggestions?: string[]; // extra suggestions (e.g. connected wallet, current product ID)
}

const HISTORY_LIMIT = 20;

function getHistory(key: string): string[] {
  try {
    const raw = localStorage.getItem(`ac_${key}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToHistory(key: string, value: string) {
  if (!value.trim()) return;
  const history = getHistory(key);
  const filtered = history.filter(h => h !== value);
  filtered.unshift(value);
  localStorage.setItem(`ac_${key}`, JSON.stringify(filtered.slice(0, HISTORY_LIMIT)));
}

export default function AutocompleteInput({ 
  value, 
  onChange, 
  placeholder, 
  className = '', 
  storageKey,
  suggestions = [] 
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(getHistory(storageKey));
  }, [storageKey]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Merge history + extra suggestions, dedupe
  const allSuggestions = [...new Set([...suggestions, ...history])].filter(Boolean);
  
  // Filter by current input
  const filtered = value.trim()
    ? allSuggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s !== value)
    : allSuggestions.filter(s => s !== value);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const handleBlur = () => {
    // Save to history on blur if value is non-empty
    if (value.trim()) {
      saveToHistory(storageKey, value.trim());
      setHistory(getHistory(storageKey));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter' && value.trim()) {
      saveToHistory(storageKey, value.trim());
      setHistory(getHistory(storageKey));
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#000000] border border-border-subtle rounded-[18px] shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-3 text-[10px] uppercase tracking-[0.1em] text-tertiary border-b border-border-subtle font-semibold">
            Recent & Suggestions
          </div>
          {filtered.map((item, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => e.preventDefault()} // prevent blur before click
              onClick={() => handleSelect(item)}
              className="w-full text-left px-4 py-3 text-[14px] font-mono text-secondary hover:bg-bg-surface-elevated hover:text-primary transition-colors truncate cursor-pointer flex items-center gap-3"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" className="text-tertiary shrink-0">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              {item.length > 50 ? item.substring(0, 20) + '...' + item.substring(item.length - 20) : item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
