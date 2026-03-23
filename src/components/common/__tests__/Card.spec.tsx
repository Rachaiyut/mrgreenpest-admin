import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@/src/test/test-utils';
import { Card } from '../Card';

describe('Card', () => {
  it('should render with title', () => {
    render(<Card title="ข้อมูลลูกค้า">Content here</Card>);
    expect(screen.getByText('ข้อมูลลูกค้า')).toBeDefined();
  });

  it('should render children', () => {
    render(
      <Card title="Test">
        <p data-testid="child">เนื้อหาภายใน Card</p>
      </Card>
    );
    expect(screen.getByTestId('child')).toBeDefined();
    expect(screen.getByText('เนื้อหาภายใน Card')).toBeDefined();
  });
});
