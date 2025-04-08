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

// Simple component to test reservation cancellation
const CancellationTest = () => {
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [cancelled, setCancelled] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      // Use fetch which is intercepted by MSW
      const response = await fetch('/api/reservations/1/cancel', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel');
      }
      
      const data = await response.json();
      
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
          <button data-testid="open-cancel-dialog" onClick={() => setShowConfirmDialog(true)}>
            Cancel
          </button>
        </div>
      )}
      
      {cancelled && <p data-testid="no-reservation-message">No active reservations</p>}
      
      {showConfirmDialog && (
        <div role="dialog" aria-label="Cancel Reservation" data-testid="cancel-dialog">
          <h2>Cancel Reservation</h2>
          <p>Are you sure you want to cancel this reservation?</p>
          <div>
            <button 
              data-testid="keep-reservation-btn"
              onClick={() => setShowConfirmDialog(false)}
            >
              No, Keep It
            </button>
            <button 
              data-testid="confirm-cancel-btn"
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
    
    // Set up server mock for cancellation endpoint
    server.use(
      rest.post('/api/reservations/1/cancel', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            id: 1,
            status: 'cancelled',
            updatedAt: new Date().toISOString()
          })
        );
      })
    );
  });

  it('shows the reservation initially', () => {
    render(<CancellationTest />);
    
    // Check reservation exists at start
    expect(screen.getByTestId('reservation')).toBeInTheDocument();
    expect(screen.getByText('Study Session')).toBeInTheDocument();
  });

  it('shows confirmation dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<CancellationTest />);
    
    // Open the dialog
    await user.click(screen.getByTestId('open-cancel-dialog'));
    
    // Verify dialog appears
    expect(screen.getByTestId('cancel-dialog')).toBeInTheDocument();
  });

  it('cancels the reservation when confirmed', async () => {
    // Create a manual mock for fetch to ensure we control the response cycle
    global.fetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'cancelled' })
      })
    );
  
    const user = userEvent.setup();
    render(<CancellationTest />);
    
    // Open cancel dialog
    await user.click(screen.getByTestId('open-cancel-dialog'));
    
    // Confirm cancellation
    await user.click(screen.getByTestId('confirm-cancel-btn'));
    
    // Wait for the async operation and state updates
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Reservation cancelled'
        })
      );
    });
    
    // Once toast is called, the cancelled state should be updated
    expect(screen.getByTestId('no-reservation-message')).toBeInTheDocument();
    expect(screen.queryByTestId('reservation')).not.toBeInTheDocument();
    
    // Restore global fetch for other tests
    global.fetch.mockRestore();
  });

  it('keeps the reservation when cancellation is dismissed', async () => {
    const user = userEvent.setup();
    render(<CancellationTest />);
    
    // Open cancel dialog
    await user.click(screen.getByTestId('open-cancel-dialog'));
    
    // Dismiss the dialog
    await user.click(screen.getByTestId('keep-reservation-btn'));
    
    // Dialog should be gone, but reservation should still exist
    expect(screen.queryByTestId('cancel-dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('reservation')).toBeInTheDocument();
    
    // Toast should not have been called
    expect(mockToast).not.toHaveBeenCalled();
  });
});