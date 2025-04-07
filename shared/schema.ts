import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with admin flag
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// Locations (library branches)
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phoneNumber: text("phone_number"),
  isActive: boolean("is_active").default(true)
});

// Rooms available for reservation
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
  description: text("description"),
  features: text("features").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Reservations
export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => rooms.id),
  userId: integer("user_id").references(() => users.id),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  reservationDate: date("reservation_date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  purpose: text("purpose"),
  status: text("status").default("confirmed"),  // confirmed, cancelled, pending
  confirmationCode: text("confirmation_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  isAdmin: true
});

export const insertLocationSchema = createInsertSchema(locations).pick({
  name: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  phoneNumber: true,
  isActive: true
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  locationId: true,
  name: true,
  capacity: true,
  description: true,
  features: true,
  isActive: true
});

export const insertReservationSchema = createInsertSchema(reservations).pick({
  roomId: true,
  userId: true,
  guestName: true,
  guestEmail: true,
  reservationDate: true,
  startTime: true,
  endTime: true,
  purpose: true,
  status: true,
  confirmationCode: true,
  notes: true
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservations.$inferSelect;
