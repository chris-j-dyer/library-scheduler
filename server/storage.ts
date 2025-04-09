import { 
  users, 
  reservations as schema,
  type User, 
  type InsertUser, 
  type Room, 
  type InsertRoom, 
  type Location, 
  type InsertLocation, 
  type Reservation, 
  type InsertReservation 
} from "@shared/schema";
import { format } from "date-fns";
import session from "express-session";
import createMemoryStore from "memorystore";
import { sql, eq, and } from "drizzle-orm";
import { DateTime } from "luxon";

// Expanded storage interface with CRUD operations for all our models
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Location methods
  getLocation(id: number): Promise<Location | undefined>;
  getAllLocations(): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  
  // Room methods
  getRoom(id: number): Promise<Room | undefined>;
  getRoomsByLocation(locationId: number): Promise<Room[]>;
  getAllRooms(): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined>;
  
  // Reservation methods
  getReservation(id: number): Promise<Reservation | undefined>;
  getReservationsByRoom(roomId: number): Promise<Reservation[]>;
  getReservationsByRoomAndDate(roomId: number, date: Date): Promise<Reservation[]>;
  getReservationsByDate(date: Date): Promise<Reservation[]>;
  getReservationsByUser(userId: number): Promise<Reservation[]>;
  getAllReservations(): Promise<Reservation[]>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: number, reservation: Partial<InsertReservation>): Promise<Reservation | undefined>;
  cancelReservation(id: number): Promise<Reservation | undefined>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private locations: Map<number, Location>;
  private rooms: Map<number, Room>;
  private reservations: Map<number, Reservation>;
  
  private userCurrentId: number;
  private locationCurrentId: number;
  private roomCurrentId: number;
  private reservationCurrentId: number;
  
  // Session store
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.rooms = new Map();
    this.reservations = new Map();
    
    this.userCurrentId = 1;
    this.locationCurrentId = 1;
    this.roomCurrentId = 1;
    this.reservationCurrentId = 1;
    
    // Initialize session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    // Ensure all required properties are defined
    const user: User = {
      ...insertUser,
      id,
      createdAt: now,
      name: insertUser.name || null,
      email: insertUser.email || null,
      isAdmin: insertUser.isAdmin ?? false
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Location methods
  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }
  
  async getAllLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }
  
  async createLocation(location: InsertLocation): Promise<Location> {
    const id = this.locationCurrentId++;
    const newLocation: Location = {
      ...location,
      id,
      address: location.address || null,
      city: location.city || null,
      state: location.state || null,
      zipCode: location.zipCode || null,
      phoneNumber: location.phoneNumber || null,
      isActive: location.isActive ?? true
    };
    this.locations.set(id, newLocation);
    return newLocation;
  }
  
  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined> {
    const existingLocation = this.locations.get(id);
    if (!existingLocation) return undefined;
    
    const updatedLocation = { ...existingLocation, ...location };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }
  
  // Room methods
  async getRoom(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }
  
  async getRoomsByLocation(locationId: number): Promise<Room[]> {
    return Array.from(this.rooms.values()).filter(room => room.locationId === locationId);
  }
  
  async getAllRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }
  
  async createRoom(room: InsertRoom): Promise<Room> {
    const id = this.roomCurrentId++;
    const now = new Date();
    const newRoom: Room = {
      ...room,
      id,
      createdAt: now,
      description: room.description || null,
      features: room.features || [],
      isActive: room.isActive ?? true
    };
    this.rooms.set(id, newRoom);
    return newRoom;
  }
  
  async updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room | undefined> {
    const existingRoom = this.rooms.get(id);
    if (!existingRoom) return undefined;
    
    const updatedRoom = { ...existingRoom, ...room };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }
  
  // Reservation methods
  async getReservation(id: number): Promise<Reservation | undefined> {
    return this.reservations.get(id);
  }
  
  async getReservationsByRoom(roomId: number): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(res => res.roomId === roomId);
  }
  
  async getReservationsByRoomAndDate(roomId: number, date: Date): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(res => {
      const resDate = new Date(res.reservationDate);
      return res.roomId === roomId && 
        format(resDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  }
  
  async getReservationsByDate(date: Date): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(res => {
      const resDate = new Date(res.reservationDate);
      return format(resDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  }
  
  async getReservationsByUser(userId: number): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(res => res.userId === userId);
  }
  
  async getAllReservations(): Promise<Reservation[]> {
    return Array.from(this.reservations.values());
  }
  
  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    const id = this.reservationCurrentId++;
    const now = new Date();
    
    // Handle both string and Date objects for all date fields
    const reservationDate = typeof reservation.reservationDate === 'string'
      ? reservation.reservationDate
      : format(reservation.reservationDate as Date, 'yyyy-MM-dd');
    
    const startTime = typeof reservation.startTime === 'string'
      ? DateTime.fromISO(reservation.startTime, { zone: 'America/New_York' }).toJSDate()
      : reservation.startTime;

    const endTime = typeof reservation.endTime === 'string'
      ? DateTime.fromISO(reservation.endTime, { zone: 'America/New_York' }).toJSDate()
      : reservation.endTime;
    
    // Generate a random confirmation code if not provided
    const confirmationCode = reservation.confirmationCode || 
      `LIB-${Math.floor(100000 + Math.random() * 900000)}`;
    
    const newReservation: Reservation = { 
      id,
      roomId: reservation.roomId,
      userId: reservation.userId || null,
      guestName: reservation.guestName || null,
      guestEmail: reservation.guestEmail || null,
      reservationDate: reservationDate,
      startTime: startTime, // Use converted startTime
      endTime: endTime, // Use converted endTime
      purpose: reservation.purpose || null,
      status: reservation.status || "confirmed",
      confirmationCode,
      notes: reservation.notes || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.reservations.set(id, newReservation);
    return newReservation;
  }
  
  async updateReservation(id: number, reservation: Partial<InsertReservation>): Promise<Reservation | undefined> {
    const existingReservation = this.reservations.get(id);
    if (!existingReservation) return undefined;
    
    const now = new Date();
    const updatedReservation = { 
      ...existingReservation, 
      ...reservation,
      updatedAt: now
    };
    
    this.reservations.set(id, updatedReservation);
    return updatedReservation;
  }
  
  async cancelReservation(id: number): Promise<Reservation | undefined> {
    const existingReservation = this.reservations.get(id);
    if (!existingReservation) return undefined;
    
    const now = new Date();
    const cancelledReservation = { 
      ...existingReservation, 
      status: "cancelled",
      updatedAt: now
    };
    
    this.reservations.set(id, cancelledReservation);
    return cancelledReservation;
  }
  
  // Initialize with sample data
  private async initializeSampleData() {
    // Create admin user
    const adminUser: InsertUser = {
      username: "admin",
      password: "admin123", // In a real app, this would be hashed
      name: "Library Admin",
      email: "admin@library.com",
      isAdmin: true
    };
    await this.createUser(adminUser);
    
    // Create a regular user
    const regularUser: InsertUser = {
      username: "user",
      password: "user123", // In a real app, this would be hashed
      name: "John Reader",
      email: "john@example.com",
      isAdmin: false
    };
    await this.createUser(regularUser);
    
    // Create locations
    const southLocation: InsertLocation = {
      name: "South Boulevard Branch",
      address: "4429 South Blvd",
      city: "Charlotte",
      state: "NC",
      zipCode: "28209",
      phoneNumber: "704-416-6400",
      isActive: true
    };
    const createdSouthLocation = await this.createLocation(southLocation);
    
    // Add rooms to South Boulevard
    const southRooms: InsertRoom[] = [
      {
        locationId: createdSouthLocation.id,
        name: "Group Study Room",
        capacity: 12,
        description: "A large meeting room ideal for group study sessions and collaborative projects. The room includes a large table with 12 chairs, a wall-mounted TV for presentations, and a whiteboard.",
        features: ["Whiteboard", "TV with HDMI", "Conference Phone", "WiFi"],
        isActive: true
      },
      {
        locationId: createdSouthLocation.id,
        name: "Study Room 1",
        capacity: 5,
        description: "Medium-sized room suitable for small group discussions. Includes a round table with 5 chairs and a wall-mounted whiteboard.",
        features: ["Whiteboard", "WiFi", "Standing Desk"],
        isActive: true
      },
      {
        locationId: createdSouthLocation.id,
        name: "Study Room 2",
        capacity: 5,
        description: "Medium-sized room suitable for small group discussions. Includes a round table with 5 chairs and a wall-mounted whiteboard.",
        features: ["Whiteboard", "WiFi", "Power Outlets"],
        isActive: true
      },
      {
        locationId: createdSouthLocation.id,
        name: "Study Room 3",
        capacity: 2,
        description: "A small, quiet room ideal for individual or paired study sessions. Includes a small desk with 2 chairs.",
        features: ["Small Desk", "WiFi", "Quiet Area"],
        isActive: true
      },
      {
        locationId: createdSouthLocation.id,
        name: "Study Room 4",
        capacity: 2,
        description: "A small, quiet room ideal for individual or paired study sessions. Includes a small desk with 2 chairs.",
        features: ["Small Desk", "WiFi", "Quiet Area"],
        isActive: true
      },
      {
        locationId: createdSouthLocation.id,
        name: "Study Room 5",
        capacity: 2,
        description: "A small, quiet room ideal for individual or paired study sessions. Includes a small desk with 2 chairs and a nice window view.",
        features: ["Small Desk", "WiFi", "Quiet Area", "Window View"],
        isActive: true
      }
    ];
    
    // Create each room
    for (const room of southRooms) {
      await this.createRoom(room);
    }
    
    // Create another location
    const universityLocation: InsertLocation = {
      name: "University City Regional",
      address: "301 E. WT Harris Blvd",
      city: "Charlotte",
      state: "NC",
      zipCode: "28262",
      phoneNumber: "704-416-7200",
      isActive: true
    };
    const createdUniversityLocation = await this.createLocation(universityLocation);
    
    // Add rooms to University City location
    const universityRooms: InsertRoom[] = [
      {
        locationId: createdUniversityLocation.id,
        name: "Conference Room A",
        capacity: 20,
        description: "Large conference room with presentation facilities. Ideal for meetings, workshops, and community events.",
        features: ["Projector", "Conference Phone", "WiFi", "Whiteboard", "Computer"],
        isActive: true
      },
      {
        locationId: createdUniversityLocation.id,
        name: "Study Pod 1",
        capacity: 1,
        description: "Individual study pod with privacy dividers. Perfect for quiet, focused study.",
        features: ["Desk", "Power Outlets", "WiFi", "Desk Lamp"],
        isActive: true
      },
      {
        locationId: createdUniversityLocation.id,
        name: "Study Pod 2",
        capacity: 1,
        description: "Individual study pod with privacy dividers. Perfect for quiet, focused study.",
        features: ["Desk", "Power Outlets", "WiFi", "Desk Lamp"],
        isActive: true
      },
      {
        locationId: createdUniversityLocation.id,
        name: "Group Study Room B",
        capacity: 8,
        description: "Medium-sized room for collaborative work. Features a large table and comfortable chairs.",
        features: ["Large Table", "WiFi", "Whiteboard", "TV with HDMI"],
        isActive: true
      }
    ];
    
    // Create each university room
    for (const room of universityRooms) {
      await this.createRoom(room);
    }
    
    // Create some sample reservations
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Create a copy of today for tomorrow to avoid modifying the same date
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = format(tomorrowDate, 'yyyy-MM-dd');
    
    // Create times for today's reservation
    const todayStart = new Date(today);
    todayStart.setHours(14, 0, 0, 0); // 2pm today
    
    const todayEnd = new Date(today);
    todayEnd.setHours(16, 0, 0, 0); // 4pm today
    
    // Create times for tomorrow's reservation
    const tomorrowStart = new Date(tomorrowDate);
    tomorrowStart.setHours(10, 0, 0, 0); // 10am tomorrow
    
    const tomorrowEnd = new Date(tomorrowDate);
    tomorrowEnd.setHours(12, 0, 0, 0); // 12pm tomorrow
    
    // Sample reservations for room 1 (first room at South Boulevard)
    const sampleReservations: InsertReservation[] = [
      {
        roomId: 1,
        userId: 2, // John Reader
        reservationDate: todayStr,
        startTime: todayStart,
        endTime: todayEnd,
        purpose: "Study Group",
        status: "confirmed",
        guestName: "John Reader",
        guestEmail: "john@example.com"
      },
      {
        roomId: 1,
        userId: 2,
        reservationDate: tomorrowStr,
        startTime: tomorrowStart,
        endTime: tomorrowEnd,
        purpose: "Research Meeting",
        status: "confirmed",
        guestName: "John Reader",
        guestEmail: "john@example.com"
      }
    ];
    
    // Create each reservation
    for (const reservation of sampleReservations) {
      await this.createReservation(reservation);
    }
  }
}

import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import * as schema from "@shared/schema";
import type { 
  User, InsertUser, Location, InsertLocation, Room, InsertRoom, Reservation, InsertReservation 
} from "@shared/schema";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(schema.users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(schema.users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(schema.users)
      .set(userData)
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(schema.locations).where(eq(schema.locations.id, id));
    return location || undefined;
  }

  async getAllLocations(): Promise<Location[]> {
    return db.select().from(schema.locations);
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLocation] = await db
      .insert(schema.locations)
      .values(location)
      .returning();
    return newLocation;
  }

  async updateLocation(id: number, locationData: Partial<InsertLocation>): Promise<Location | undefined> {
    const [location] = await db
      .update(schema.locations)
      .set(locationData)
      .where(eq(schema.locations.id, id))
      .returning();
    return location;
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, id));
    return room || undefined;
  }

  async getRoomsByLocation(locationId: number): Promise<Room[]> {
    return db.select().from(schema.rooms).where(eq(schema.rooms.locationId, locationId));
  }

  async getAllRooms(): Promise<Room[]> {
    return db.select().from(schema.rooms);
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db
      .insert(schema.rooms)
      .values(room)
      .returning();
    return newRoom;
  }

  async updateRoom(id: number, roomData: Partial<InsertRoom>): Promise<Room | undefined> {
    const [room] = await db
      .update(schema.rooms)
      .set(roomData)
      .where(eq(schema.rooms.id, id))
      .returning();
    return room;
  }

  async getReservation(id: number): Promise<Reservation | undefined> {
    const [reservation] = await db.select().from(schema.reservations).where(eq(schema.reservations.id, id));
    return reservation || undefined;
  }

  async getReservationsByRoom(roomId: number): Promise<Reservation[]> {
    return db.select().from(schema.reservations).where(eq(schema.reservations.roomId, roomId));
  }

  async getReservationsByRoomAndDate(roomId: number, date: Date): Promise<Reservation[]> {
    // Convert date to start and end of day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    return db.select().from(schema.reservations).where(
      and(
        eq(schema.reservations.roomId, roomId),
        sql`${schema.reservations.reservationDate} >= ${startDate}`,
        sql`${schema.reservations.reservationDate} <= ${endDate}`
      )
    );
  }
  
  async getReservationsByDate(date: Date): Promise<Reservation[]> {
    // Convert date to start and end of day for a range query
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    // Format dates for logging
    const formattedDate = format(date, 'yyyy-MM-dd');
    console.log(`Looking for reservations between: ${format(startDate, 'yyyy-MM-dd HH:mm:ss')} and ${format(endDate, 'yyyy-MM-dd HH:mm:ss')}`);
    
    // Use a date range query with PostgreSQL's BETWEEN operator for more reliable results
    const reservations = await db.select().from(schema.reservations)
      .where(sql`${schema.reservations.reservationDate} BETWEEN ${startDate} AND ${endDate}`);
    
    console.log(`Found ${reservations.length} reservations for ${formattedDate}`);
    
    // Debug the time values to help diagnose issues
    if (reservations.length > 0) {
      reservations.forEach(res => {
        console.log(`Reservation #${res.id}: 
        - Date: ${format(new Date(res.reservationDate), 'yyyy-MM-dd')}
        - Start: ${format(new Date(res.startTime), 'HH:mm:ss')}
        - End: ${format(new Date(res.endTime), 'HH:mm:ss')}`);
      });
    } else {
      console.log(`No reservations found for date: ${formattedDate}`);
    }
    
    return reservations;
  }

  async getReservationsByUser(userId: number): Promise<Reservation[]> {
    return db.select().from(schema.reservations).where(eq(schema.reservations.userId, userId));
  }

  async getAllReservations(): Promise<Reservation[]> {
    return db.select().from(schema.reservations);
  }

  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    // Force time parsing in Eastern Time if start/end are strings
    const startTime = typeof reservation.startTime === 'string'
      ? DateTime.fromISO(reservation.startTime, { zone: 'America/New_York' }).toJSDate()
      : reservation.startTime;

    const endTime = typeof reservation.endTime === 'string'
      ? DateTime.fromISO(reservation.endTime, { zone: 'America/New_York' }).toJSDate()
      : reservation.endTime;

    const [newReservation] = await db
      .insert(schema.reservations)
      .values({
        ...reservation,
        startTime,
        endTime
      })
      .returning();

    return newReservation;
  }

  async updateReservation(id: number, reservationData: Partial<InsertReservation>): Promise<Reservation | undefined> {
    const [reservation] = await db
      .update(schema.reservations)
      .set(reservationData)
      .where(eq(schema.reservations.id, id))
      .returning();
    return reservation;
  }

  async cancelReservation(id: number): Promise<Reservation | undefined> {
    // Mark reservation as canceled
    const [reservation] = await db
      .update(schema.reservations)
      .set({ status: 'cancelled' })
      .where(eq(schema.reservations.id, id))
      .returning();
    return reservation;
  }

  // Initialize sample data for rooms and locations - but only if they don't exist
  async initializeSampleData() {
    // Check if we have any rooms
    const existingRooms = await this.getAllRooms();
    if (existingRooms.length > 0) {
      console.log("Sample data already exists, skipping initialization");
      return;
    }

    console.log("Initializing sample data...");

    // Create admin user
    const adminUser: InsertUser = {
      username: "admin",
      password: "$2b$10$ccQJwNDq7s.tZRjL4Owpe.481dWkVfnB2zIWENEAjLNsDRuNwUlTm", // "admin123"
      name: "Administrator",
      email: "admin@library.org",
      isAdmin: true,
      createdAt: new Date()
    };
    await this.createUser(adminUser);

    // Create regular user
    const regularUser: InsertUser = {
      username: "user",
      password: "$2b$10$ybYRDq/CTx9lEz4JN1t.w.QKgg8zsgxfzCFZ9FCIlV0yUKN0s0YN6", // "user123"
      name: "Regular User",
      email: "user@example.com",
      isAdmin: false,
      createdAt: new Date()
    };
    await this.createUser(regularUser);

    // Create locations
    const southLocation: InsertLocation = {
      name: "South Boulevard Branch",
      address: "4310 South Blvd, Charlotte, NC 28209",
      city: "Charlotte",
      state: "NC",
      zipCode: "28209",
      phoneNumber: "704-555-0123",
      description: "The South Boulevard Branch is a state-of-the-art facility offering quiet study spaces, meeting rooms, and advanced technology resources."
    };
    const createdSouthLocation = await this.createLocation(southLocation);

    const universityLocation: InsertLocation = {
      name: "University Branch",
      address: "301 East W.T. Harris Blvd, Charlotte, NC 28262",
      city: "Charlotte",
      state: "NC",
      zipCode: "28262",
      phoneNumber: "704-555-0456",
      description: "Located near UNC Charlotte, this branch specializes in academic resources and study environments for university students and faculty."
    };
    const createdUniversityLocation = await this.createLocation(universityLocation);

    // Create rooms for South Boulevard
    await this.createRoom({
      name: "Group Study Room",
      capacity: 12,
      description: "A large meeting room ideal for group study sessions and collaborative projects. The room includes a large table with 12 chairs, a wall-mounted TV for presentations, and a whiteboard.",
      locationId: createdSouthLocation.id,
      features: ["Whiteboard", "TV with HDMI", "Conference Phone", "WiFi"],
      floor: 2,
      roomNumber: "201"
    });

    await this.createRoom({
      name: "Study Room 1",
      capacity: 5,
      description: "Medium-sized room suitable for small group discussions. Includes a round table with 5 chairs and a wall-mounted whiteboard.",
      locationId: createdSouthLocation.id,
      features: ["Whiteboard", "WiFi", "Standing Desk"],
      floor: 1,
      roomNumber: "101"
    });

    await this.createRoom({
      name: "Study Room 2",
      capacity: 5,
      description: "Medium-sized room suitable for small group discussions. Includes a round table with 5 chairs and a wall-mounted whiteboard.",
      locationId: createdSouthLocation.id,
      features: ["Whiteboard", "WiFi", "Power Outlets"],
      floor: 1,
      roomNumber: "102"
    });

    await this.createRoom({
      name: "Study Room 3",
      capacity: 2,
      description: "A small, quiet room ideal for individual or paired study sessions. Includes a small desk with 2 chairs.",
      locationId: createdSouthLocation.id,
      features: ["Small Desk", "WiFi", "Quiet Area"],
      floor: 1,
      roomNumber: "103"
    });

    await this.createRoom({
      name: "Study Room 4",
      capacity: 2,
      description: "A small, quiet room ideal for individual or paired study sessions. Includes a small desk with 2 chairs.",
      locationId: createdSouthLocation.id,
      features: ["Small Desk", "WiFi", "Quiet Area"],
      floor: 1,
      roomNumber: "104"
    });

    await this.createRoom({
      name: "Study Room 5",
      capacity: 2,
      description: "A small, quiet room ideal for individual or paired study sessions. Includes a small desk with 2 chairs and a nice window view.",
      locationId: createdSouthLocation.id,
      features: ["Small Desk", "WiFi", "Quiet Area", "Window View"],
      floor: 1,
      roomNumber: "105"
    });

    // Create rooms for University Branch
    await this.createRoom({
      name: "Collaboration Lab",
      capacity: 20,
      description: "Large open space designed for collaborative projects. Features movable furniture, multiple whiteboards, and advanced presentation technology.",
      locationId: createdUniversityLocation.id,
      features: ["Multiple Whiteboards", "Projector", "Movable Furniture", "WiFi", "Video Conference"],
      floor: 2,
      roomNumber: "201"
    });

    await this.createRoom({
      name: "Quiet Study Room 1",
      capacity: 4,
      description: "Soundproof room ideal for focused study. Includes a table with 4 chairs and dimmable lighting.",
      locationId: createdUniversityLocation.id,
      features: ["Soundproof", "Dimmable Lighting", "WiFi", "Power Outlets"],
      floor: 3,
      roomNumber: "301"
    });

    await this.createRoom({
      name: "Quiet Study Room 2",
      capacity: 4,
      description: "Soundproof room ideal for focused study. Includes a table with 4 chairs and dimmable lighting.",
      locationId: createdUniversityLocation.id,
      features: ["Soundproof", "Dimmable Lighting", "WiFi", "Power Outlets"],
      floor: 3,
      roomNumber: "302"
    });

    console.log("Sample data initialization complete");
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();

// Initialize sample data
storage.initializeSampleData().catch(err => {
  console.error("Error initializing sample data:", err);
});
