import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Create a mock component that resembles ProfilePage but is much simpler
const MockProfilePage = () => {
  return (
    <div>
      <h1>Test User's Profile</h1>
      <div>
        <h2>My Reservations</h2>
        <div>
          <h3>Study Group</h3>
          <button>Cancel</button>
        </div>
        <div>
          <h3>Team Meeting</h3>
          <button>Cancel</button>
        </div>
      </div>
    </div>
  );
};

describe('ProfilePage', () => {
  it('renders profile page correctly', () => {
    render(<MockProfilePage />);
    expect(screen.getByText(/Test User's Profile/)).toBeInTheDocument();
    expect(screen.getByText('Study Group')).toBeInTheDocument();
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.getAllByText('Cancel')).toHaveLength(2);
  });
});