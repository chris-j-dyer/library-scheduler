import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { UserIcon, ShieldCheckIcon, Info, Wifi, Tv, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, setHours, addHours, isSameDay, parseISO, differenceInHours } from "date-fns";
import { Room as SchemaRoom, Reservation as SchemaReservation } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useLocation } from "wouter";

// Utility function to safely format dates
const safeFormat = (date: Date | string | null | undefined, formatString: string): string => {
  if (!date) return '';

  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date as Date;
  }

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    console.error('Invalid date provided to safeFormat:', date);
    return 'Invalid Date';
  }

  try {
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return 'Error';
  }
};

// Interface for room data with location string (for display)
interface Room extends SchemaRoom {
  location?: string; // Display location (branch + floor)
}

// Time slot representation for UI
type TimeSlot = {
  hour: number;
  isAvailable: boolean;
  isWeekendClosed?: boolean; // Special flag for weekend closed hours
};

// Client-side representation of reservation with parsed dates
interface Reservation {
  // Core ID and tracking fields
  id: number;
  roomId: number;
  userId: number | null;
  
  // Guest information
  guestName: string | null;
  guestEmail: string | null;
  
  // Date and time fields
  reservationDate: string; // ISO date string (DB format)
  startTime: Date; // Parsed date object for UI manipulation
  endTime: Date; // Parsed date object for UI manipulation
  
  // Reservation details
  purpose: string | null;
  status: string; // confirmed, cancelled, pending
  confirmationCode: string | null;
  notes: string | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date | null;
  
  // Client-side display properties
  date: Date; // Parsed date object for the reservation date
  userName?: string; // Display name (guest name or user name)
  userEmail?: string; // Display email (guest email or user email)
};

// Sample room data - updated to match schema
const roomsData: Room[] = [
  {
    id: 1,
    name: "Group Study Room",
    capacity: 12,
    locationId: 1,
    floor: 2,
    roomNumber: "A201",
    isActive: true,
    createdAt: new Date(),
    location: "South Boulevard - 2nd Floor", // Display location (not in schema)
    features: ["Whiteboard", "TV with HDMI", "Conference Phone", "WiFi"],
    description: "A large meeting room ideal for group study sessions and collaborative projects. The room includes a large table with 12 chairs, a wall-mounted TV for presentations, and a whiteboard."
  },
  {
    id: 2,
    name: "Study Room 1",
    capacity: 5,
    locationId: 1,
    floor: 1,
    roomNumber: "A101",
    isActive: true,
    createdAt: new Date(),
    location: "South Boulevard - 1st Floor", // Display location (not in schema)
    features: ["Whiteboard", "WiFi", "Standing Desk"],
    description: "Medium-sized room suitable for small group discussions. Includes a round table with 5 chairs and a wall-mounted whiteboard."
  },
  {
    id: 3,
    name: "Study Room 2",
    capacity: 5,
    locationId: 1,
    floor: 1,
    roomNumber: "A102",
    isActive: true,
    createdAt: new Date(),
    location: "South Boulevard - 1st Floor", // Display location (not in schema)
    features: ["Whiteboard", "WiFi", "Power Outlets"],
    description: "Medium-sized room suitable for small group discussions. Includes a round table with 5 chairs and a wall-mounted whiteboard."
  },
  {
    id: 4,
    name: "Study Room 3",
    capacity: 2,
    locationId: 1,
    floor: 1,
    roomNumber: "Q101",
    isActive: true,
    createdAt: new Date(),
    location: "South Boulevard - Quiet Zone", // Display location (not in schema)
    features: ["Small Desk", "WiFi", "Quiet Area"],
    description: "A small, quiet room ideal for individual or paired study sessions. Includes a small desk with 2 chairs."
  },
  {
    id: 5,
    name: "Study Room 4",
    capacity: 2,
    locationId: 1,
    floor: 1,
    roomNumber: "Q102",
    isActive: true,
    createdAt: new Date(),
    location: "South Boulevard - Quiet Zone", // Display location (not in schema)
    features: ["Small Desk", "WiFi", "Quiet Area"],
    description: "A small, quiet room ideal for individual or paired study sessions. Includes a small desk with 2 chairs."
  },
  {
    id: 6,
    name: "Study Room 5",
    capacity: 2,
    locationId: 1,
    floor: 1,
    roomNumber: "Q103",
    isActive: true,
    createdAt: new Date(),
    location: "South Boulevard - Quiet Zone", // Display location (not in schema)
    features: ["Small Desk", "WiFi", "Quiet Area", "Window View"],
    description: "A small, quiet room ideal for individual or paired study sessions. Includes a small desk with 2 chairs and a nice window view."
  }
];

