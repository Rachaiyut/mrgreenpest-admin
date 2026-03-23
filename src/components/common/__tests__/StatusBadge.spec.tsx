import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@/src/test/test-utils';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('should render DRAFT as จัดทำ', () => {
    render(<StatusBadge status="DRAFT" />);
    expect(screen.getByText('จัดทำ')).toBeDefined();
  });

  it('should render APPROVED as อนุมัติ', () => {
    render(<StatusBadge status="APPROVED" />);
    expect(screen.getByText('อนุมัติ')).toBeDefined();
  });

  it('should render CANCELLED as ยกเลิก', () => {
    render(<StatusBadge status="CANCELLED" />);
    expect(screen.getByText('ยกเลิก')).toBeDefined();
  });

  it('should render PENDING_APPROVAL as รออนุมัติ', () => {
    render(<StatusBadge status="PENDING_APPROVAL" />);
    expect(screen.getByText('รออนุมัติ')).toBeDefined();
  });

  it('should render COMPLETED as เสร็จสิ้น', () => {
    render(<StatusBadge status="COMPLETED" />);
    expect(screen.getByText('เสร็จสิ้น')).toBeDefined();
  });

  it('should render unknown status as-is', () => {
    render(<StatusBadge status="UNKNOWN_STATUS" />);
    expect(screen.getByText('UNKNOWN_STATUS')).toBeDefined();
  });
});
