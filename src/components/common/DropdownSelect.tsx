import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  error?: boolean;
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'เลือก...',
  className,
  disabled = false,
  name,
  required = false,
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !isOpen) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 160);
    const maxWidth = window.innerWidth - rect.left - 8;
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.min(width, maxWidth),
      zIndex: 9999,
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;
  const isPlaceholder = !options.some((o) => o.value === value);

  return (
    <div className={`relative ${className || ''}`}>
      <div
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-md shadow-sm text-sm h-10 transition-colors
          ${disabled
            ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed'
            : error
              ? 'bg-red-50/50 border-red-500 cursor-pointer hover:border-red-400'
              : 'bg-white border-slate-300 cursor-pointer hover:border-slate-400'
          }
          ${disabled ? '' : isPlaceholder ? 'text-slate-400' : 'text-slate-900'}
          ${isOpen ? 'ring-2 ring-primary border-primary' : ''}
        `}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          className={`h-4 w-4 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''} ${disabled ? 'text-slate-300' : 'text-slate-400'}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {isOpen && !disabled && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="rounded-md bg-white shadow-xl ring-1 ring-black/10 text-sm max-h-60 overflow-auto"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`relative cursor-pointer select-none px-3 py-2.5 pr-9 hover:bg-slate-50 active:bg-slate-100
                  ${isSelected ? 'bg-primary/5 text-primary font-medium' : 'text-slate-700'}
                `}
              >
                <span className="block truncate">{option.label}</span>
                {isSelected && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
      {name && (
        <input
          type="text"
          name={name}
          value={value || ''}
          required={required}
          readOnly
          disabled={disabled}
          className="sr-only"
          tabIndex={-1}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute', bottom: 0, zIndex: -1 }}
        />
      )}
    </div>
  );
};
