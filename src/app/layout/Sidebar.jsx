import {
  Home,
  Droplet,
  Edit,
  Users,
  Settings
} from "lucide-react"

export default function Sidebar() {
  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-16 bg-[#D9D9D9] text-gray-700 flex-col items-center py-4 gap-6">
        <Home size={20} />
        <Droplet size={20} />
        <Edit size={20} />
        <Users size={20} />
        <Settings size={20} />
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#D9D9D9] text-gray-700 border-t border-gray-300 flex justify-around py-2">
        <Home size={22} />
        <Droplet size={22} />
        <Edit size={22} />
        <Users size={22} />
        <Settings size={22} />
      </nav>
    </>
  )
}
