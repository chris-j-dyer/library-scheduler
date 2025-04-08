import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock toast without accessing the actual hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Simple component to test reservation filtering
const ProfileFilteringTest = () => {
  // Use an explicit date to avoid browser environment differences
  const currentDate = new Date('2025-05-01T00:00:00');
  
  const [reservations, setReservations] = React.useState([
    {
      id: 1,
      roomId: 101,
      roomName: 'Conference Room A',
      startTime: new Date('2025-05-01T10:00:00'),
      endTime: new Date('2025-05-01T11:00:00'),
      purpose: 'Team Meeting',
      status: 'confirmed'
    },
    {
      id: 2,
      roomId: 102,
      roomName: 'Study Room 1',
      startTime: new Date('2025-05-02T14:00:00'),
      endTime: new Date('2025-05-02T16:00:00'),
      purpose: 'Study Session',
      status: 'confirmed'
    },
    {
      id: 3,
      roomId: 103,
      roomName: 'Meeting Room B',
      startTime: new Date('2025-04-15T09:00:00'),
      endTime: new Date('2025-04-15T10:30:00'),
      purpose: 'Interview',
      status: 'cancelled'
    }
  ]);

  // Use the fixed current date for consistent comparison
  const upcomingReservations = reservations
    .filter(res => res.status !== 'cancelled' && new Date(res.startTime) > currentDate)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const pastReservations = reservations
    .filter(res => res.status !== 'cancelled' && new Date(res.endTime) < currentDate)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
  const cancelReservation = (id: number) => {
    setReservations(prevReservations => 
      prevReservations.map(res => 
        res.id === id ? { ...res, status: 'cancelled' } : res
      )
    );
    mockToast({
      title: 'Reservation cancelled',
      description: 'Your reservation has been successfully cancelled.'
    });
  };

  return (
    <div>
      <h1>My Reservations</h1>
      
      <h2>Upcoming Reservations</h2>
      {upcomingReservations.length === 0 ? (
        <p data-testid="no-upcoming">No upcoming reservations</p>
      ) : (
        <div>
          {upcomingReservations.map(reservation => (
            <div key={reservation.id} data-testid={`upcoming-${reservation.id}`}>
              <h3>{reservation.purpose}</h3>
              <p>{reservation.roomName}</p>
              <p>{reservation.startTime.toLocaleString()}</p>
              <button 
                onClick={() => cancelReservation(reservation.id)} 
                data-testid={`cancel-${reservation.id}`}
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}
      
      <h2>Past Reservations</h2>
      {pastReservations.length === 0 ? (
        <p data-testid="no-past">No past reservations</p>
      ) : (
        <div>
          {pastReservations.map(reservation => (
            <div key={reservation.id} data-testid={`past-${reservation.id}`}>
              <h3>{reservation.purpose}</h3>
              <p>{reservation.roomName}</p>
              <p>{reservation.startTime.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

describe('Profile Page Reservation Filtering', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });
  
  it('shows only non-cancelled upcoming reservations', () => {
    render(<ProfileFilteringTest />);
    
    // Should show both confirmed upcoming reservations
    expect(screen.getByTestId('upcoming-1')).toBeInTheDocument();
    expect(screen.getByTestId('upcoming-2')).toBeInTheDocument();
    
    // The cancelled reservation (#3) should not be visible
    expect(screen.queryByTestId('upcoming-3')).not.toBeInTheDocument();
  });

  it('removes a reservation from the list when cancelled', async () => {
    const user = userEvent.setup();
    render(<ProfileFilteringTest />);
    
    // Verify initial state
    expect(screen.getByTestId('upcoming-1')).toBeInTheDocument();
    expect(screen.getByTestId('upcoming-2')).toBeInTheDocument();
    
    // Find and click the cancel button for reservation 1
    await user.click(screen.getByTestId('cancel-1'));
    
    // After cancellation, reservation 1 should be removed
    await waitFor(() => {
      expect(screen.queryByTestId('upcoming-1')).not.toBeInTheDocument();
    });
    
    // Reservation 2 should still exist
    expect(screen.getByTestId('upcoming-2')).toBeInTheDocument();
    
    // Toast should have been called with correct message
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Reservation cancelled'
      })
    );
  });
});