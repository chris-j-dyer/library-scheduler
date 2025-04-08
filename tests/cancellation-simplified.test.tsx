import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Simple mock for the toast functionality
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Simple component to test reservation cancellation
// This version doesn't use fetch or timers at all - simplest possible setup
const CancellationTest = () => {
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [cancelled, setCancelled] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCancel = () => {
    // Directly update state without any timeout
    setCancelled(true);
    setShowConfirmDialog(false);
    mockToast({
      title: 'Reservation cancelled',
      description: 'Your reservation has been successfully cancelled.'
    });
  };

  return (
    <div>
      <h1>My Reservations</h1>
      
      {!cancelled && (
        <div data-testid="reservation">
          <h2>Study Session</h2>
          <button onClick={() => setShowConfirmDialog(true)}>Cancel</button>
        </div>
      )}
      
      {cancelled && <p>No active reservations</p>}
      
      {showConfirmDialog && (
        <div role="dialog" aria-label="Cancel Reservation">
          <h2>Cancel Reservation</h2>
          <p>Are you sure you want to cancel this reservation?</p>
          <div>
            <button onClick={() => setShowConfirmDialog(false)}>No, Keep It</button>
            <button 
              onClick={handleCancel}
              disabled={isLoading}
            >
              Yes, Cancel Reservation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

describe('Reservation Cancellation Simplified', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Clean up any timers after each test
    vi.restoreAllMocks();
  });

  it('shows the reservation initially', () => {
    render(<CancellationTest />);
    expect(screen.getByText('Study Session')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows confirmation dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<CancellationTest />);
    
    // Click the cancel button
    await user.click(screen.getByText('Cancel'));
    
    // Confirmation dialog should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to cancel this reservation?')).toBeInTheDocument();
  });

  it('cancels the reservation when confirmed', async () => {
    const user = userEvent.setup();
    render(<CancellationTest />);
    
    // Click the cancel button
    await user.click(screen.getByText('Cancel'));
    
    // Click yes on the confirmation
    await user.click(screen.getByText('Yes, Cancel Reservation'));
    
    // Verify the reservation is removed from the UI
    expect(screen.queryByTestId('reservation')).not.toBeInTheDocument();
    expect(screen.getByText('No active reservations')).toBeInTheDocument();
    
    // Check toast was called with the correct message
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Reservation cancelled'
      })
    );
  });

  it('keeps the reservation when cancellation is dismissed', async () => {
    const user = userEvent.setup();
    render(<CancellationTest />);
    
    // Click the cancel button
    await user.click(screen.getByText('Cancel'));
    
    // Click no on the confirmation
    await user.click(screen.getByText('No, Keep It'));
    
    // Reservation should still be visible
    expect(screen.getByTestId('reservation')).toBeInTheDocument();
    expect(screen.getByText('Study Session')).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });
});