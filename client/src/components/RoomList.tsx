import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { UserIcon, ShieldCheckIcon, Info, Wifi, Tv, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, setHours, addHours, isSameDay, parseISO } from "date-fns";
import { Room as SchemaRoom, Reservation as SchemaReservation } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

// Define props for RoomList component
interface RoomListProps {
  selectedDate: Date;
}

export default function RoomList({ selectedDate }: RoomListProps) {
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
  
  // Add local date state that can be used to force re-renders
  const [localDate, setLocalDate] = useState(new Date(selectedDate));
  const websocketRef = useRef<WebSocket | null>(null);
  
  // Define generateSlotId BEFORE any function that uses it
  // Generate a unique ID for each room+hour+date combo
  const generateSlotId = useCallback((roomId: number, hour: number) => {
    // Use localDate to ensure date is consistent with the component's current state
    const dateStr = format(localDate, 'yyyyMMdd'); 
    const paddedRoomId = roomId.toString().padStart(2, '0');
    const paddedHour = hour.toString().padStart(2, '0');
    console.log(`Generated slot ID for room ${roomId}, hour ${hour}, date ${dateStr}: ${paddedRoomId}${paddedHour}${dateStr}`);
    return `${paddedRoomId}${paddedHour}${dateStr}`;
  }, [localDate]); // Depend only on localDate
  
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
    // Debug raw data from API
    console.log("Raw data from API:", JSON.stringify(data));
    
    return data.map((res: any) => {
      console.log(`Processing reservation #${res.id}, roomId=${res.roomId}, status=${res.status || 'confirmed'}`);
      
      try {
        // Make sure we have dates in the correct format
        const resDate = new Date(res.reservationDate);
        const startTime = new Date(res.startTime);
        const endTime = new Date(res.endTime);
        
        // Map server data to client Reservation with proper Date objects
        const reservation: Reservation = {
          id: res.id,
          roomId: res.roomId,
          userId: res.userId || null,
          guestName: res.guestName || null,
          guestEmail: res.guestEmail || null,
          // Keep original reservationDate as string (DB format)
          reservationDate: res.reservationDate,
          // Store times as proper Date objects for UI manipulation
          startTime: startTime,
          endTime: endTime,
          purpose: res.purpose || 'Reservation',
          status: res.status || 'confirmed', // Default to confirmed if not specified
          confirmationCode: res.confirmationCode || null,
          notes: res.notes || null,
          createdAt: res.createdAt ? new Date(res.createdAt) : new Date(),
          updatedAt: res.updatedAt ? new Date(res.updatedAt) : null,
          // Client-side display properties
          date: resDate, // Parsed date for UI
          userName: res.userId ? (res.userName || 'User') : res.guestName,
          userEmail: res.userId ? (res.userEmail || '') : res.guestEmail
        };
        
        console.log(`Processed reservation #${reservation.id}:`, {
          roomId: reservation.roomId,
          date: format(reservation.date, 'yyyy-MM-dd'),
          time: `${format(reservation.startTime, 'HH:mm')}-${format(reservation.endTime, 'HH:mm')}`,
          status: reservation.status
        });
        
        return reservation;
      } catch (error) {
        console.error(`Error processing reservation data:`, error, res);
        // Return a safe fallback with the original data
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
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
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
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
  
  // Handle errors from the query
  if (reservationsQuery.error) {
    console.error('Error in reservations query:', reservationsQuery.error);
    toast({
      title: "Error",
      description: "Failed to load room reservations",
      variant: "destructive"
    });
  }
  
  // Extract reservations from query result
  const reservations = reservationsQuery.data || [];
  
  // Function to mark a reservation in the availability map
  // Note: Now using the previously defined generateSlotId function
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
      // Use the generateSlotId function that was defined earlier
      const slotId = generateSlotId(roomId, hour);
      occupiedSlots.push(slotId);
    }
    
    // Log the occupied slots
    if (occupiedSlots.length > 0) {
      console.log(`Marking following slots as occupied from reservation #${reservation.id}:`, occupiedSlots);
      return true;
    }
    
    return false;
  }, [selectedDate, generateSlotId]);
  
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
  }, [localDate, queryClient, toast, markReservationSlots, generateSlotId]);
  
  // Create a direct room+timeslot mapping for each reservation
  const buildAvailabilityMap = useMemo(() => {
    // Create map to hold all availability data: Map<UniqueSlotId, boolean>
    const availabilityMap = new Map<string, boolean>();
    
    // Pre-populate all slots as available (except weekend after hours)
    const selectedDateStr = format(selectedDate, 'yyyyMMdd');
    for (const room of roomsData) {
      for (let hour = 9; hour <= 20; hour++) {
        const isWeekend = [0, 6].includes(selectedDate.getDay());
        const isAfterWeekendHours = isWeekend && hour >= 17;
        
        // Generate a unique ID for this slot
        const slotId = generateSlotId(room.id, hour);
        
        // Mark as available unless it's after hours on weekend
        availabilityMap.set(slotId, !isAfterWeekendHours);
      }
    }
    
    // Mark booked slots as unavailable
    console.log(`Marking reserved slots from ${reservations.length} reservations`);
    for (const reservation of reservations) {
      // Skip cancelled reservations
      if (reservation.status === 'cancelled') {
        console.log(`Skipping cancelled reservation #${reservation.id}`);
        continue;
      }

      // Only process reservations for the selected date
      const resDate = reservation.date || new Date(reservation.reservationDate);
      if (!isSameDay(resDate, selectedDate)) {
        continue;
      }
      
      // Get times for this reservation
      const startTime = typeof reservation.startTime === 'string' 
        ? new Date(reservation.startTime) 
        : reservation.startTime;
        
      const endTime = typeof reservation.endTime === 'string'
        ? new Date(reservation.endTime)
        : reservation.endTime;
        
      // Get start and end hours
      const startHour = startTime.getHours();
      const endHour = endTime.getHours();
      
      // Mark all hours in this reservation as unavailable
      for (let hour = startHour; hour < endHour; hour++) {
        const slotId = generateSlotId(reservation.roomId, hour);
        availabilityMap.set(slotId, false);
        console.log(`Marked slot ${slotId} as unavailable due to reservation #${reservation.id}`);
      }
    }
    
    return {
      // Check if a slot is available
      isSlotAvailable: (roomId: number, hour: number) => {
        const slotId = generateSlotId(roomId, hour);
        return availabilityMap.get(slotId) || false;
      },
      // Debug function to get all unavailable slots
      getUnavailableSlots: () => {
        return Array.from(availabilityMap.entries())
          .filter(([_, isAvailable]) => !isAvailable)
          .map(([slotId]) => slotId);
      }
    };
  }, [reservations, selectedDate, roomsData, generateSlotId]);
  
  // Create a manual override map for freshly booked slots
  const [manuallyBookedSlots, setManuallyBookedSlots] = useState<Map<string, boolean>>(new Map());
  
  // Simplified availability check function that considers both our map and manual overrides
  const isTimeSlotAvailable = (roomId: number, hour: number) => {
    // First check if we have a manual override from a fresh booking
    const slotId = generateSlotId(roomId, hour);
    if (manuallyBookedSlots.has(slotId)) {
      return false; // This slot was just booked
    }
    
    // Otherwise use the regular availability map
    return buildAvailabilityMap.isSlotAvailable(roomId, hour);
  };

  // Handler for time slot selection
  const handleTimeSlotClick = (room: Room, hour: number) => {
    // Check if the slot is available
    if (isTimeSlotAvailable(room.id, hour)) {
      setSelectedRoom(room);
      setSelectedTimeSlot(hour);
      setIsModalOpen(true);
      
      // Prefill the form with user data if logged in
      if (user) {
        setUserName(user.name || user.username);
        setUserEmail(user.email || "");
      }
    } else {
      toast({
        title: "Time slot unavailable",
        description: `This time slot is already booked or the library is closed.`,
        variant: "destructive"
      });
    }
  };
  
  // Handler for booking form submission
  const handleBookingSubmit = async () => {
    try {
      if (!selectedRoom || selectedTimeSlot === null) {
        toast({
          title: "Booking error",
          description: "Please select a room and time slot.",
          variant: "destructive"
        });
        return;
      }
      
      // Calculate start and end times
      let startTime: Date, endTime: Date;
      
      // Create date objects for the selected date and time
      startTime = new Date(selectedDate);
      startTime.setHours(selectedTimeSlot, 0, 0, 0);
      
      // Calculate end time based on duration
      endTime = new Date(selectedDate);
      endTime.setHours(selectedTimeSlot + selectedDuration, 0, 0, 0);
      
      // Validate input fields
      if (!userName || !userEmail || !purpose) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }
      
      console.log("Creating reservation:", {
        room: selectedRoom.name,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: format(startTime, 'HH:mm'),
        endTime: format(endTime, 'HH:mm'),
        userName,
        userEmail,
        purpose
      });
      
      // Create the reservation object
      const clientReservation: Reservation = {
        id: Math.floor(Math.random() * 10000), // Temporary ID until the server assigns one
        roomId: selectedRoom.id,
        userId: user ? user.id : null,
        guestName: user ? null : userName,
        guestEmail: user ? null : userEmail,
        reservationDate: format(selectedDate, 'yyyy-MM-dd'),
        startTime: startTime,
        endTime: endTime,
        purpose: purpose,
        status: 'confirmed',
        confirmationCode: `LIB-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
        notes: null,
        createdAt: new Date(),
        updatedAt: null,
        date: new Date(selectedDate),
        userName: userName,
        userEmail: userEmail
      };
      
      // Send the reservation to the server
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          userId: user ? user.id : null,
          guestName: user ? null : userName,
          guestEmail: user ? null : userEmail,
          reservationDate: format(selectedDate, 'yyyy-MM-dd'),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          purpose: purpose,
          status: 'confirmed'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const serverReservation = await response.json();
      console.log("Reservation confirmed:", serverReservation);
      
      // Close the modal
      setIsModalOpen(false);
      
      // Show confirmation dialog
      setIsConfirmationOpen(true);
      
      // Clear the form
      setPurpose("");
      
      // Mark all the booked slots as unavailable
      const newBookedSlots = new Map(manuallyBookedSlots);
      
      for (let hour = selectedTimeSlot; hour < selectedTimeSlot + selectedDuration; hour++) {
        const slotId = generateSlotId(selectedRoom.id, hour);
        newBookedSlots.set(slotId, true);
        console.log(`Manually marking slot ${slotId} as booked`);
      }
      
      setManuallyBookedSlots(newBookedSlots);
      
      // Update React Query cache
      queryClient.setQueryData(
        ['/api/reservations/by-date', format(selectedDate, 'yyyy-MM-dd')],
        (oldData: any[] = []) => {
          return [...oldData, serverReservation];
        }
      );
      
      // Invalidate the reservations query to trigger a refetch
      queryClient.invalidateQueries({ 
        queryKey: ['/api/reservations/by-date', format(selectedDate, 'yyyy-MM-dd')] 
      });
      
      // Force a re-render with updated date
      setLocalDate(new Date(selectedDate));
      
    } catch (error) {
      console.error("Booking submission error:", error);
      toast({
        title: "Booking failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  // Rendering table rows - one per room
  const renderRoomRows = () => {
    return roomsData.map(room => (
      <tr key={room.id} className="border-b">
        <td className="p-3 bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <UserIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium">{room.name}</h3>
              <div className="text-xs text-gray-500 flex items-center">
                <span>Capacity: {room.capacity}</span>
              </div>
            </div>
          </div>
        </td>
        
        {/* Render time slots from 2PM to 12AM (14:00 - 00:00) */}
        {[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(hour => {
          // Determine if this time slot is available
          const isAvailable = isTimeSlotAvailable(room.id, hour);
          // Weekend closed hours check
          const isWeekend = [0, 6].includes(selectedDate.getDay());
          const isAfterWeekendHours = isWeekend && hour >= 17;
          
          // CSS classes based on availability
          const cellClass = isAfterWeekendHours ? 
            "bg-gray-100 cursor-not-allowed" : 
            isAvailable ? 
              "bg-blue-500 hover:bg-blue-600 cursor-pointer" : 
              "bg-gray-200 cursor-not-allowed";
          
          return (
            <td key={`${room.id}-${hour}`} 
                className={`p-0 border ${cellClass}`}
                onClick={() => !isAfterWeekendHours && isAvailable && handleTimeSlotClick(room, hour)}>
              <div className="w-full h-full min-h-10">&nbsp;</div>
            </td>
          );
        })}
      </tr>
    ));
  };

  // Loading state
  if (reservationsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error state
  if (reservationsQuery.isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 mb-6">
        <p className="font-medium">Error loading reservations</p>
        <p className="text-sm">Please try again or contact the library staff if the problem persists.</p>
      </div>
    );
  }

  // Main component render
  return (
    <>
      {/* Table layout for room booking */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-64 text-left p-3 border bg-gray-50">Space</th>
            <th className="p-3 text-center border bg-gray-50">2:00pm</th>
            <th className="p-3 text-center border bg-gray-50">3:00pm</th>
            <th className="p-3 text-center border bg-gray-50">4:00pm</th>
            <th className="p-3 text-center border bg-gray-50">5:00pm</th>
            <th className="p-3 text-center border bg-gray-50">6:00pm</th>
            <th className="p-3 text-center border bg-gray-50">7:00pm</th>
            <th className="p-3 text-center border bg-gray-50">8:00pm</th>
            <th className="p-3 text-center border bg-gray-50">9:00pm</th>
            <th className="p-3 text-center border bg-gray-50">10:00pm</th>
            <th className="p-3 text-center border bg-gray-50">11:00pm</th>
            <th className="p-3 text-center border bg-gray-50">12:00am</th>
          </tr>
        </thead>
        <tbody>
          {renderRoomRows()}
        </tbody>
      </table>

      {/* Booking Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Book a Room</DialogTitle>
            <DialogDescription>
              {selectedRoom && selectedTimeSlot !== null && (
                `${selectedRoom.name} on ${format(selectedDate, 'EEEE, MMMM d, yyyy')} at ${format(setHours(new Date(), selectedTimeSlot), 'h:00 a')}`
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="duration" className="text-right text-sm">Duration</label>
              <div className="col-span-3">
                <Select value={selectedDuration.toString()} onValueChange={(value) => setSelectedDuration(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right text-sm">Name</label>
              <input
                id="name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!!user} // Disabled if user is logged in
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="text-right text-sm">Email</label>
              <input
                id="email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!!user} // Disabled if user is logged in
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="purpose" className="text-right text-sm">Purpose</label>
              <input
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBookingSubmit}>Book Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-green-600">Reservation Confirmed</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Your room has been successfully reserved!</p>
            {selectedRoom && selectedTimeSlot !== null && (
              <div className="bg-green-50 border border-green-100 rounded-md p-4">
                <p className="font-semibold">{selectedRoom.name}</p>
                <p className="text-sm text-gray-600">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-sm text-gray-600">
                  {`${format(setHours(new Date(), selectedTimeSlot), 'h:00 a')} - ${format(setHours(new Date(), selectedTimeSlot + selectedDuration), 'h:00 a')}`}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsConfirmationOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}