// Sample reservations (would typically come from API/database)
const initialReservations: Reservation[] = [
  {
    id: 1,
    roomId: 1,
    userId: null,
    guestName: "John Smith",
    guestEmail: "john@example.com",
    reservationDate: "2025-04-07", // ISO format for DB
    startTime: setHours(new Date(2025, 3, 7), 14), // 2pm
    endTime: setHours(new Date(2025, 3, 7), 20), // 8pm
    purpose: "Study Group",
    status: "confirmed",
    confirmationCode: "LIB-123456",
    notes: null,
    createdAt: new Date(),
    updatedAt: null,
    // Client-side properties for UI
    date: new Date(2025, 3, 7),
    userName: "John Smith",
    userEmail: "john@example.com"
  },
  {
    id: 2,
    roomId: 2,
    userId: null,
    guestName: "Sarah Johnson",
    guestEmail: "sarah@example.com",
    reservationDate: "2025-04-07", // ISO format for DB
    startTime: setHours(new Date(2025, 3, 7), 14),
    endTime: setHours(new Date(2025, 3, 7), 20),
    purpose: "Research",
    status: "confirmed",
    confirmationCode: "LIB-789012",
    notes: null,
    createdAt: new Date(),
    updatedAt: null,
    // Client-side properties for UI
    date: new Date(2025, 3, 7),
    userName: "Sarah Johnson", 
    userEmail: "sarah@example.com"
  }
];

