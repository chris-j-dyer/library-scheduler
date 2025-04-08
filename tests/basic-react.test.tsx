import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

const TestComponent = () => {
  return <div>Test Component Works</div>;
};

describe('Basic React Test', () => {
  it('renders a component correctly', () => {
    render(<TestComponent />);
    expect(screen.getByText('Test Component Works')).toBeInTheDocument();
  });
});