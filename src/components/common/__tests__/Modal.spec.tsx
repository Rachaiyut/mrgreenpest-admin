import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@/src/test/test-utils';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="ทดสอบ Modal">
        <p>เนื้อหา</p>
      </Modal>
    );
    expect(screen.getByText('ทดสอบ Modal')).toBeDefined();
    expect(screen.getByText('เนื้อหา')).toBeDefined();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()} title="ซ่อนอยู่">
        <p>ซ่อน</p>
      </Modal>
    );
    expect(container.innerHTML).toBe('');
  });

  it('should display title', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="หัวข้อทดสอบ">
        <p>content</p>
      </Modal>
    );
    expect(screen.getByText('หัวข้อทดสอบ')).toBeDefined();
  });

  it('should call onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>content</p>
      </Modal>
    );
    // The modal has a close button and a default footer "ปิด" button
    const closeButtons = screen.getAllByRole('button');
    closeButtons[0].click();
    expect(onClose).toHaveBeenCalled();
  });
});
