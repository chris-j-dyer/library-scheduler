import { useState, useEffect, useRef } from "react";
import { UserIcon, ShieldCheckIcon, Info, Wifi, Tv, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, setHours, addHours, isSameDay } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

// Define room and reservation types
type Room = {
  id: number;
  name: string;
  capacity: number;
  location: string;
  features: string[];
  description: string;
};

type TimeSlot = {
  hour: number;
  isAvailable: boolean;
};

type Reservation = {
  id: number;
  roomId: number;
  date: Date;
  startTime: Date;
  endTime: Date;
  userName: string;
  userEmail: string;
  purpose: string;
};

// Sample room data
const roomsData: Room[] = [
  {
    id: 1,
    name: "Group Study Room",
    capacity: 12,
    location: "South Boulevard - 2nd Floor",
    features: ["Whiteboard", "TV with HDMI", "Conference Phone", "WiFi"],
    description: "A large meeting room ideal for group study sessions and collaborative projects. The room includes a large table with 12 chairs, a wall-mounted TV for presentations, and a whiteboard."
  },
  {
    id: 2,
    name: "Study Room 1",
    capacity: 5,
    location: "South Boulevard - 1st Floor",
    features: ["Whiteboard", "WiFi", "Standing Desk"],
    description: "Medium-sized room suitable for small group discussions. Includes a round table with 5 chairs and a wall-mounted whiteboard."
  },
  {
    id: 3,
    name: "Study Room 2",
    capacity: 5,
    location: "South Boulevard - 1st Floor",
    features: ["Whiteboard", "WiFi", "Power Outlets"],
    description: "Medium-sized room suitable for small group discussions. Includes a round table with 5 chairs and a wall-mounted whiteboard."
  },
  {
    id: 4,
    name: "Study Room 3",
    capacity: 2,
    location: "South Boulevard - Quiet Zone",
    features: ["Small Desk", "WiFi", "Quiet Area"],
    description: "A small, quiet room ideal for individual or paired study sessions. Includes a small desk with 2 chairs."
  },
  {
    id: 5,
    name: "Study Room 4",
    capacity: 2,
    location: "South Boulevard - Quiet Zone",
    features: ["Small Desk", "WiFi", "Quiet Area"],
    description: "A small, quiet room ideal for individual or paired study sessions. Includes a small desk with 2 chairs."
  },
  {
    id: 6,
    name: "Study Room 5",
    capacity: 2,
    location: "South Boulevard - Quiet Zone",
    features: ["Small Desk", "WiFi", "Quiet Area", "Window View"],
    description: "A small, quiet room ideal for individual or paired study sessions. Includes a small desk with 2 chairs and a nice window view."
  }
];

