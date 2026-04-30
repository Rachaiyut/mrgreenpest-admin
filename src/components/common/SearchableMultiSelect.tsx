import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlassIcon } from '../../assets/icons/Icons';

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface SearchableMultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'ค้นหา...',
  label,
  required = false,
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = useCallback(() => {
    if (triggerRef.current && isOpen) {
      const rect = triggerRef.current.getBoundingClientRect();
      const minWidth = 280;
      const desiredWidth = Math.max(rect.width, minWidth);
      const maxAllowed = window.innerWidth - rect.left - 8;
      const width = Math.min(desiredWidth, maxAllowed);
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width,
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

  const selectedLabels = safeOptions
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);

  const displayLabel =
    selectedLabels.length > 0
      ? selectedLabels.join(', ')
      : placeholder;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideTrigger =
        triggerRef.current && !triggerRef.current.contains(target);
      const isOutsideDropdown =
        wrapperRef.current && !wrapperRef.current.contains(target);

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
    if (!isOpen && search !== '') {
      setSearch('');
    }
  }, [isOpen, search]);

  const filteredOptions = safeOptions.filter(
    (option) =>
      (option.label &&
        option.label.toLowerCase().includes(search.toLowerCase())) ||
      (option.description &&
        option.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div ref={triggerRef} className="relative" onClick={handleToggle}>
        <div
          className={`block w-full rounded-md border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary text-sm leading-6 min-h-[38px] transition-colors
            ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white cursor-pointer'}
            ${value.length === 0 && !disabled ? 'text-slate-400' : ''}`}
        >
          <span className="block truncate">{displayLabel}</span>
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

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={wrapperRef}
            style={dropdownStyle}
            className="rounded-md bg-white text-base shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none text-sm flex flex-col max-h-60 overflow-hidden"
          >
            <div className="flex-shrink-0 bg-white px-2 py-2 border-b border-slate-200">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full rounded-md border-0 py-1.5 pl-8 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary text-sm leading-6"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <div
                      key={`${option.value}-${index}`}
                      className={`relative cursor-default select-none py-2 pl-3 pr-9 hover:bg-slate-100 ${isSelected ? 'bg-primary/10' : 'text-slate-900'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOptionClick(option.value);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <span className={`block truncate ${isSelected ? 'text-primary font-semibold' : ''}`} title={option.label}>
                          {option.label}
                        </span>
                      </div>
                      {option.description && (
                        <span className="block truncate text-xs text-slate-500 ml-6" title={option.description}>
                          {option.description}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-2 pl-3 pr-9 text-slate-500 italic">
                  ไม่พบข้อมูล
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
