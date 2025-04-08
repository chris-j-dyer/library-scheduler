import { useState, useEffect, useRef, useCallback } from "react";
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
    return data.map((res: any) => {
      console.log(`Processing reservation #${res.id}:`, {
        reservationDate: res.reservationDate,
        startTime: res.startTime,
        endTime: res.endTime,
        status: res.status
      });
      
      // Map server data to client Reservation with proper Date objects
      const reservation: Reservation = {
        id: res.id,
        roomId: res.roomId,
        userId: res.userId || null,
        guestName: res.guestName || null,
        guestEmail: res.guestEmail || null,
        // Keep reservationDate as string (DB format)
        reservationDate: res.reservationDate,
        // Parse times as Date objects for UI manipulation
        startTime: new Date(res.startTime),
        endTime: new Date(res.endTime),
        purpose: res.purpose || 'Reservation',
        status: res.status || 'confirmed',
        confirmationCode: res.confirmationCode || null,
        notes: res.notes || null,
        createdAt: res.createdAt ? new Date(res.createdAt) : new Date(),
        updatedAt: res.updatedAt ? new Date(res.updatedAt) : null,
        // Client-side display properties
        date: new Date(res.reservationDate), // Parsed date for UI
        userName: res.userId ? (res.userName || 'User') : res.guestName,
        userEmail: res.userId ? (res.userEmail || '') : res.guestEmail
      };
      
      console.log(`Processed reservation for room ${reservation.roomId} on ${format(reservation.date, 'yyyy-MM-dd')} at ${format(reservation.startTime, 'HH:mm')} with status ${reservation.status}`);
      return reservation;
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
  
  // Setup WebSocket connection
  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    websocketRef.current = socket;
    
    // Connection opened
    socket.addEventListener('open', (event) => {
      console.log('WebSocket connection established');
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        // Handle different message types
        if (message.type === 'new_reservation') {
          // Get reservation data from the message
          const reservation = message.data;
          const reservationDate = new Date(reservation.reservationDate);
          
          // If this reservation is for the selected date, update our data
          if (isSameDay(reservationDate, selectedDate)) {
            // Force a refresh of the reservations query to get the latest data
            // This is better than manually updating state as it ensures we have the
            // complete correct state from the server
            console.log('WebSocket triggered reservation query invalidation');
            
            // Invalidate the query for the selected date
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            queryClient.invalidateQueries({ 
              queryKey: ['/api/reservations/by-date', dateStr] 
            });
            
            // Show toast notification
            toast({
              title: "New Reservation",
              description: `Room ${reservation.roomId} has been reserved`,
            });
          }
        } else if (message.type === 'cancelled_reservation') {
          // Similar handling for cancelled reservations
          const reservation = message.data;
          const reservationDate = new Date(reservation.reservationDate);
          
          if (isSameDay(reservationDate, selectedDate)) {
            // Invalidate the query for the selected date
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            queryClient.invalidateQueries({ 
              queryKey: ['/api/reservations/by-date', dateStr] 
            });
            
            toast({
              title: "Reservation Cancelled",
              description: `A reservation for Room ${reservation.roomId} has been cancelled`,
            });
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Connection closed
    socket.addEventListener('close', (event) => {
      console.log('WebSocket connection closed');
    });
    
    // Connection error
    socket.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
    });
    
    // Cleanup on unmount
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [selectedDate, queryClient, toast]);
  
  // Generate schedule for each room
  const getRoomSchedule = (roomId: number) => {
    // Create array of time slots from 9am to 8pm
    const timeSlots: TimeSlot[] = [];
    
    // Start at 9am (9:00) and go until 8pm (20:00)
    for (let hour = 9; hour <= 20; hour++) {
      // Check if it's a weekend and time is after 5pm - library closes earlier on weekends
      const isWeekend = [0, 6].includes(selectedDate.getDay()); // 0 = Sunday, 6 = Saturday
      const isAfterWeekendHours = isWeekend && hour >= 17; // 5pm and later on weekends
      
      // Use the more robust isTimeSlotBookable function to check availability
      // This function properly normalizes dates and handles date comparison more reliably
      // If it's a weekend after hours, mark as unavailable regardless of bookings
      const isAvailable = isAfterWeekendHours ? false : isTimeSlotBookable(roomId, hour);
      
      timeSlots.push({
        hour,
        isAvailable
      });
      
      // Log the schedule for debugging
      console.log(`Room ${roomId}, Hour ${hour}: ${isAvailable ? 'Available' : isAfterWeekendHours ? 'Weekend after hours' : 'Occupied'}`);
    }
    
    return timeSlots;
  };
  
  const handleTimeSlotClick = (roomId: number, hour: number, isAvailable: boolean) => {
    if (!isAvailable) {
      toast({
        title: "Time slot not available",
        description: "Please select an available time slot",
        variant: "destructive"
      });
      return;
    }
    
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
    
    // Prepare reservation data for API with exact hours
    // Create dates with minutes and seconds set to zero
    const startDate = new Date(selectedDate);
    startDate.setHours(selectedTimeSlot, 0, 0, 0);
    
    const endDate = new Date(selectedDate);
    endDate.setHours(selectedTimeSlot + selectedDuration, 0, 0, 0);
    
    const reservationData = {
      roomId: selectedRoom.id,
      // Format dates as strings for API compatibility
      reservationDate: format(selectedDate, 'yyyy-MM-dd'),
      startTime: format(startDate, 'yyyy-MM-dd HH:mm:ss'),
      endTime: format(endDate, 'yyyy-MM-dd HH:mm:ss'),
      purpose: purpose || "Study session",
      // If user is logged in, these fields will be associated with the user account
      // Otherwise, use the guest fields
      guestName: userName,
      guestEmail: userEmail,
      status: "confirmed",
      confirmationCode: `LIB-${Math.floor(100000 + Math.random() * 900000)}`
    };
    
    try {
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
      
      const newReservation = await response.json();
      
      // Map the API response to a client-side reservation
      const clientReservation: Reservation = {
        // Include all fields from the server response
        ...newReservation,
        // Override with properly parsed dates
        reservationDate: format(selectedDate, 'yyyy-MM-dd'), // ISO format string for DB
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
      
      console.log('Created client reservation:', {
        id: clientReservation.id,
        roomId: clientReservation.roomId,
        date: format(clientReservation.date, 'yyyy-MM-dd'),
        startTime: format(clientReservation.startTime, 'HH:mm:ss'),
        endTime: format(clientReservation.endTime, 'HH:mm:ss')
      });
      
      // Update the query cache with the new reservation data
      // This is more reliable than manually updating the local state
      queryClient.setQueryData(
        ['/api/reservations/by-date', formattedDate],
        (oldData: any[] | undefined) => {
          if (!oldData) return [newReservation];
          return [...oldData, newReservation];
        }
      );
      
      // Also invalidate the query to ensure it will be refetched next time
      // This ensures data consistency in case the server's response is different
      queryClient.invalidateQueries({ 
        queryKey: ['/api/reservations/by-date', formattedDate] 
      });
      
      // Close booking modal and show confirmation
      setIsModalOpen(false);
      setIsConfirmationOpen(true);
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
    // Get the next 'consecutive' hours and check if they're all available
    for (let i = 0; i < consecutive; i++) {
      const currentHour = hour + i;
      
      // Check if hour is outside library hours (9am-8pm, or 9am-5pm on weekends)
      if (currentHour < 9 || currentHour > 20) return false; // Outside library hours
      
      // Check for weekend closing time restrictions
      const isWeekend = [0, 6].includes(selectedDate.getDay()); // 0 = Sunday, 6 = Saturday
      if (isWeekend && currentHour >= 17) return false; // Weekend after 5pm
      
      console.log(`Checking if hour ${currentHour} is bookable for room ${roomId}`);
      
      // Group and sort reservations by ID to find the most recent status
      // This implements the append-only pattern where newer rows override older ones
      const roomReservations = reservations
        .filter(r => r.roomId === roomId)
        .sort((a, b) => b.id - a.id); // Sort descending by ID (newest first)
      
      // Check if any active reservations overlap with this time slot
      const isReserved = roomReservations.some(reservation => {
        // Skip cancelled reservations - they don't block time slots
        if (reservation.status === 'cancelled') {
          return false;
        }
        
        // Normalize dates for comparison to handle timezone issues
        const reservationDate = new Date(reservation.date);
        const formattedReservationDate = format(reservationDate, 'yyyy-MM-dd');
        const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
        
        // Check if the date matches the selected date using string comparison
        if (formattedReservationDate !== formattedSelectedDate) {
          console.log(`Date mismatch: reservation=${formattedReservationDate}, selected=${formattedSelectedDate}`);
          return false;
        }
        
        // Get hours for comparison
        const startHour = reservation.startTime.getHours();
        const endHour = reservation.endTime.getHours();
        
        // Log the comparison for debugging
        console.log(`Comparing hour ${currentHour} with reservation hours: ${startHour}-${endHour} (status: ${reservation.status || 'confirmed'})`);
        
        // Check if current hour falls within the reservation time range
        const isOverlapping = currentHour >= startHour && currentHour < endHour;
        if (isOverlapping) {
          console.log(`Hour ${currentHour} is reserved for room ${roomId}`);
        }
        return isOverlapping;
      });
      
      if (isReserved) return false;
    }
    
    return true;
  };
  
  // Function to get available durations for a time slot
  const getAvailableDurations = (roomId: number, startHour: number) => {
    const durations = [];
    for (let hours = 1; hours <= 2; hours++) {
      if (isTimeSlotBookable(roomId, startHour, hours)) {
        durations.push(hours);
      }
    }
    return durations;
  };
  
  return (
    <>
      {roomsData.map((room) => {
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
              
              return (
                <td 
                  key={index} 
                  className="p-0 border border-gray-200"
                  onClick={() => handleTimeSlotClick(room.id, slot.hour, slot.isAvailable)}
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
                disabled={selectedTimeSlot === null || !isTimeSlotBookable(selectedRoom?.id || 0, selectedTimeSlot || 0, 2)}
              >
                <SelectTrigger className="w-full border border-gray-200 rounded-md h-10">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  {isTimeSlotBookable(selectedRoom?.id || 0, selectedTimeSlot || 0, 2) && (
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
