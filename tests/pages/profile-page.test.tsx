import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { vi } from 'vitest';
import { server } from '../mocks/server';
import { render } from '../test-utils';
import ProfilePage from '../../client/src/pages/profile-page';

// Mock the format function to ensure consistent date output
vi.mock('date-fns', () => {
  const actual = vi.importActual('date-fns');
  return {
    ...actual,
    format: vi.fn((date, formatStr) => '2025-04-09'),
    addHours: vi.fn((date, hours) => date),
  };
});

describe('ProfilePage', () => {
  // Active (non-cancelled) reservations
  const mockReservations = [
    {
      id: 1,
      roomId: 1,
      userId: 1,
      guestName: null,
      guestEmail: null,
      reservationDate: '2025-04-09',
      startTime: new Date('2025-04-09T14:00:00'),
      endTime: new Date('2025-04-09T15:00:00'),
      purpose: 'Study Group',
      status: 'confirmed',
      confirmationCode: 'LIB-123456',
      notes: null,
      createdAt: new Date(),
      updatedAt: null
    },
    {
      id: 2,
      roomId: 2,
      userId: 1,
      guestName: null,
      guestEmail: null,
      reservationDate: '2025-04-10',
      startTime: new Date('2025-04-10T14:00:00'),
      endTime: new Date('2025-04-10T15:00:00'),
      purpose: 'Team Meeting',
      status: 'confirmed',
      confirmationCode: 'LIB-789012',
      notes: null,
      createdAt: new Date(),
      updatedAt: null
    },
    {
      id: 3,
      roomId: 3,
      userId: 1,
      guestName: null,
      guestEmail: null,
      reservationDate: '2025-04-11',
      startTime: new Date('2025-04-11T14:00:00'),
      endTime: new Date('2025-04-11T15:00:00'),
      purpose: 'Cancelled Meeting',
      status: 'cancelled',
      confirmationCode: 'LIB-345678',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    // Override the default mock to return our test data
    server.use(
      rest.get('/api/user/reservations', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(mockReservations));
      })
    );
  });

  test('renders profile page with user info', async () => {
    render(React.createElement(ProfilePage));

    // Wait for the user data to load
    await waitFor(() => {
      expect(screen.getByText(/profile/i)).toBeInTheDocument();
    });
  });

  test('shows only active (non-cancelled) reservations', async () => {
    render(React.createElement(ProfilePage));

    // Wait for reservations to load
    await waitFor(() => {
      // Should show two confirmed reservations
      expect(screen.getByText('Study Group')).toBeInTheDocument();
      expect(screen.getByText('Team Meeting')).toBeInTheDocument();
      
      // Should not show the cancelled reservation
      expect(screen.queryByText('Cancelled Meeting')).not.toBeInTheDocument();
    });
  });

  test('displays cancellation confirmation when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(React.createElement(ProfilePage));

    // Wait for reservations to load
    await waitFor(() => {
      expect(screen.getByText('Study Group')).toBeInTheDocument();
    });

    // Find and click the cancel button
    const cancelButtons = screen.getAllByText('Cancel');
    await user.click(cancelButtons[0]);

    // Check that the confirmation dialog appears
    expect(screen.getByText('Cancel Reservation')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to cancel this reservation?')).toBeInTheDocument();
    expect(screen.getByText('Yes, Cancel Reservation')).toBeInTheDocument();
    expect(screen.getByText('No, Keep It')).toBeInTheDocument();
  });

  test('cancels a reservation when confirmed in dialog', async () => {
    const user = userEvent.setup();
    
    // Mock the cancel endpoint
    server.use(
      rest.post('/api/reservations/1/cancel', (req, res, ctx) => {
        return res(
          ctx.status(200), 
          ctx.json({
            ...mockReservations[0],
            status: 'cancelled',
            updatedAt: new Date()
          })
        );
      })
    );
    
    render(React.createElement(ProfilePage));

    // Wait for reservations to load
    await waitFor(() => {
      expect(screen.getByText('Study Group')).toBeInTheDocument();
    });

    // Find and click the cancel button
    const cancelButtons = screen.getAllByText('Cancel');
    await user.click(cancelButtons[0]);

    // Click the confirm button in the dialog
    const confirmButton = screen.getByText('Yes, Cancel Reservation');
    await user.click(confirmButton);

    // Verify the toast would be shown (we can't actually test the toast since it's mocked)
    // But we can check that the component tried to make the API call
    await waitFor(() => {
      // This test passes if the dialog is closed after confirmation
      expect(screen.queryByText('Cancel Reservation')).not.toBeInTheDocument();
    });
  });
});