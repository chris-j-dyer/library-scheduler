import { UserIcon, ShieldCheckIcon } from "lucide-react";

const rooms = [
  {
    id: 1,
    name: "Group Study Room",
    capacity: 12,
    availability: [false, false, false, false, false, false, false, true, true, true, true]
  },
  {
    id: 2,
    name: "Study Room 1",
    capacity: 5,
    availability: [false, false, false, false, false, false, false, true, true, true, true]
  },
  {
    id: 3,
    name: "Study Room 2",
    capacity: 5,
    availability: [false, false, false, false, false, true, true, false, true, true, true]
  },
  {
    id: 4,
    name: "Study Room 3",
    capacity: 2,
    availability: [false, false, false, false, false, true, true, false, true, true, true]
  },
  {
    id: 5,
    name: "Study Room 4",
    capacity: 2,
    availability: [false, false, false, false, false, false, true, false, true, true, true]
  },
  {
    id: 6,
    name: "Study Room 5",
    capacity: 2,
    availability: [false, true, false, false, false, true, true, false, true, true, true]
  }
];

export default function RoomList() {
  return (
    <>
      {rooms.map((room) => (
        <tr key={room.id}>
          <td className="border border-[#ddd] p-1">
            <div className="flex items-center">
              <span className="info-btn mr-2">info</span>
              <span>{room.name} (Capacity {room.capacity})</span>
              <UserIcon className="h-5 w-5 ml-2 text-blue-700" />
              <ShieldCheckIcon className="h-5 w-5 ml-1 text-blue-700" />
            </div>
          </td>
          {room.availability.map((isAvailable, index) => (
            <td key={index} className="p-0 border border-[#ddd]">
              <div className={`${isAvailable ? 'available' : 'occupied'} calendar-cell`}></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