// Sample reservations (would typically come from API/database)
const initialReservations: Reservation[] = [
  {
    id: 1,
    roomId: 1,
    date: new Date(2025, 3, 7), // April 7, 2025
    startTime: setHours(new Date(2025, 3, 7), 14), // 2pm
    endTime: setHours(new Date(2025, 3, 7), 20), // 8pm
    userName: "John Smith",
    userEmail: "john@example.com",
    purpose: "Study Group"
  },
  {
    id: 2,
    roomId: 2,
    date: new Date(2025, 3, 7),
    startTime: setHours(new Date(2025, 3, 7), 14),
    endTime: setHours(new Date(2025, 3, 7), 20),
    userName: "Sarah Johnson",
    userEmail: "sarah@example.com",
    purpose: "Research"
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
  
  // Format date for the query
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  
  // Use React Query to fetch and cache reservations
  const { 
    data: reservations = [], 
    isLoading,
    error 
  } = useQuery<Reservation[]>({
    queryKey: ['reservations', formattedDate],
    queryFn: async () => {
      console.log(`Fetching reservations for date: ${formattedDate}`);
      
      // Use the dedicated endpoint for date-based reservations
      const response = await fetch(`/api/reservations/by-date/${formattedDate}`);
      
      if (!response.ok) {
        console.error(`Error response from server: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch reservations');
      }
      
      const data = await response.json();
      console.log('Reservations data received:', data);
      
      // Map API reservations to client format
      const clientReservations: Reservation[] = data.map((res: any) => {
        // Ensure we have proper Date objects for all date fields
        const reservation = {
          id: res.id,
          roomId: res.roomId,
          date: new Date(res.reservationDate),
          startTime: new Date(res.startTime),
          endTime: new Date(res.endTime),
          userName: res.userId ? (res.userName || 'User') : res.guestName,
          userEmail: res.userId ? (res.userEmail || '') : res.guestEmail,
          purpose: res.purpose || 'Reservation'
        };
        
        console.log(`Processed reservation for room ${reservation.roomId} on ${format(reservation.date, 'yyyy-MM-dd')} at ${format(reservation.startTime, 'HH:mm')}`);
        return reservation;
      });
      
      console.log(`Loaded ${clientReservations.length} reservations for date ${formattedDate}`);
      return clientReservations;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes
  });
  
  // Display loading state if needed
  if (isLoading) {
    return (
      <tr>
        <td colSpan={12} className="h-24 text-center">
          <div className="flex justify-center items-center h-full">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Loading reservations...</span>
          </div>
        </td>
      </tr>
    );
  }

  // If error occurred, show error state
  if (error) {
    toast({
      title: "Error loading reservations",
      description: error instanceof Error ? error.message : "Unknown error occurred",
      variant: "destructive"
    });
  }
  
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
          // Add the new reservation to our state if it's for today
          const reservation = message.data;
          const reservationDate = new Date(reservation.reservationDate);
          const reservationFormattedDate = format(reservationDate, 'yyyy-MM-dd');
          
          // Check if the reservation is for the currently selected date
          if (reservationFormattedDate === formattedDate) {
            // Convert reservation to client format
            const clientReservation: Reservation = {
              id: reservation.id,
              roomId: reservation.roomId,
              date: new Date(reservation.reservationDate),
              startTime: new Date(reservation.startTime),
              endTime: new Date(reservation.endTime),
              userName: reservation.userId ? (reservation.userName || 'User') : reservation.guestName,
              userEmail: reservation.userId ? (reservation.userEmail || '') : reservation.guestEmail,
              purpose: reservation.purpose || 'Reservation'
            };
            
            // Use React Query's cache to update the data
            queryClient.setQueryData<Reservation[]>(['reservations', formattedDate], (oldData = []) => {
              // Create a safe copy of oldData in case it's undefined
              const currentData = Array.isArray(oldData) ? oldData : [];
              
              // Only add if it's not already in the cache (to avoid duplicates)
              if (!currentData.some(r => r.id === clientReservation.id)) {
                console.log('Adding new reservation to React Query cache');
                return [...currentData, clientReservation];
              }
              return currentData;
            });
            
            // Show toast notification
            toast({
              title: "New Reservation",
              description: `Room ${clientReservation.roomId} has been reserved`,
            });
          } else {
            // If it's for a different date, invalidate that date's query to force a refresh if they visit that date
            console.log(`Invalidating query for date: ${reservationFormattedDate}`);
            queryClient.invalidateQueries({ queryKey: ['reservations', reservationFormattedDate] });
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
  }, [formattedDate, queryClient, toast]);
  
  // Generate schedule for each room
  const getRoomSchedule = (roomId: number) => {
    // Create array of time slots from 2pm to 12am
    const timeSlots: TimeSlot[] = [];
    
    // Start at 2pm (14:00) and go until 11pm (23:00)
    for (let hour = 14; hour <= 24; hour++) {
      // Use the more robust isTimeSlotBookable function to check availability
      // This function properly normalizes dates and handles date comparison more reliably
      const isAvailable = isTimeSlotBookable(roomId, hour);
      
      timeSlots.push({
        hour,
        isAvailable
      });
      
      // Log the schedule for debugging
      console.log(`Room ${roomId}, Hour ${hour}: ${isAvailable ? 'Available' : 'Occupied'}`);
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
    
    // Prepare reservation data for API
    const reservationData = {
      roomId: selectedRoom.id,
      // Format dates as strings for API compatibility
      reservationDate: format(selectedDate, 'yyyy-MM-dd'),
      startTime: format(setHours(new Date(selectedDate), selectedTimeSlot), 'yyyy-MM-dd HH:mm:ss'),
      endTime: format(setHours(new Date(selectedDate), selectedTimeSlot + selectedDuration), 'yyyy-MM-dd HH:mm:ss'),
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
      
      // Add reservation to local state
      const clientReservation: Reservation = {
        id: newReservation.id,
        roomId: selectedRoom.id,
        date: selectedDate,
        // Create proper Date objects with the correct date and time
        startTime: new Date(format(setHours(new Date(selectedDate), selectedTimeSlot), 'yyyy-MM-dd HH:mm:ss')),
        endTime: new Date(format(setHours(new Date(selectedDate), selectedTimeSlot + selectedDuration), 'yyyy-MM-dd HH:mm:ss')),
        userName,
        userEmail,
        purpose: purpose || "Study session"
      };
      
      console.log('Created client reservation:', {
        id: clientReservation.id,
        roomId: clientReservation.roomId,
        date: format(clientReservation.date, 'yyyy-MM-dd'),
        startTime: format(clientReservation.startTime, 'HH:mm:ss'),
        endTime: format(clientReservation.endTime, 'HH:mm:ss')
      });
      
      // Update the React Query cache with the new reservation
      queryClient.setQueryData<Reservation[]>(['reservations', formattedDate], (oldData = []) => {
        // Create a safe copy of oldData in case it's undefined
        const currentData = Array.isArray(oldData) ? oldData : [];
        return [...currentData, clientReservation];
      });
      
      // Also invalidate the query to ensure fresh data is fetched next time
      queryClient.invalidateQueries({ queryKey: ['reservations', formattedDate] });
      
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
    return format(setHours(new Date(), hour), 'h:mm a');
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
    const endTime = addHours(setHours(new Date(), selectedTimeSlot), selectedDuration);
    return format(endTime, 'h:mm a');
  };
  
  // Function to check if a time slot is bookable (available and within booking constraints)
  const isTimeSlotBookable = (roomId: number, hour: number, consecutive: number = 1) => {
    try {
      // Get the next 'consecutive' hours and check if they're all available
      for (let i = 0; i < consecutive; i++) {
        const currentHour = hour + i;
        if (currentHour > 24) return false; // Past midnight
        
        // Make sure we have an array of reservations
        const reservationArray = Array.isArray(reservations) ? reservations : [];
        
        // Safely format the selected date once
        let formattedSelectedDate;
        try {
          formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
        } catch (err) {
          console.error("Error formatting selected date:", err);
          return false;
        }
        
        // Simplified reservation checking
        const isReserved = reservationArray.some((reservation) => {
          try {
            // Skip if not the requested room
            if (reservation.roomId !== roomId) {
              return false;
            }
            
            // Check if all required properties exist
            if (!reservation.startTime || !reservation.endTime) {
              return false;
            }
            
            // Get reservation date for comparison
            let reservationDateStr;
            try {
              // Use the reservation's date if possible
              if (reservation.date) {
                reservationDateStr = format(new Date(reservation.date), 'yyyy-MM-dd');
              } else {
                // Fallback to the startTime date component
                reservationDateStr = format(new Date(reservation.startTime), 'yyyy-MM-dd');
              }
            } catch (err) {
              console.error("Error getting reservation date:", err);
              return false;
            }
            
            // Check if dates match (using string comparison)
            if (reservationDateStr !== formattedSelectedDate) {
              return false;
            }
            
            // Get hours safely
            let startHour = 0, endHour = 0;
            try {
              const startTime = new Date(reservation.startTime);
              const endTime = new Date(reservation.endTime);
              startHour = startTime.getHours();
              endHour = endTime.getHours();
            } catch (err) {
              console.error("Error parsing reservation hours:", err);
              return false;
            }
            
            // Check if current hour falls within the reservation time range
            return (currentHour >= startHour && currentHour < endHour);
          } catch (err) {
            console.error("Error processing reservation:", err);
            return false;
          }
        });
        
        if (isReserved) return false;
      }
      
      return true;
    } catch (err) {
      console.error("Error in isTimeSlotBookable:", err);
      return false;
    }
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
                {room.features.includes("WiFi") && (
                  <Wifi className="h-4 w-4 ml-2 text-gray-400" />
                )}
                {room.features.includes("TV with HDMI") && (
                  <Tv className="h-4 w-4 ml-1 text-gray-400" />
                )}
              </div>
            </td>
            
            {schedule.map((slot, index) => (
              <td 
                key={index} 
                className="p-0 border border-gray-200"
                onClick={() => handleTimeSlotClick(room.id, slot.hour, slot.isAvailable)}
              >
                <div 
                  className={`${slot.isAvailable ? 'available' : 'occupied'} calendar-cell`}
                  title={`${slot.isAvailable ? 'Available' : 'Occupied'} at ${formatTimeSlot(slot.hour)}`}
                ></div>
              </td>
            ))}
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
                {selectedRoom?.features.map((feature, index) => (
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
