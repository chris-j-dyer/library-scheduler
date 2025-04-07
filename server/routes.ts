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
import { ZodError } from "zod";
import { setupAuth } from "./auth";

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
  
  // Get all reservations (admin only)
  app.get("/api/reservations", isAdmin, async (_req, res) => {
    try {
      const reservations = await storage.getAllReservations();
      res.status(200).json(reservations);
    } catch (err) {
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
      let reservationData = req.body;
      
      // If authenticated user, set userId
      if (req.isAuthenticated() && req.user) {
        reservationData.userId = req.user.id;
      }
      
      // Validate data
      const validatedData = insertReservationSchema.parse(reservationData);
      
      // Create reservation
      const reservation = await storage.createReservation(validatedData);
      
      // Broadcast to WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'new_reservation',
            data: reservation
          }));
        }
      });
      
      res.status(201).json(reservation);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      console.error(err);
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
