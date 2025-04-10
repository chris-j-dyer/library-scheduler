import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, isToday, isSameDay, startOfDay, addMonths, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import RoomList from "./RoomList";
import FilterControls from "./FilterControls";

export default function CalendarView() {
  const { toast } = useToast();
  // Ensure we start with today's date (at midnight) to avoid any time-based comparison issues
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showingWeek, setShowingWeek] = useState(true);
  const weekEndDate = addDays(selectedDate, 6);
  const [capacityFilter, setCapacityFilter] = useState("all-spaces");
  const handlePrevious = () => {
    // The text in the button is reversed from the state:
    // When showingWeek=true, button says "Day", and we should move by 1 day
    // When showingWeek=false, button says "Week", and we should move by 7 days
    const daysToSubtract = !showingWeek ? 7 : 1;
    const newDate = subDays(selectedDate, daysToSubtract);
    
    // Prevent navigation to dates in the past
    const today = startOfDay(new Date());
    
    // If we're in week view (when showingWeek=false and button says "Week"), 
    // we need to ensure that the entire week is not in the past
    if (!showingWeek) {
      // In week view, we need to ensure that the first day of the week is not before today
      if (newDate < today) {
        // If we would navigate to a week containing dates before today, set the date to today
        setSelectedDate(today);
        toast({
          title: "Cannot view past dates",
          description: "You can only view today and future dates",
          variant: "destructive"
        });
        return;
      }
    } else {
      // In day view, simply check if the new date is before today
      if (newDate < today) {
        // If we would navigate to a date before today, set the date to today
        setSelectedDate(today);
        toast({
          title: "Cannot view past dates",
          description: "You can only view today and future dates",
          variant: "destructive"
        });
        return;
      }
    }
    
    setSelectedDate(newDate);
  };
  
  const handleNext = () => {
    // The text in the button is reversed from the state:
    // When showingWeek=true, button says "Day", and we should move by 1 day  
    // When showingWeek=false, button says "Week", and we should move by 7 days
    setSelectedDate(prev => addDays(prev, !showingWeek ? 7 : 1));
  };
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const now = new Date();
      const selectedDay = startOfDay(date);
      
      // Check if selected date is in the past
      if (selectedDay < startOfDay(now)) {
        toast({
          title: "Cannot select past dates",
          description: "Please select today or a future date",
          variant: "destructive"
        });
        return;
      }
      
      // Check if selected date is more than 3 months in the future
      if (selectedDay > startOfDay(addMonths(now, 3))) {
        toast({
          title: "Date too far in the future",
          description: "You can only book rooms up to 3 months in advance",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };
  
  const resetView = () => {
    // Reset to today's date
    setSelectedDate(startOfDay(new Date()));
    toast({
      title: "View reset",
      description: "Calendar has been reset to today's date"
    });
  };
  
  const toggleView = () => {
    setShowingWeek(prev => !prev);
  };
  
  const dateTitle = showingWeek
  ? format(selectedDate, "EEEE, MMMM d, yyyy")
  : `${format(selectedDate, "MMMM d, yyyy")} – ${format(weekEndDate, "MMMM d, yyyy")}`;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-8">
      {/* ✅ Render the filter ABOVE the table, outside <tbody> */}
      <FilterControls
        capacityFilter={capacityFilter}
        setCapacityFilter={setCapacityFilter}
      />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2 md:mb-0">
          {dateTitle}
        </h2>
        <div className="flex items-center space-x-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="border border-gray-200 px-3 py-2 bg-gray-50 rounded-md h-10 text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
              >
                <CalendarIcon className="h-4 w-4 mr-2 text-blue-600" />
                <span>Select Date</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
                // Disable all dates that are before today (comparing at midnight)
                disabled={(date) => {
                  const today = startOfDay(new Date());
                  return startOfDay(date) < today;
                }}
              />
            </PopoverContent>
          </Popover>
          
          <div className="date-navigator flex rounded-md overflow-hidden">
            <Button 
              variant="outline" 
              className="border border-gray-200 px-3 py-2 rounded-l-md h-10 hover:bg-gray-100 transition-colors"
              onClick={handlePrevious}
              // Disable if we're on the current day or if the selected date is somehow in the past
              disabled={isToday(selectedDate)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="border-t border-b border-gray-200 px-3 py-2 h-10 hover:bg-gray-100 transition-colors"
              onClick={toggleView}
            >
              {/* When showingWeek is true, display "Day" to let user switch to day mode */}
              {/* When showingWeek is false, display "Week" to let user switch to week mode */}
              {showingWeek ? "Day" : "Week"} View
            </Button>
            <Button 
              variant="outline" 
              className="border border-gray-200 px-3 py-2 rounded-r-md h-10 hover:bg-gray-100 transition-colors"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            className="border border-gray-200 px-3 py-2 rounded-md h-10 hover:bg-gray-100 transition-colors"
            onClick={resetView}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      {/* Library Hours Notice */}
      {[0, 6].includes(selectedDate.getDay()) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
          <p className="font-medium">Weekend Hours Notice</p>
          <p>The library closes at 5:00 PM on weekends. Rooms cannot be booked after closing time.</p>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className="border border-gray-200 p-3 text-left w-72 bg-gray-50">Space</th>
              <th className="border border-gray-200 p-3 text-center bg-gray-50" colSpan={12}>
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </th>
            </tr>
            <tr>
              <th className="border border-gray-200 bg-gray-50 p-2"></th>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm text-center w-20 time-header">9:00am</th>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm text-center w-20 time-header">10:00am</th>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm text-center w-20 time-header">11:00am</th>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm text-center w-20 time-header">12:00pm</th>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm text-center w-20 time-header">1:00pm</th>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm text-center w-20 time-header">2:00pm</th>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm text-center w-20 time-header">3:00pm</th>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm text-center w-20 time-header">4:00pm</th>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm text-center w-20 time-header">5:00pm</th>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm text-center w-20 time-header">6:00pm</th>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm text-center w-20 time-header">7:00pm</th>
              <th className="border border-gray-200 bg-gray-50 p-2 text-sm text-center w-20 time-header">8:00pm</th>
            </tr>
          </thead>
          <tbody>
            <RoomList
              selectedDate={selectedDate}
              capacityFilter={capacityFilter}
            />
          </tbody>
        </table>
        <div className="mt-4 flex flex-wrap gap-3 justify-end items-center text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-[#00a2ff] rounded-sm mr-2"></div>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-[#e0e0e0] rounded-sm mr-2"></div>
            <span className="text-gray-600">Occupied</span>
          </div>
        </div>
      </div>
    </div>
  );
}