// Define props for RoomList component
interface RoomListProps {
  selectedDate: Date;
  capacityFilter: string;
}

  export default function RoomList({ selectedDate, capacityFilter }: RoomListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRoomInfoOpen, setIsRoomInfoOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [userName, setUserName] = useState(user ? (user.name || user.username) : "");
  const [userEmail, setUserEmail] = useState(user ? (user.email || "") : "");
  const [purpose, setPurpose] = useState("");
  const [localDate, setLocalDate] = useState(new Date(selectedDate));
  const [, setLocation] = useLocation(); // The first element is current path, second is navigate function

  // Check if selectedDate is valid early
  useEffect(() => {
    // Step 4 console logs
    console.log('RoomList initializing with selectedDate:', selectedDate);
    console.log('RoomList selectedDate type:', Object.prototype.toString.call(selectedDate));
    console.log('RoomList selectedDate valid?', selectedDate instanceof Date && !isNaN(selectedDate.getTime()));
    
    if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      console.error('Invalid selectedDate provided to RoomList component:', selectedDate);
      // Use current date as fallback
      const today = new Date();
      console.log('Using today as fallback:', today);
      setLocalDate(today);
    } else {
      // Clone the date to avoid reference issues
      setLocalDate(new Date(selectedDate));
    }
  }, [selectedDate]);

  // Define this at the very top of the component, right after the RoomList function declaration
  function generateSlotId(roomId: number, hour: number, dateObject: Date) {
    const dateStr = format(dateObject, 'yyyyMMdd'); 
    const paddedRoomId = roomId.toString().padStart(2, '0');
    const paddedHour = hour.toString().padStart(2, '0');
    console.log(`Generated slot ID for room ${roomId}, hour ${hour}, date ${dateStr}: ${paddedRoomId}${paddedHour}${dateStr}`);
    return `${paddedRoomId}${paddedHour}${dateStr}`;
  }
  
  // Add local date state that can be used to force re-renders
  const websocketRef = useRef<WebSocket | null>(null);
  
  // Update user info when user changes (logs in/out)
  useEffect(() => {
    if (user) {
      setUserName(user.name || user.username);
      setUserEmail(user.email || "");
    } else {
      setUserName("");
      setUserEmail("");
    }
  }, [user]);
  
  // Transform raw API data into client-side reservation objects
  const transformReservations = useCallback((data: any[]): Reservation[] => {
    console.log("Raw data from API:", JSON.stringify(data));

    return data.map((res: any) => {
      console.log(`Processing reservation #${res.id}, roomId=${res.roomId}, status=${res.status || 'confirmed'}`);

      try {
        console.log("🔍 Raw incoming startTime from API:", res.startTime);

        // Fix to force reservation date to local noon so it never shifts backward
        const resDate = DateTime.fromISO(res.reservationDate).toJSDate();
        const startTime = DateTime.fromISO(res.startTime, { zone: 'utc' }).setZone('America/New_York').toJSDate();
        const endTime = DateTime.fromISO(res.endTime, { zone: 'utc' }).setZone('America/New_York').toJSDate();

        const reservation: Reservation = {
          id: res.id,
          roomId: res.roomId,
          userId: res.userId || null,
          guestName: res.guestName || null,
          guestEmail: res.guestEmail || null,
          reservationDate: res.reservationDate,
          startTime,
          endTime,
          purpose: res.purpose || 'Reservation',
          status: res.status || 'confirmed',
          confirmationCode: res.confirmationCode || null,
          notes: res.notes || null,
          createdAt: res.createdAt ? new Date(res.createdAt) : new Date(),
          updatedAt: res.updatedAt ? new Date(res.updatedAt) : null,
          date: resDate,
          userName: res.userId ? (res.userName || 'User') : res.guestName,
          userEmail: res.userId ? (res.userEmail || '') : res.guestEmail
        };

        console.log(`Processed reservation #${reservation.id}:`, {
          roomId: reservation.roomId,
          date: format(reservation.date, 'yyyy-MM-dd'),
          time: `${safeFormat(reservation.startTime, 'HH:mm')}-${safeFormat(reservation.endTime, 'HH:mm')}`,
          status: reservation.status
        });

        return reservation;
      } catch (error) {
        console.error(`Error processing reservation data:`, error, res);
        return {
          ...res,
          startTime: new Date(res.startTime || Date.now()),
          endTime: new Date(res.endTime || Date.now()),
          date: new Date(res.reservationDate || Date.now()),
          status: res.status || 'confirmed',
        } as Reservation;
      }
    });
  }, []);
  
  // Fetch reservations for the selected date using React Query
  const formattedDate = selectedDate instanceof Date && !isNaN(selectedDate.getTime()) 
    ? format(selectedDate, 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd'); // Use today as fallback

  const reservationsQuery = useQuery({
    queryKey: ['/api/reservations/by-date', formattedDate],
    queryFn: async () => {
      console.log(`Fetching reservations for date: ${formattedDate}`);
      const response = await fetch(`/api/reservations/by-date/${formattedDate}`);

      if (!response.ok) {
        console.error(`Error response from server: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch reservations');
      }

      const data = await response.json();
      console.log('Reservations data received:', data);
      return data;
    },
    select: transformReservations,
    staleTime: 0, // Consider data always stale to force refresh when returning
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gets focus (returning from another tab/page)
  });

  useEffect(() => {
    if (reservationsQuery.isSuccess && reservationsQuery.data) {
      console.log("✅ New reservation data fetched, triggering availability map rebuild");
      console.log("📦 Received reservations from API:", reservationsQuery.data);
      setLocalDate(new Date()); // <- this forces a re-render
    }
  }, [reservationsQuery.data]);
  
  // Handle errors from the query
  if (reservationsQuery.error) {
    console.error('Error in reservations query:', reservationsQuery.error);
    toast({
      title: "Error",
      description: "Failed to load room reservations",
      variant: "destructive"
    });
  }

  // Step 4: Refetch reservations every time the selected date changes
  useEffect(() => {
    if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      console.warn("Step 4: selectedDate is invalid, skipping reservation refetch.");
      return;
    }

    console.log("Step 4: selectedDate changed — triggering reservation refetch");
    reservationsQuery.refetch();
  }, [selectedDate, reservationsQuery]);
  
  // Extract reservations from query result
  const reservations = reservationsQuery.data || [];

  // Filter rooms based on selected capacity
  const filteredRooms = roomsData.filter((room) => {
    switch (capacityFilter) {
      case "1-4":
        return room.capacity <= 4;
      case "5-8":
        return room.capacity >= 5 && room.capacity <= 8;
      case "9-12":
        return room.capacity >= 9 && room.capacity <= 12;
      case "all-spaces":
      default:
        return true;
    }
  });
  
  // Function to mark a reservation in the availability map
  const markReservationSlots = useCallback((reservation: any, force = false) => {
    const resDate = new Date(reservation.reservationDate);
    const startTime = new Date(reservation.startTime);
    const endTime = new Date(reservation.endTime);
    
    // Only process if it's for the selected date
    if (!isSameDay(resDate, selectedDate) && !force) {
      return false;
    }
    
    // Get hours for this reservation
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    const roomId = reservation.roomId;
    
    // Generate a list of slots that are now occupied
    const occupiedSlots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      // Generate unique ID for this slot
      const dateStr = format(selectedDate, 'yyyyMMdd');
      const paddedRoomId = roomId.toString().padStart(2, '0');
      const paddedHour = hour.toString().padStart(2, '0');
      const slotId = generateSlotId(roomId, hour, selectedDate);

      // ✅ STEP 1 log: show which slot this reservation is blocking
      console.log(`⛔ Marking slot ${slotId} as unavailable due to reservation ${reservation.id}`);

      occupiedSlots.push(slotId);
    }
    
    // Log the occupied slots
    if (occupiedSlots.length > 0) {
      console.log(`Marking following slots as occupied from reservation #${reservation.id}:`, occupiedSlots);
      return true;
    }
    
    return false;
  }, [selectedDate]);
  
  // Setup WebSocket connection with proper dependencies and cleanup
  useEffect(() => {
    console.log("Setting up WebSocket connection with localDate:", format(localDate, 'yyyy-MM-dd'));
    
    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Close any existing connection before creating a new one
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      console.log('Closing existing WebSocket connection before creating a new one');
      websocketRef.current.close();
    }
    
    const socket = new WebSocket(wsUrl);
    websocketRef.current = socket;
    
    // Define all event handlers as named functions so they can be properly removed
    const handleOpen = () => {
      console.log('WebSocket connection established');
    };
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        // Use the current localDate value for all operations to ensure consistency
        const formattedDate = format(localDate, 'yyyy-MM-dd');
        
        // Handle different message types
        if (message.type === 'new_reservation') {
          // Get reservation data from the message
          const reservation = message.data;
          const reservationDate = new Date(reservation.reservationDate);
          
          // If this reservation is for the selected date, update our data
          if (isSameDay(reservationDate, localDate)) {
            console.log('WebSocket received new reservation for selected date:', reservation);
            
            // First update the query cache with the new reservation
            queryClient.setQueryData(
              ['/api/reservations/by-date', formattedDate],
              (oldData: any[] | undefined) => {
                if (!oldData) return [reservation];
                
                // Add the new reservation if it's not already there
                const exists = oldData.some(r => r.id === reservation.id);
                if (!exists) {
                  console.log(`Adding reservation #${reservation.id} to cache`);
                  return [...oldData, reservation];
                }
                return oldData;
              }
            );
            
            // Then immediately invalidate to force a refetch
            queryClient.invalidateQueries({ 
              queryKey: ['/api/reservations/by-date', formattedDate] 
            });
            
            // Mark this reservation's slots
            const slotsChanged = markReservationSlots(reservation);
            
            // Show toast notification
            toast({
              title: "New Reservation",
              description: `Room ${reservation.roomId} has been reserved`,
            });
            
            // Force a refresh if slots were changed
            if (slotsChanged) {
              // Force component to re-render immediately
              setLocalDate(new Date(localDate));
            }
          }
        } else if (message.type === 'cancelled_reservation') {
          // Similar handling for cancelled reservations
          const reservation = message.data;
          const reservationDate = new Date(reservation.reservationDate);
          
          if (isSameDay(reservationDate, localDate)) {
            // Invalidate the query for the selected date
            queryClient.invalidateQueries({ 
              queryKey: ['/api/reservations/by-date', formattedDate] 
            });
            
            // Force a refresh immediately
            setLocalDate(new Date(localDate));
            
            toast({
              title: "Reservation Cancelled",
              description: `A reservation for Room ${reservation.roomId} has been cancelled`,
            });
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    const handleClose = () => {
      console.log('WebSocket connection closed');
    };
    
    const handleError = (event: Event) => {
      console.error('WebSocket error:', event);
    };
    
    // Add event listeners
    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);
    
    // Cleanup on unmount or when dependencies change
    return () => {
      console.log('Cleaning up WebSocket connection');
      // Remove all event listeners to prevent memory leaks
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleError);
      
      // Close the connection
      if (socket.readyState === WebSocket.OPEN) {
        console.log('Closing WebSocket connection during cleanup');
        socket.close();
      }
    };
  }, [localDate, queryClient, toast, markReservationSlots]);

  // Add this after your other useEffects - usually around line 300-350
  useEffect(() => {
    // This will run when the component mounts or when you return to this page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page is now visible (user returned to this tab)
        console.log('Page visible, refreshing reservations');
        reservationsQuery.refetch();
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Refresh on initial mount too
    reservationsQuery.refetch();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reservationsQuery]);
  
  // Create a direct room+timeslot mapping for each reservation
  console.log("⏳ Rebuilding availability map for selectedDate:", selectedDate, "with", reservations.length, "reservations");
  console.log("📦 Received reservations from API in RoomList:", reservations);
  const buildAvailabilityMap = useMemo(() => {
    // Create map to hold all availability data: Map<UniqueSlotId, boolean>
    const availabilityMap = new Map<string, boolean>();

    // ✅ STEP 1 DEBUG
    console.log("✅ availabilityMap useMemo is running");
    
    // Pre-populate all slots as available (except weekend after hours)
    const selectedDateStr = format(selectedDate, 'yyyyMMdd');
    for (const room of roomsData) {
      for (let hour = 9; hour <= 20; hour++) {
        const isWeekend = [0, 6].includes(selectedDate.getDay());
        const isAfterWeekendHours = isWeekend && hour >= 17;
        
        // Generate a unique ID for this slot
        const slotId = generateSlotId(room.id, hour, selectedDate);
        
        // Mark as available unless it's after hours on weekend
        availabilityMap.set(slotId, !isAfterWeekendHours);
      }
    }

    console.log("📅 Building availability map with the following reservations:");
    reservations.forEach(r => {
      console.log(`- Reservation #${r.id}: Room ${r.roomId}, ${format(r.startTime, 'HH:mm')}–${format(r.endTime, 'HH:mm')}, Status: ${r.status}, Date: ${r.reservationDate}`);
    });
        
    // Mark booked slots as unavailable
    console.log(`Marking reserved slots from ${reservations.length} reservations`);
    for (const reservation of reservations) {
      if (reservation.status === 'cancelled') {
        console.log(`⏭ Skipping cancelled reservation #${reservation.id}`);
        continue;
      }

      const resDate = reservation.date || new Date(reservation.reservationDate);
      if (!isSameDay(resDate, selectedDate)) {
        console.log(`⏭ Skipping reservation #${reservation.id} — date mismatch:`, format(resDate, 'yyyy-MM-dd'), 'vs', format(selectedDate, 'yyyy-MM-dd'));
        continue;
      }

      const startTime = typeof reservation.startTime === 'string'
        ? new Date(reservation.startTime)
        : reservation.startTime;

      const endTime = typeof reservation.endTime === 'string'
        ? new Date(reservation.endTime)
        : reservation.endTime;

      const startHour = startTime.getHours();
      const endHour = endTime.getHours();

      console.log(`⛔ Reservation #${reservation.id} blocking room ${reservation.roomId} from ${startHour} to ${endHour}`);

      for (let hour = startHour; hour < endHour; hour++) {
        const slotId = generateSlotId(reservation.roomId, hour, selectedDate);
        availabilityMap.set(slotId, false);
        console.log(`❌ Marked slot ${slotId} as unavailable`);
      }
    }

    // ✅ Add this here:
    console.log('✅ Final availability map:', Array.from(availabilityMap.entries()));
    
    return {
      // Check if a slot is available
      isSlotAvailable: (roomId: number, hour: number) => {
        const slotId = generateSlotId(roomId, hour, selectedDate);
        return availabilityMap.get(slotId) || false;
      },
      // Debug function to get all unavailable slots
      getUnavailableSlots: () => {
        return Array.from(availabilityMap.entries())
          .filter(([_, isAvailable]) => !isAvailable)
          .map(([slotId]) => slotId);
      }
    };
  }, [reservations, selectedDate, roomsData]);
  
  // Simplified availability check function that considers both our map and manual overrides
  const isTimeSlotAvailable = (roomId: number, hour: number) => {
    return buildAvailabilityMap.isSlotAvailable(roomId, hour);
  };
  
  // Generate schedule for each room
  const getRoomSchedule = (roomId: number) => {
    // Create array of time slots from 9am to 8pm
    const timeSlots: TimeSlot[] = [];
    
    // Start at 9am (9:00) and go until 8pm (20:00)
    for (let hour = 9; hour <= 20; hour++) {
      // Check if it's a weekend and time is after 5pm - library closes earlier on weekends
      const isWeekend = [0, 6].includes(selectedDate.getDay()); // 0 = Sunday, 6 = Saturday
      const isAfterWeekendHours = isWeekend && hour >= 17; // 5pm and later on weekends
      
      // Get availability from our pre-computed map
      const isAvailable = buildAvailabilityMap.isSlotAvailable(roomId, hour) && !isAfterWeekendHours;
      
      timeSlots.push({
        hour,
        isAvailable
      });

      // ⬇️ THIS is where to add your log
      console.log(`Rendering room ${roomId}, hour ${hour}, available: ${isAvailable}`);
    }
    
    // Log all unavailable slots for debugging
    console.log("All unavailable slots:", buildAvailabilityMap.getUnavailableSlots());
    
    return timeSlots;
  };
  
  const handleTimeSlotClick = (roomId: number, hour: number, isAvailable: boolean, event: React.MouseEvent) => {
    if (!isAvailable) {
      toast({
        title: "Time slot not available",
        description: "Please select an available time slot",
        variant: "destructive"
      });
      return;
    }

    // Get the clicked element to update it later
    const clickedCell = event.currentTarget;

    const room = roomsData.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      setSelectedTimeSlot(hour);
      setSelectedDuration(1); // Default to 1 hour
      setIsModalOpen(true);
    }
  };
  
  const handleRoomInfoClick = (roomId: number) => {
    const room = roomsData.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      setIsRoomInfoOpen(true);
    }
  };
  
  const handleBookingSubmit = async () => {
    if (!selectedRoom || selectedTimeSlot === null) return;

    if (!userName || !userEmail) {
      toast({
        title: "Missing information",
        description: "Please provide your name and email",
        variant: "destructive"
      });
      return;
    }

    // Validate selected date before proceeding
    if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      console.error("Invalid selectedDate:", selectedDate);
      toast({
        title: "Date Error",
        description: "There was an error with the selected date. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Prepare reservation data for API with exact hours
    // Create dates with minutes and seconds set to zero
    const startDate = new Date(selectedDate);

    // Validate startDate before setting hours
    if (isNaN(startDate.getTime())) {
      console.error("Invalid startDate:", startDate);
      toast({
        title: "Date Error",
        description: "There was an error processing the reservation time. Please try again.",
        variant: "destructive"
      });
      return;
    }

    startDate.setHours(selectedTimeSlot, 0, 0, 0);

    const endDate = new Date(selectedDate);

    // Validate endDate before setting hours
    if (isNaN(endDate.getTime())) {
      console.error("Invalid endDate:", endDate);
      toast({
        title: "Date Error",
        description: "There was an error processing the reservation time. Please try again.",
        variant: "destructive"
      });
      return;
    }

    endDate.setHours(selectedTimeSlot + selectedDuration, 0, 0, 0);

    // Log the dates for debugging
    console.log("Booking dates:", {
      selectedDate: selectedDate,
      startDate: startDate,
      endDate: endDate,
      startHour: selectedTimeSlot,
      endHour: selectedTimeSlot + selectedDuration
    });
    
    const startHour = selectedTimeSlot;
    const endHour = selectedTimeSlot + selectedDuration;
    
    try {
      // Format Date as ISO string in EST/EDT (America/New_York)
      const formatEST = (date: Date) =>
        date.toLocaleString('sv-SE', { timeZone: 'America/New_York', hour12: false }).replace(' ', 'T');

      // Create reservation data with validated dates
      const reservationData = {
        roomId: selectedRoom.id,
        // Format dates as strings for API compatibility with validation
        reservationDate: safeFormat(selectedDate, 'yyyy-MM-dd'),
        startTime: formatEST(startDate), // ⬅️ EST
        endTime: formatEST(endDate),     // ⬅️ EST
        purpose: purpose || "Study session",
        guestName: userName,
        guestEmail: userEmail,
        status: "pending_payment", // Set initial status to pending payment
        // Calculate price in cents based on duration: $5 per hour
        priceInCents: selectedDuration * 500, // $5 per hour in cents
        confirmationCode: `LIB-${Math.floor(100000 + Math.random() * 900000)}`
      };

      // Call the API to create reservation
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData),
        credentials: 'include' // Include auth cookies
      });

      if (!response.ok) {
        throw new Error('Failed to create reservation');
      }

      let newReservation;
      try {
        newReservation = await response.json();
        console.log("Parsed reservation response:", newReservation);
      } catch (parseError) {
        console.error("Failed to parse reservation response JSON:", parseError);
        throw new Error("Invalid reservation response format");
      }

      // Map the API response to a client-side reservation with validated dates
      const clientReservation: Reservation = {
        // Include all fields from the server response
        ...newReservation,
        // Override with properly parsed dates
        reservationDate: safeFormat(selectedDate, 'yyyy-MM-dd'), // ISO format string for DB
        startTime: startDate, // Date object for UI manipulation
        endTime: endDate, // Date object for UI manipulation
        // Make sure we have the right userId (for logged in users) or guest info
        userId: user?.id || null,
        guestName: user ? null : userName,
        guestEmail: user ? null : userEmail,
        // Status should always be "confirmed" for new reservations
        status: "confirmed",
        // Set creation timestamp if not provided by server
        createdAt: newReservation.createdAt ? new Date(newReservation.createdAt) : new Date(),
        updatedAt: newReservation.updatedAt ? new Date(newReservation.updatedAt) : null,
        // Add client-side display properties
        date: selectedDate, // Parsed date for UI (backward compatibility)
        userName, // Display name for UI
        userEmail // Display email for UI
      };

      // Update the query cache with the new reservation data
      queryClient.setQueryData(
        ['/api/reservations/by-date', formattedDate],
        (oldData: any[] | undefined) => {
          if (!oldData) return [newReservation];
          return [...oldData, newReservation];
        }
      );

      // Also invalidate the query to ensure it will be refetched next time
      queryClient.invalidateQueries({ 
        queryKey: ['/api/reservations/by-date', formattedDate] 
      });

      // Actually refetch it immediately and wait for it to finish
      await queryClient.refetchQueries({
        queryKey: ['/api/reservations/by-date', formattedDate]
      });

      // Force a rerender to update the UI immediately
      setLocalDate(new Date(selectedDate));

      // Close booking modal
      setIsModalOpen(false);
      
      // Redirect to payment page with the reservation ID
      setLocation(`/payment/${newReservation.id}`);

    } catch (error) {
      console.error('Error creating reservation:', error);
      toast({
        title: "Reservation Failed",
        description: "There was an error creating your reservation. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const formatTimeSlot = (hour: number) => {
    // Create a new date and set both hours and minutes (setting minutes to 0)
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return format(date, 'h:00 a');
  };
  
  const handleDurationChange = (value: string) => {
    setSelectedDuration(parseInt(value));
  };
  
  const closeConfirmation = () => {
    setIsConfirmationOpen(false);
    // Reset form
    setSelectedRoom(null);
    setSelectedTimeSlot(null);
    // Only reset user info if not logged in
    if (!user) {
      setUserName("");
      setUserEmail("");
    }
    setPurpose("");
    
    toast({
      title: "Booking confirmed",
      description: "Your room has been successfully reserved",
    });
  };
  
  // Calculate end time based on start time and duration
  const getEndTime = () => {
    if (selectedTimeSlot === null) return "";
    // Create a new date, set hours to selected time slot and minutes to 0, then add the duration
    const date = new Date();
    date.setHours(selectedTimeSlot, 0, 0, 0);
    const endTime = addHours(date, selectedDuration);
    return format(endTime, 'h:00 a');
  };
  
  // Function to check if a time slot is bookable (available and within booking constraints)
  const isTimeSlotBookable = (roomId: number, hour: number, consecutive: number = 1) => {
    // Log all reservations for debugging
    console.log(`ALL RESERVATIONS (${reservations.length} total):`, JSON.stringify(reservations.map(r => ({
      id: r.id, roomId: r.roomId, status: r.status,
      date: (r.date ? format(r.date, 'yyyy-MM-dd') : null) || (r.reservationDate || 'unknown'),
      startTime: typeof r.startTime === 'string' ? r.startTime : format(r.startTime, 'HH:mm:ss'),
      endTime: typeof r.endTime === 'string' ? r.endTime : format(r.endTime, 'HH:mm:ss')
    }))));
    
    // Get the next 'consecutive' hours and check if they're all available
    for (let i = 0; i < consecutive; i++) {
      const currentHour = hour + i;
      
      // Check if hour is outside library hours (9am-8pm, or 9am-5pm on weekends)
      if (currentHour < 9 || currentHour > 20) return false; // Outside library hours
      
      // Check for weekend closing time restrictions
      const isWeekend = [0, 6].includes(selectedDate.getDay()); // 0 = Sunday, 6 = Saturday
      if (isWeekend && currentHour >= 17) return false; // Weekend after 5pm
      
      // Simplified approach: search directly for any confirmed reservation that blocks this time slot
      const targetDateStr = format(selectedDate, 'yyyy-MM-dd');
      
      console.log(`Checking if hour ${currentHour} is bookable for room ${roomId} on ${targetDateStr}`);
      
      // Find any reservation that:
      // 1. Is for this room
      // 2. Is on the selected date
      // 3. Has status 'confirmed'
      // 4. Overlaps with the current hour
      const blockedByReservation = reservations.find(r => {
        // Must be for this room
        if (r.roomId !== roomId) {
          return false;
        }
        
        // Must be confirmed (not cancelled)
        if (r.status !== 'confirmed') {
          console.log(`Skipping reservation #${r.id} because status is ${r.status}`);
          return false;
        }
        
        // Check date match using ISO date strings for reliable comparison
        const reservationDateObj = r.date || new Date(r.reservationDate);
        const reservationDateStr = format(reservationDateObj, 'yyyy-MM-dd');
        if (reservationDateStr !== targetDateStr) {
          console.log(`Skipping reservation #${r.id} because date ${reservationDateStr} !== ${targetDateStr}`);
          return false;
        }
        
        // Get the reservation times
        let startTime: Date, endTime: Date;
        
        if (typeof r.startTime === 'string') {
          startTime = new Date(r.startTime);
          endTime = new Date(r.endTime);
        } else {
          startTime = r.startTime;
          endTime = r.endTime;
        }
        
        // Extract hours
        const startHour = startTime.getHours();
        const endHour = endTime.getHours();
        
        console.log(`Checking reservation #${r.id} with time range ${startHour}-${endHour} against hour ${currentHour}`);
        
        // Check if current hour falls within the reservation time range
        const isOverlapping = currentHour >= startHour && currentHour < endHour;
        
        if (isOverlapping) {
          console.log(`Hour ${currentHour} for room ${roomId} is BOOKED by reservation #${r.id}!`);
          return true;
        }
        
        return false;
      });
      
      if (blockedByReservation) {
        console.log(`Hour ${currentHour} for room ${roomId} is NOT AVAILABLE due to reservation #${blockedByReservation.id}`);
        return false;
      }
    }
    
    // If we get here, this time slot is available
    console.log(`Hour ${hour} for room ${roomId} is AVAILABLE`);
    return true;
  };
  
  // Function to get available durations for a time slot
  const getAvailableDurations = (roomId: number, startHour: number) => {
    const durations = [];
    
    // Add 1 hour option (always available if the current slot is available)
    if (isTimeSlotAvailable(roomId, startHour)) {
      durations.push(1);
      
      // Check if 2 hours is available (current hour and next hour)
      if (startHour < 20 && isTimeSlotAvailable(roomId, startHour + 1)) {
        durations.push(2);
      }
    }
    
    return durations;
  };
  
  return (
    <>
      {filteredRooms.map((room) => {
        const schedule = getRoomSchedule(room.id);
        
        return (
          <tr key={room.id} className="hover:bg-gray-50 transition-colors">
            <td className="border border-gray-200 p-3">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="info-btn mr-2 p-1 px-2"
                  onClick={() => handleRoomInfoClick(room.id)}
                >
                  <Info className="h-3 w-3" />
                </Button>
                <div>
                  <div className="font-medium">{room.name}</div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <UserIcon className="h-3 w-3 mr-1" /> 
                    Capacity: {room.capacity}
                  </div>
                </div>
                {room.features && room.features.includes("WiFi") && (
                  <Wifi className="h-4 w-4 ml-2 text-gray-400" />
                )}
                {room.features && room.features.includes("TV with HDMI") && (
                  <Tv className="h-4 w-4 ml-1 text-gray-400" />
                )}
              </div>
            </td>
            
            {schedule.map((slot, index) => {
              // Check if it's a weekend slot after 5pm to show special styling
              const isWeekend = [0, 6].includes(selectedDate.getDay()); // 0 = Sunday, 6 = Saturday
              const isWeekendAfterHours = isWeekend && slot.hour >= 17; // 5pm and later on weekends
              const cellTitle = slot.isAvailable
                ? `Available at ${formatTimeSlot(slot.hour)}`
                : isWeekendAfterHours
                  ? `Library closes at 5:00 PM on weekends`
                  : `Occupied at ${formatTimeSlot(slot.hour)}`;

              let cellClass = 'calendar-cell';
              if (slot.isAvailable) {
                cellClass += ' available';
              } else if (isWeekendAfterHours) {
                cellClass += ' weekend-closed';
              } else {
                cellClass += ' occupied';
              }

            console.log(`🟢 Rendering slot for Room ${room.id}, Hour ${slot.hour} → Available: ${slot.isAvailable}`);
            
              return (
                <td 
                  key={index} 
                  className="p-0 border border-gray-200"
                  onClick={(e) => handleTimeSlotClick(room.id, slot.hour, slot.isAvailable, e)}
                  data-room-id={room.id}
                  data-hour={slot.hour}
                >
                  <div 
                    className={cellClass}
                    title={cellTitle}
                  ></div>
                </td>
              );
            })}
          </tr>
        );
      })}
      
      {/* Room Info Dialog */}
      <Dialog open={isRoomInfoOpen} onOpenChange={setIsRoomInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedRoom?.name}</DialogTitle>
            <DialogDescription className="text-gray-500">
              {selectedRoom?.location}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
            <div>
              <h4 className="text-sm font-medium mb-2 text-gray-700">Room Details</h4>
              <p className="text-sm text-gray-600">{selectedRoom?.description}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2 text-gray-700">Capacity</h4>
              <p className="text-sm text-gray-600 flex items-center">
                <UserIcon className="h-4 w-4 mr-2 text-blue-600" />
                {selectedRoom?.capacity} people maximum
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2 text-gray-700">Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {selectedRoom?.features?.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <ShieldCheckIcon className="h-4 w-4 mr-2 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsRoomInfoOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Booking Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Book {selectedRoom?.name}</DialogTitle>
            <DialogDescription className="text-gray-500">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Selected Time</h4>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-600" />
                <span className="font-medium">
                  {selectedTimeSlot !== null ? formatTimeSlot(selectedTimeSlot) : ""} - {getEndTime()}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Duration</label>
              <Select 
                defaultValue="1" 
                onValueChange={handleDurationChange}
                disabled={selectedTimeSlot === null || !isTimeSlotAvailable(selectedRoom?.id || 0, selectedTimeSlot || 0)}
              >
                <SelectTrigger className="w-full border border-gray-200 rounded-md h-10">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  {selectedTimeSlot !== null && selectedRoom && 
                   isTimeSlotAvailable(selectedRoom.id, selectedTimeSlot) && 
                   isTimeSlotAvailable(selectedRoom.id, selectedTimeSlot + 1) && (
                    <SelectItem value="2">2 hours</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Your Name</label>
              <input 
                type="text"
                className={`w-full border border-gray-200 rounded-md px-3 py-2 h-10 ${user ? 'bg-gray-50' : ''}`}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your full name"
                disabled={!!user}
              />
              {user && <p className="text-sm text-gray-500 mt-1">Auto-filled from your profile</p>}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input 
                type="email"
                className={`w-full border border-gray-200 rounded-md px-3 py-2 h-10 ${user ? 'bg-gray-50' : ''}`}
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Your email address"
                disabled={!!user}
              />
              {user && <p className="text-sm text-gray-500 mt-1">Auto-filled from your profile</p>}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Purpose (Optional)</label>
              <input 
                type="text"
                className="w-full border border-gray-200 rounded-md px-3 py-2 h-10"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Study session, meeting, etc."
              />
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleBookingSubmit}
            >
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-green-600">Booking Confirmed!</DialogTitle>
            <DialogDescription>
              Your room has been reserved successfully.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-3 bg-green-50 p-4 rounded-md border border-green-100">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-700">Room</h4>
              <p className="font-medium">{selectedRoom?.name}</p>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-700">Date</h4>
              <p>{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-700">Time</h4>
              <p>
                {selectedTimeSlot !== null ? formatTimeSlot(selectedTimeSlot) : ""} - {getEndTime()}
                ({selectedDuration} {selectedDuration === 1 ? 'hour' : 'hours'})
              </p>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-700">Confirmation Number</h4>
              <p className="font-mono font-medium">LIB-{Math.floor(100000 + Math.random() * 900000)}</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mt-2">
            A confirmation email has been sent to {userEmail}. Please arrive 5 minutes before your booking time.
          </p>
          
          <DialogFooter>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={closeConfirmation}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
