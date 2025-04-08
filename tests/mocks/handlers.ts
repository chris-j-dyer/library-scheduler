import { rest } from 'msw';
import type { User, Reservation, Room, Location } from '../../shared/schema';

// Sample test data for mocking responses
const mockUser: User = {
  id: 1,
  username: 'testuser',
  password: 'hashedpassword',
  name: 'Test User',
  email: 'test@example.com',
  isAdmin: false,
  createdAt: new Date(),
};

const mockRooms: Room[] = [
  {
    id: 1,
    name: 'Study Room A',
    locationId: 1,
    capacity: 4,
    description: 'Small study room for group work',
    features: ['WiFi', 'Whiteboard'],
    floor: 1,
    roomNumber: 'A101',
    isActive: true,
    createdAt: new Date()
  },
  {
    id: 2,
    name: 'Conference Room B',
    locationId: 1,
    capacity: 12,
    description: 'Large conference room with projector',
    features: ['WiFi', 'TV with HDMI', 'Whiteboard'],
    floor: 2,
    roomNumber: 'B201',
    isActive: true,
    createdAt: new Date()
  }
];

const mockLocations: Location[] = [
  {
    id: 1,
    name: 'Main Branch',
    address: '123 Library St',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28202',
    phoneNumber: '704-555-1234',
    description: 'The main library branch with extended hours',
    isActive: true
  }
];

// Create a date for today at 2 PM
const today = new Date();
today.setHours(14, 0, 0, 0);

// Create a date for tomorrow at 2 PM
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const mockReservations: Reservation[] = [
  {
    id: 1,
    roomId: 1,
    userId: 1,
    guestName: null,
    guestEmail: null,
    reservationDate: today.toISOString().split('T')[0],
    startTime: new Date(today),
    endTime: new Date(today.setHours(15, 0, 0, 0)),
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
    reservationDate: tomorrow.toISOString().split('T')[0],
    startTime: new Date(tomorrow),
    endTime: new Date(tomorrow.setHours(16, 0, 0, 0)),
    purpose: 'Team Meeting',
    status: 'confirmed',
    confirmationCode: 'LIB-789012',
    notes: null,
    createdAt: new Date(),
    updatedAt: null
  }
];

// Define MSW request handlers for API routes
export const handlers = [
  // Auth endpoints
  rest.get('/api/user', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockUser));
  }),

  rest.post('/api/login', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockUser));
  }),

  rest.post('/api/register', async (req, res, ctx) => {
    const { username } = await req.json();
    
    if (username === 'existing') {
      return res(ctx.status(400), ctx.json({ message: 'Username already exists' }));
    }
    
    return res(ctx.status(201), ctx.json({ ...mockUser, username }));
  }),

  rest.post('/api/logout', (req, res, ctx) => {
    return res(ctx.status(200));
  }),

  // Location endpoints
  rest.get('/api/locations', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockLocations));
  }),

  rest.get('/api/locations/:id', (req, res, ctx) => {
    const { id } = req.params;
    const location = mockLocations.find(loc => loc.id === Number(id));
    
    if (!location) {
      return res(ctx.status(404), ctx.json({ message: 'Location not found' }));
    }
    
    return res(ctx.status(200), ctx.json(location));
  }),

  // Room endpoints
  rest.get('/api/rooms', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockRooms));
  }),

  rest.get('/api/rooms/:id', (req, res, ctx) => {
    const { id } = req.params;
    const room = mockRooms.find(r => r.id === Number(id));
    
    if (!room) {
      return res(ctx.status(404), ctx.json({ message: 'Room not found' }));
    }
    
    return res(ctx.status(200), ctx.json(room));
  }),

  rest.get('/api/locations/:locationId/rooms', (req, res, ctx) => {
    const { locationId } = req.params;
    const rooms = mockRooms.filter(r => r.locationId === Number(locationId));
    
    return res(ctx.status(200), ctx.json(rooms));
  }),

  // Reservation endpoints
  rest.get('/api/user/reservations', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockReservations));
  }),

  rest.get('/api/reservations/by-date/:date', (req, res, ctx) => {
    const { date } = req.params;
    const reservations = mockReservations.filter(r => r.reservationDate === date);
    
    return res(ctx.status(200), ctx.json(reservations));
  }),

  rest.post('/api/reservations', async (req, res, ctx) => {
    const reservationData = await req.json();
    const newReservation: Reservation = {
      ...reservationData,
      id: mockReservations.length + 1,
      createdAt: new Date(),
      updatedAt: null
    };
    
    return res(ctx.status(201), ctx.json(newReservation));
  }),

  rest.post('/api/reservations/:id/cancel', (req, res, ctx) => {
    const { id } = req.params;
    const reservation = mockReservations.find(r => r.id === Number(id));
    
    if (!reservation) {
      return res(ctx.status(404), ctx.json({ message: 'Reservation not found' }));
    }
    
    const cancelledReservation = { 
      ...reservation, 
      status: 'cancelled',
      updatedAt: new Date()
    };
    
    return res(ctx.status(200), ctx.json(cancelledReservation));
  })
];