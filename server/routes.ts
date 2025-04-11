import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertLocationSchema,
  insertRoomSchema,
  insertReservationSchema,
  insertUserSchema,
} from "@shared/schema";
import { ZodError, z } from "zod";
import { format } from "date-fns";
import { setupAuth } from "./auth";
import { DateTime } from "luxon";
import Stripe from "stripe";

// Extend Express Request to include session
declare module "express-serve-static-core" {
  interface Request {
    session: {
      userId?: number;
      destroy: (callback: (err?: any) => void) => void;
    } & Record<string, any>;
  }
}

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
};

// Admin authorization middleware
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  return next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    // Send initial message
    ws.send(JSON.stringify({ type: 'info', message: 'Connected to Library Reservation System' }));

    // Handle messages from clients
    ws.on('message', (message) => {
      console.log('Received: %s', message);
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        if (data.type === 'reservation_update') {
          // Broadcast reservation updates to all clients
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'reservation_update',
                data: data.reservation
              }));
            }
          });
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // ---- User Routes are handled in auth.ts ----
  
  // ---- Location Routes ----
  
  // Get all locations
  app.get("/api/locations", async (_req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.status(200).json(locations);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get location by ID
  app.get("/api/locations/:id", async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const location = await storage.getLocation(locationId);
      
      if (!location) {
        return res.status(404).json({ error: "Location not found" });
      }
      
      res.status(200).json(location);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Create new location (admin only)
  app.post("/api/locations", isAdmin, async (req, res) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(locationData);
      res.status(201).json(location);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Update location (admin only)
  app.put("/api/locations/:id", isAdmin, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const locationData = req.body;
      
      const location = await storage.updateLocation(locationId, locationData);
      
      if (!location) {
        return res.status(404).json({ error: "Location not found" });
      }
      
      res.status(200).json(location);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // ---- Room Routes ----
  
  // Get all rooms
  app.get("/api/rooms", async (_req, res) => {
    try {
      const rooms = await storage.getAllRooms();
      res.status(200).json(rooms);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get room by ID
  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const room = await storage.getRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      res.status(200).json(room);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get rooms by location
  app.get("/api/locations/:locationId/rooms", async (req, res) => {
    try {
      const locationId = parseInt(req.params.locationId);
      const rooms = await storage.getRoomsByLocation(locationId);
      res.status(200).json(rooms);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Create new room (admin only)
  app.post("/api/rooms", isAdmin, async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(roomData);
      res.status(201).json(room);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Update room (admin only)
  app.put("/api/rooms/:id", isAdmin, async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const roomData = req.body;
      
      const room = await storage.updateRoom(roomId, roomData);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      res.status(200).json(room);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // ---- Reservation Routes ----
  
  // Get all reservations (admin only) or by date (for all users)
  app.get("/api/reservations", async (req, res) => {
    try {
      // If date param is provided, return reservations for that date
      if (req.query.date) {
        const dateStr = req.query.date as string;
        console.log(`API /api/reservations received date parameter: ${dateStr}`);
        const date = new Date(dateStr);
        
        // Create a date string for comparison in PostgreSQL
        const reservations = await storage.getReservationsByDate(date);
        console.log(`Found ${reservations.length} reservations for date ${dateStr}`);
        
        return res.status(200).json(reservations);
      }
      
      // If no date and user is not admin, return unauthorized
      if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Otherwise, return all reservations for admin users
      const reservations = await storage.getAllReservations();
      res.status(200).json(reservations);
    } catch (err) {
      console.error("Error getting reservations:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Add a dedicated endpoint for getting reservations by date
  // This should come BEFORE the /:id endpoint to avoid conflicts
  app.get("/api/reservations/by-date/:date", async (req, res) => {
    try {
      const dateStr = req.params.date;
      console.log(`API /api/reservations/by-date received date parameter: ${dateStr}`);
      
      // Create a Date object from the provided date string
      const date = new Date(dateStr);
      
      // Get reservations for this date
      const reservations = await storage.getReservationsByDate(date);
      console.log(`Found ${reservations.length} reservations for date ${dateStr}`);
      
      res.status(200).json(reservations);
    } catch (err) {
      console.error(`Error in /api/reservations/by-date:`, err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get reservation by ID
  app.get("/api/reservations/:id", isAuthenticated, async (req, res) => {
    try {
      const reservationId = parseInt(req.params.id);
      const reservation = await storage.getReservation(reservationId);
      
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      
      // Check if user owns this reservation or is admin
      if (!req.user?.isAdmin && reservation.userId !== req.user?.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      res.status(200).json(reservation);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get reservations for a room
  app.get("/api/rooms/:roomId/reservations", async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const dateParam = req.query.date as string;
      
      if (dateParam) {
        const date = new Date(dateParam);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ error: "Invalid date format" });
        }
        
        const reservations = await storage.getReservationsByRoomAndDate(roomId, date);
        return res.status(200).json(reservations);
      }
      
      const reservations = await storage.getReservationsByRoom(roomId);
      res.status(200).json(reservations);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get current user's reservations
  app.get("/api/user/reservations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const reservations = await storage.getReservationsByUser(userId);

      // Fetch all room IDs used in the reservations
      const roomIds = Array.from(new Set(reservations.map(r => r.roomId)));
      const allRooms = await Promise.all(roomIds.map(id => storage.getRoom(id)));

      // Add room name to each reservation
      const reservationsWithRoomNames = reservations.map(res => {
        const room = allRooms.find(r => r?.id === res.roomId);
        return {
          ...res,
          roomName: room?.name || `Room #${res.roomId}`,
        };
      });

      res.status(200).json(reservationsWithRoomNames);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Create new reservation
  app.post("/api/reservations", isAuthenticated, async (req, res) => {
    try {
      // Log request body for debugging
      console.log("Reservation request body:", JSON.stringify(req.body));
      
      // Get reservation data from request body
      let reservationData = req.body;
      
      // If authenticated user, set userId
      if (req.isAuthenticated() && req.user) {
        reservationData.userId = req.user.id;
      }
      
      // Set status to pending_payment by default
      reservationData.status = "pending_payment";
      
      // Calculate price based on duration
      if (reservationData.startTime && reservationData.endTime) {
        let startTime = reservationData.startTime;
        let endTime = reservationData.endTime;
        
        if (typeof startTime === 'string') {
          startTime = DateTime.fromISO(startTime, { zone: 'America/New_York' }).toJSDate();
        }
        
        if (typeof endTime === 'string') {
          endTime = DateTime.fromISO(endTime, { zone: 'America/New_York' }).toJSDate();
        }
        
        // Calculate duration and price
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)); // Round up to nearest hour
        const priceInCents = durationHours * 500; // $5 per hour = 500 cents
        
        // Add price to reservation data
        reservationData.priceInCents = priceInCents;
        reservationData.paymentStatus = "pending";
        
        console.log(`Setting price for new reservation: $${priceInCents/100} (${durationHours} hours)`);
      }
      
      // The Zod schema validation is handled in the storage layer now
      
      // Convert to the appropriate format if needed
      if (typeof reservationData.reservationDate === 'string') {
        // This is just a date string (no time), so it's safe to convert with new Date()
        reservationData.reservationDate = new Date(reservationData.reservationDate);
        console.log("Converted reservationDate:", reservationData.reservationDate);
      }

      if (typeof reservationData.startTime === 'string') {
        reservationData.startTime = DateTime.fromISO(reservationData.startTime, { zone: 'America/New_York' }).toJSDate();
        console.log("Converted startTime (EST):", reservationData.startTime);
      }

      if (typeof reservationData.endTime === 'string') {
        reservationData.endTime = DateTime.fromISO(reservationData.endTime, { zone: 'America/New_York' }).toJSDate();
        console.log("Converted endTime (EST):", reservationData.endTime);
      }
      
      // Log the processed data before validation
      console.log("Processed reservation data:", {
        roomId: reservationData.roomId,
        userId: reservationData.userId,
        guestName: reservationData.guestName,
        guestEmail: reservationData.guestEmail,
        reservationDate: reservationData.reservationDate,
        startTime: reservationData.startTime,
        endTime: reservationData.endTime,
        purpose: reservationData.purpose,
        status: reservationData.status,
        priceInCents: reservationData.priceInCents,
        paymentStatus: reservationData.paymentStatus,
        confirmationCode: reservationData.confirmationCode
      });
      
      // Skip validation and pass directly to storage layer which handles data conversion
      // Create reservation
      const reservation = await storage.createReservation(reservationData);
      
      // Broadcast to WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'new_reservation',
            data: reservation
          }));
        }
      });
      
      // Log that we sent the WebSocket message
      console.log('WebSocket broadcast: new reservation created');
      
      res.status(201).json(reservation);
    } catch (err) {
      console.error("Error in /api/reservations:", err);
      
      if (err instanceof ZodError) {
        console.error("ZodError details:", JSON.stringify(err.errors));
        return res.status(400).json({ error: err.errors });
      }
      
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Update reservation
  app.put("/api/reservations/:id", isAuthenticated, async (req, res) => {
    try {
      const reservationId = parseInt(req.params.id);
      const existingReservation = await storage.getReservation(reservationId);
      
      if (!existingReservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      
      // Check if user owns this reservation or is admin
      if (!req.user?.isAdmin && existingReservation.userId !== req.user?.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const updatedReservation = await storage.updateReservation(reservationId, req.body);
      
      // Broadcast to WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'updated_reservation',
            data: updatedReservation
          }));
        }
      });
      
      res.status(200).json(updatedReservation);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Cancel reservation
  app.post("/api/reservations/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const reservationId = parseInt(req.params.id);
      const existingReservation = await storage.getReservation(reservationId);
      
      if (!existingReservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      
      // Check if user owns this reservation or is admin
      if (!req.user?.isAdmin && existingReservation.userId !== req.user?.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const cancelledReservation = await storage.cancelReservation(reservationId);
      
      // Broadcast to WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'cancelled_reservation',
            data: cancelledReservation
          }));
        }
      });
      
      res.status(200).json(cancelledReservation);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Initialize Stripe with our secret key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Missing required environment variable: STRIPE_SECRET_KEY");
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

  // ---- Payment Routes ----
  
  // Helper function to calculate price for a reservation in cents
  const calculateReservationPrice = (startTime: Date, endTime: Date): number => {
    // $5 per hour, charged in full hour increments
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)); // Round up to the nearest hour
    return durationHours * 500; // $5.00 = 500 cents per hour
  };

  // Create a payment intent for a reservation
  app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      console.log("Create payment intent request:", req.body);
      
      // Validate request body
      const { reservationId } = req.body;
      
      if (!reservationId) {
        return res.status(400).json({ 
          error: "Missing required parameter: reservationId" 
        });
      }

      // Get the reservation
      const reservation = await storage.getReservation(parseInt(reservationId));
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }

      // Check if user owns this reservation or is admin
      if (!req.user?.isAdmin && reservation.userId !== req.user?.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Check if reservation already has a payment intent
      if (reservation.stripePaymentIntentId) {
        try {
          // Get the existing payment intent to check its status
          const existingIntent = await stripe.paymentIntents.retrieve(
            reservation.stripePaymentIntentId
          );
          
          // If payment intent is already successful or we're in the process of payment
          if (['succeeded', 'processing', 'requires_capture'].includes(existingIntent.status)) {
            return res.status(400).json({ 
              error: "Payment for this reservation has already been processed" 
            });
          }
          
          // If it's an old payment intent that wasn't completed, we can cancel it
          await stripe.paymentIntents.cancel(reservation.stripePaymentIntentId);
        } catch (err) {
          console.error("Error checking existing payment intent:", err);
          // Continue with creating a new one if we can't retrieve the old one
        }
      }

      // Calculate price based on reservation duration
      const amountInCents = calculateReservationPrice(
        reservation.startTime, 
        reservation.endTime
      );
      
      console.log(`Calculated price for reservation #${reservationId}: $${amountInCents/100}`);

      // Create the payment intent with automatic payment methods
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,  // Enable automatic payment methods for broader compatibility
        },
        metadata: {
          reservationId: reservation.id.toString(),
          roomId: reservation.roomId.toString(),
          startTime: reservation.startTime.toISOString(),
          endTime: reservation.endTime.toISOString(),
        },
        // Add application fee if needed
        // application_fee_amount: Math.round(amountInCents * 0.05), // 5% fee
      });

      // Update the reservation with the payment intent ID and price
      const updatedReservation = await storage.updateReservation(
        reservation.id, 
        {
          stripePaymentIntentId: paymentIntent.id,
          priceInCents: amountInCents,
          paymentStatus: "pending",
          status: "pending_payment"
        }
      );

      // Broadcast the updated reservation to WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'updated_reservation',
            data: updatedReservation
          }));
        }
      });

      // Return the client secret to the frontend
      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        amountInCents,
        reservation: updatedReservation
      });
      
    } catch (err) {
      console.error("Error creating payment intent:", err);
      res.status(500).json({ 
        error: "Failed to create payment intent",
        details: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  });

  // Webhook to handle successful Stripe payments (we would implement this in production)
  app.post("/api/webhook", async (req, res) => {
    // This is a placeholder for a full Stripe webhook implementation
    // In a production app, you would:
    // 1. Verify the webhook signature
    // 2. Handle various event types (payment_intent.succeeded, etc.)
    // 3. Update the reservation status when payment is complete
    
    // For now, we'll just acknowledge the webhook
    res.status(200).json({ received: true });
  });
  
  // TEST ENDPOINT: Create a test reservation and payment intent (for testing only)
  app.post("/api/test-payment-flow", async (req, res) => {
    try {
      console.log("Testing payment flow");
      
      // 1. Create a test reservation with pending_payment status
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
      
      const reservationData = {
        roomId: 1, // Group Study Room
        guestName: "Test User",
        guestEmail: "test@example.com",
        reservationDate: now.toISOString().split('T')[0], // Format as YYYY-MM-DD
        startTime,
        endTime,
        purpose: "Test Reservation",
        status: "pending_payment",
        paymentStatus: "pending",
        // Calculate price: $5 per hour for 2 hours = $10 = 1000 cents
        priceInCents: 1000
      };
      
      // Create the reservation
      const reservation = await storage.createReservation(reservationData);
      console.log("Created test reservation:", reservation);
      
      // 2. Create a payment intent with automatic payment methods 
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 1000, // $10.00
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,  // Enable automatic payment methods for broader compatibility
        },
        metadata: {
          reservationId: reservation.id.toString(),
          roomId: reservation.roomId.toString(),
          startTime: reservation.startTime.toISOString(),
          endTime: reservation.endTime.toISOString(),
        }
      });
      
      console.log("Created Stripe payment intent:", paymentIntent.id);
      
      // 3. Update the reservation with the payment intent ID
      const updatedReservation = await storage.updateReservation(
        reservation.id, 
        {
          stripePaymentIntentId: paymentIntent.id
        }
      );
      
      // 4. Return all the test data
      res.status(200).json({
        success: true,
        message: "Test payment flow initiated successfully",
        reservation: updatedReservation,
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        }
      });
    } catch (err) {
      console.error("Error in test payment flow:", err);
      res.status(500).json({ 
        error: "Test payment flow failed",
        details: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  });
  
  // TEST ENDPOINT: Simulate a successful payment (for testing only)
  app.post("/api/test-payment-success", async (req, res) => {
    try {
      const { reservationId, paymentIntentId } = req.body;
      
      if (!reservationId || !paymentIntentId) {
        return res.status(400).json({ 
          error: "Missing required parameters: reservationId and paymentIntentId" 
        });
      }
      
      const reservation = await storage.getReservation(parseInt(reservationId));
      
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      
      // Update reservation status to confirmed
      const updatedReservation = await storage.updateReservation(
        reservation.id, 
        {
          status: "confirmed",
          paymentStatus: "completed"
        }
      );
      
      console.log("Test payment success - Updated reservation:", updatedReservation);
      
      // Broadcast to WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'updated_reservation',
            data: updatedReservation
          }));
        }
      });
      
      res.status(200).json({
        success: true,
        message: "Test payment success simulated",
        reservation: updatedReservation
      });
    } catch (err) {
      console.error("Error in test payment success:", err);
      res.status(500).json({ 
        error: "Test payment success failed",
        details: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  });
  
  // Update reservation after successful payment
  app.post("/api/reservations/:id/payment-success", isAuthenticated, async (req, res) => {
    try {
      const reservationId = parseInt(req.params.id);
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Missing paymentIntentId" });
      }
      
      const reservation = await storage.getReservation(reservationId);
      
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      
      // Verify this is the correct payment intent
      if (reservation.stripePaymentIntentId !== paymentIntentId) {
        return res.status(400).json({ error: "Payment intent ID does not match" });
      }
      
      // Update reservation status to confirmed
      const updatedReservation = await storage.updateReservation(reservationId, {
        status: "confirmed",
        paymentStatus: "completed"
      });
      
      // Broadcast to WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'updated_reservation',
            data: updatedReservation
          }));
        }
      });
      
      res.status(200).json(updatedReservation);
    } catch (err) {
      console.error("Error handling payment success:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get payment intent client secret for an existing payment intent
  app.get("/api/payment-intent/:paymentIntentId", isAuthenticated, async (req, res) => {
    try {
      const { paymentIntentId } = req.params;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Missing paymentIntentId" });
      }
      
      console.log("Getting payment intent:", paymentIntentId);
      
      // Verify the payment intent belongs to a reservation owned by this user
      // Note: req.user is guaranteed to exist because of isAuthenticated middleware
      const userId = req.user!.id;
      const userReservations = await storage.getReservationsByUser(userId);
      const matchingReservation = userReservations.find(
        r => r.stripePaymentIntentId === paymentIntentId
      );
      
      if (!matchingReservation) {
        return res.status(403).json({ 
          error: "You do not have permission to access this payment intent" 
        });
      }
      
      // Retrieve the payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      console.log("Retrieved payment intent:", paymentIntent.id, "Status:", paymentIntent.status);
      
      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        status: paymentIntent.status
      });
    } catch (err) {
      console.error("Error retrieving payment intent:", err);
      res.status(500).json({ error: "Failed to retrieve payment intent" });
    }
  });

  return httpServer;
}
