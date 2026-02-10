import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlassIcon } from '../../assets/icons/Icons';

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  name?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options = [],
  value,
  onChange,
  onSearchChange,
  placeholder = 'Select...',
  label,
  required = false,
  name,
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Keep track of the selected label even if it's not in the options anymore
  const [persistedLabel, setPersistedLabel] = useState('');

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = useCallback(() => {
    if (triggerRef.current && isOpen) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
    }
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [isOpen, updateDropdownPosition]);

  const safeOptions = options || [];
  const selectedOption = safeOptions.find((o) => o.value === value);

  useEffect(() => {
    if (selectedOption) {
      setPersistedLabel(selectedOption.label);
    }
  }, [selectedOption]);

  const displayLabel = selectedOption ? selectedOption.label : (value ? persistedLabel : placeholder);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
      const isOutsideDropdown = wrapperRef.current && !wrapperRef.current.contains(target);

      if (isOutsideTrigger && isOutsideDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      // Reset search when closed
      setSearch('');
      onSearchChange?.('');
    }
  }, [isOpen, onSearchChange]);

  const filteredOptions = safeOptions.filter(
    (option) =>
      (option.label && option.label.toLowerCase().includes(search.toLowerCase())) ||
      (option.description &&
        option.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div
        ref={triggerRef}
        className="relative"
        onClick={handleToggle}
      >
        <div
          className={`block w-full rounded-md border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 min-h-[38px] transition-colors
            ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white cursor-pointer'} 
            ${!selectedOption && !value && !disabled ? 'text-slate-400' : ''}`}
        >
          {displayLabel}
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className={`h-5 w-5 ${disabled ? 'text-slate-300' : 'text-gray-400'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && createPortal(
        <div
          ref={wrapperRef}
          style={dropdownStyle}
          className="max-h-60 overflow-auto rounded-md bg-white py-1 text-base shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
        >
          <div className="sticky top-0 bg-white px-2 py-1.5 border-b border-gray-100">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full rounded-md border-0 py-1.5 pl-8 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                placeholder="ค้นหา..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  onSearchChange?.(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                className={`relative cursor-default select-none py-2 pl-3 pr-9 hover:bg-slate-100 ${option.value === value ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-900'}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span className="block break-words">{option.label}</span>
                {option.description && (
                  <span className="block break-words text-xs text-slate-500">
                    {option.description}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="py-2 pl-3 pr-9 text-slate-500 italic">
              ไม่พบข้อมูล
            </div>
          )}
        </div>,
        document.body
      )}
      {/* Hidden input for form submission validation */}
      <input
        type="text"
        name={name}
        value={value || ''}
        required={required}
        readOnly
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        style={{
          opacity: 0,
          width: 0,
          height: 0,
          position: 'absolute',
          bottom: 0,
          zIndex: -1,
        }}
      />
    </div>
  );
};
