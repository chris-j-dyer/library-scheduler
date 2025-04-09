import { Reservation } from '../types';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Get all reservations
export const getReservations = async (): Promise<ApiResponse<Reservation[]>> => {
  try {
    const response = await fetch('/api/reservations');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return { success: false, message: 'Failed to fetch reservations' };
  }
};

// Create a reservation
export const createReservation = async (
  roomId: string | number, 
  timeSlotId: string | number, 
  userId: string | number
): Promise<ApiResponse<Reservation>> => {
  try {
    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, timeSlotId, userId })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating reservation:', error);
    return { success: false, message: 'Failed to create reservation' };
  }
};