export interface Reservation {
  id?: string;
  roomId: string | number;
  timeSlotId: string | number;
  userId: string | number;
  date?: string;
}

export interface Room {
  id: string | number;
  name: string;
}

export interface TimeSlot {
  id: string | number;
  time: string;
}