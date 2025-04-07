import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FilterControls() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="flex flex-col">
        <label className="font-medium mb-1">Location</label>
        <Select defaultValue="south-boulevard">
          <SelectTrigger className="w-full border border-[#ddd] px-2 py-1 rounded h-9">
            <SelectValue placeholder="South Boulevard" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="south-boulevard">South Boulevard</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex flex-col">
        <label className="font-medium mb-1">Category</label>
        <Select defaultValue="study-rooms">
          <SelectTrigger className="w-full border border-[#ddd] px-2 py-1 rounded h-9">
            <SelectValue placeholder="Study Rooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="study-rooms">Study Rooms</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex flex-col">
        <label className="font-medium mb-1">Capacity</label>
        <Select defaultValue="all-spaces">
          <SelectTrigger className="w-full border border-[#ddd] px-2 py-1 rounded h-9">
            <SelectValue placeholder="All Spaces (not seats)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-spaces">All Spaces (not seats)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
