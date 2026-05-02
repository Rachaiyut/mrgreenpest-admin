import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '../../assets/icons/Icons';
import { Button } from './FormControls';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (size: number) => void;
  className?: string;
}

interface ItemsPerPageDropdownProps {
  value: number;
  totalItems: number;
  onChange: (size: number) => void;
}

const ItemsPerPageDropdown: React.FC<ItemsPerPageDropdownProps> = ({
  value,
  totalItems,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    width: number;
    direction: 'down' | 'up';
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const options: { label: string; value: number }[] = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
    { label: 'ทั้งหมด', value: totalItems },
  ];

  const computePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = 220; // ประมาณความสูงของ menu
    const spaceBelow = window.innerHeight - rect.bottom;
    const direction: 'down' | 'up' = spaceBelow >= menuHeight + 8 ? 'down' : 'up';
    const top = direction === 'down' ? rect.bottom + 4 : rect.top - 4;
    setPos({
      left: rect.left,
      top,
      width: Math.max(rect.width, 96),
      direction,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleReposition = () => computePosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open]);

  const currentLabel =
    options.find((o) => o.value === value)?.label || String(value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-between gap-1.5 pl-2.5 pr-2 py-1 text-sm bg-white text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-w-[64px]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{currentLabel}</span>
        <svg
          className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              left: pos.left,
              top: pos.direction === 'down' ? pos.top : undefined,
              bottom:
                pos.direction === 'up'
                  ? window.innerHeight - pos.top
                  : undefined,
              minWidth: pos.width,
              zIndex: 9999,
            }}
            className="rounded-md border border-slate-200 bg-white shadow-lg py-1 max-h-[260px] overflow-auto"
          >
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={`${opt.label}-${opt.value}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 ${
                    selected ? 'text-primary font-semibold bg-primary/5' : 'text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className = '',
}) => {
  const totalPages =
    itemsPerPage > 0 ? Math.ceil(totalItems / itemsPerPage) : 1;

  if (totalItems === 0) {
    return null;
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pageNumbers: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
      return pageNumbers;
    }

    pageNumbers.push(1);

    if (currentPage > 3) {
      pageNumbers.push('...');
    }

    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    if (currentPage < totalPages - 2) {
      pageNumbers.push('...');
    }

    pageNumbers.push(totalPages);

    return pageNumbers;
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 sm:px-6 bg-white border-t border-slate-200 rounded-b-lg ${className}`}
    >
      <div className="flex-1 flex justify-between sm:hidden">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          ก่อนหน้า
        </Button>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          ถัดไป
        </Button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-x-4">
          <div className="flex items-center gap-x-2">
            <span className="text-sm text-slate-700">แสดง:</span>
            <ItemsPerPageDropdown
              value={itemsPerPage}
              totalItems={totalItems}
              onChange={onItemsPerPageChange}
            />
          </div>
          {totalItems > 0 && (
            <p className="text-sm text-slate-700">
              แสดง <span className="font-medium">{startItem}</span> -{' '}
              <span className="font-medium">{endItem}</span> จาก{' '}
              <span className="font-medium">{totalItems}</span>
            </p>
          )}
        </div>
        <div>
          <nav
            className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
            aria-label="Pagination"
          >
            <button
              onClick={handlePrevious}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            {getPageNumbers().map((page, index) =>
              typeof page === 'number' ? (
                <button
                  key={`${page}-${index}`}
                  onClick={() => onPageChange(page)}
                  aria-current={currentPage === page ? 'page' : undefined}
                  className={`relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium ${
                    currentPage === page
                      ? 'z-10 bg-primary/10 border-primary text-primary'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ) : (
                <span
                  key={`ellipsis-${index}`}
                  className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700"
                >
                  {page}
                </span>
              )
            )}
            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};
