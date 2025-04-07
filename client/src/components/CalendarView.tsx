import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import RoomList from "./RoomList";

export default function CalendarView() {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium mb-2">Monday, April 7, 2025 – Sunday, April 13, 2025</h2>
      <div className="flex items-center mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="border border-[#ddd] px-2 py-0.5 mr-2 bg-gray-100 rounded text-sm inline-flex items-center h-[26px] min-h-[26px]"
        >
          <Calendar className="h-4 w-4 mr-1" />
          Go To Date
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border border-[#ddd] px-3 py-0.5 mx-1 bg-gray-100 rounded text-sm inline-flex items-center h-[26px] min-h-[26px] min-w-[26px]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="border border-[#ddd] px-3 py-0.5 mx-1 bg-gray-100 rounded text-sm inline-flex items-center h-[26px] min-h-[26px] min-w-[26px]"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-[#ddd]">
          <thead>
            <tr>
              <th className="border border-[#ddd] p-2 text-left w-72">Space</th>
              <th className="border border-[#ddd] p-2 text-center" colSpan={11}>
                Monday, April 7, 2025
              </th>
            </tr>
            <tr>
              <th className="border border-[#ddd] bg-gray-100 p-2"></th>
              <th className="border border-[#ddd] bg-gray-100 p-1 text-sm text-center w-16">2:00pm</th>
              <th className="border border-[#ddd] bg-gray-100 p-1 text-sm text-center w-16">3:00pm</th>
              <th className="border border-[#ddd] bg-gray-100 p-1 text-sm text-center w-16">4:00pm</th>
              <th className="border border-[#ddd] bg-gray-100 p-1 text-sm text-center w-16">5:00pm</th>
              <th className="border border-[#ddd] bg-gray-100 p-1 text-sm text-center w-16">6:00pm</th>
              <th className="border border-[#ddd] bg-gray-100 p-1 text-sm text-center w-16">7:00pm</th>
              <th className="border border-[#ddd] bg-gray-100 p-1 text-sm text-center w-16">8:00pm</th>
              <th className="border border-[#ddd] bg-gray-100 p-1 text-sm text-center w-16">9:00pm</th>
              <th className="border border-[#ddd] bg-gray-100 p-1 text-sm text-center w-16">10:00pm</th>
              <th className="border border-[#ddd] bg-gray-100 p-1 text-sm text-center w-16">11:00pm</th>
              <th className="border border-[#ddd] bg-gray-100 p-1 text-sm text-center w-16">12:00am</th>
            </tr>
          </thead>
          <tbody>
            <RoomList />
          </tbody>
        </table>
      </div>
    </div>
  );
}
