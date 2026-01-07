import React from 'react';
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

  if (totalItems <= itemsPerPage) {
    // Hide if there's no need for pagination at all
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

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    onItemsPerPageChange(Number(e.target.value));
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

    // Always show first page
    pageNumbers.push(1);

    // Ellipsis logic
    if (currentPage > 3) {
      pageNumbers.push('...');
    }

    // Pages around current page
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    // Ellipsis logic
    if (currentPage < totalPages - 2) {
      pageNumbers.push('...');
    }

    // Always show last page
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
            <label htmlFor="items-per-page" className="text-sm text-slate-700">
              แสดง:
            </label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="block w-auto pl-2 pr-7 py-1 text-sm bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value={totalItems}>ทั้งหมด</option>
            </select>
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
          {totalPages > 1 && (
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
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
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};
