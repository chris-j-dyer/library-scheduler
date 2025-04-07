import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Users, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FilterControls() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Filter className="h-5 w-5 mr-2 text-blue-600" />
        Filter Available Rooms
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-600 mb-2 flex items-center">
            <MapPin className="h-4 w-4 mr-1 text-blue-600" />
            Location
          </label>
          <Select defaultValue="south-boulevard">
            <SelectTrigger className="w-full border border-gray-200 px-3 py-2 rounded-md h-11 bg-gray-50 hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
              <SelectValue placeholder="South Boulevard" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="south-boulevard">South Boulevard</SelectItem>
              <SelectItem value="university">University City</SelectItem>
              <SelectItem value="mint-hill">Mint Hill</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-600 mb-2 flex items-center">
            <Calendar className="h-4 w-4 mr-1 text-blue-600" />
            Room Type
          </label>
          <Select defaultValue="study-rooms">
            <SelectTrigger className="w-full border border-gray-200 px-3 py-2 rounded-md h-11 bg-gray-50 hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
              <SelectValue placeholder="Study Rooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="study-rooms">Study Rooms</SelectItem>
              <SelectItem value="meeting-rooms">Meeting Rooms</SelectItem>
              <SelectItem value="computer-labs">Computer Labs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-600 mb-2 flex items-center">
            <Users className="h-4 w-4 mr-1 text-blue-600" />
            Capacity
          </label>
          <Select defaultValue="all-spaces">
            <SelectTrigger className="w-full border border-gray-200 px-3 py-2 rounded-md h-11 bg-gray-50 hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
              <SelectValue placeholder="All Spaces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-spaces">All Spaces</SelectItem>
              <SelectItem value="1-2">1-2 People</SelectItem>
              <SelectItem value="3-5">3-5 People</SelectItem>
              <SelectItem value="6-10">6-10 People</SelectItem>
              <SelectItem value="10+">10+ People</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="mt-5 flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-colors">
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
