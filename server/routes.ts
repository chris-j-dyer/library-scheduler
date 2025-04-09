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
      res.status(200).json(reservations);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Create new reservation
  app.post("/api/reservations", async (req, res) => {
    try {
      // Log request body for debugging
      console.log("Reservation request body:", JSON.stringify(req.body));
      
      // Get reservation data from request body
      let reservationData = req.body;
      
      // If authenticated user, set userId
      if (req.isAuthenticated() && req.user) {
        reservationData.userId = req.user.id;
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

  return httpServer;
}
