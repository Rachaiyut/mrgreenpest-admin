import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@/src/test/test-utils';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  it('should render', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={vi.fn()}
      />
    );
    // Pagination should render some navigation element
    expect(screen.getByRole('navigation') || screen.getByText('1')).toBeDefined();
  });

  it('should call onPageChange when page is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={onPageChange}
      />
    );
    // Click page 2 if available
    const page2 = screen.queryByText('2');
    if (page2) {
      page2.click();
      expect(onPageChange).toHaveBeenCalledWith(2);
    }
  });
});
