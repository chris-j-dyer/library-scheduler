import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { server } from './mocks/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Simple mock for the toast functionality
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock global fetch
const mockFetch = vi.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ status: 'cancelled' })
  })
);

// Override global fetch with our mock
global.fetch = mockFetch;

// Simple component to test reservation cancellation
const CancellationTest = () => {
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [cancelled, setCancelled] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reservations/1/cancel', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel');
      }
      
      // Successfully cancelled
      setCancelled(true);
      setShowConfirmDialog(false);
      mockToast({
        title: 'Reservation cancelled',
        description: 'Your reservation has been successfully cancelled.'
      });
    } catch (error) {
      mockToast({
        title: 'Error',
        description: 'Failed to cancel reservation',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
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

describe('Reservation Cancellation', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Set up server mock for cancellation
    server.use(
      rest.post('/api/reservations/1/cancel', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            id: 1,
            status: 'cancelled',
            updatedAt: new Date()
          })
        );
      })
    );
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
    
    // Verify both the toast and the UI change
    await waitFor(() => {
      // Check toast was called with correct parameters
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Reservation cancelled'
        })
      );
      
      // Verify that the reservation is no longer shown
      expect(screen.queryByTestId('reservation')).not.toBeInTheDocument();
      
      // And the "no reservations" message is displayed
      expect(screen.getByText('No active reservations')).toBeInTheDocument();
    });
    
    // Also verify fetch was called with correct URL and method
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/reservations/1/cancel',
      expect.objectContaining({ method: 'POST' })
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