import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faHome,
  faDroplet,
  faPenToSquare,
  faUsers,
  faGear,
  faBell,
  faBars
} from "@fortawesome/free-solid-svg-icons"
import { NavLink } from "react-router-dom"

const menuItems = [
  { icon: faHome, label: "Dashboard", path: "/dashboard" },
  { icon: faDroplet, label: "Kontrol Aktuator", path: "/kontrol-aktuator" },
  { icon: faPenToSquare, label: "Logbook", path: "/logbook" },
  { icon: faUsers, label: "Prediksi FCR", path: "/prediksi-fcr" },
  { icon: faBell, label: "Notifikasi", path: "/notifikasi" },
  { icon: faGear, label: "Personalisasi", path: "/personalisasi" },
]

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside 
        className={`hidden md:flex sticky top-0 h-screen bg-[#085C85] text-white flex-col items-center py-4 gap-4 transition-all duration-300 ${
          isExpanded ? "w-56" : "w-16"
        }`}
      >
        {/* Logo */}
        <div className="mb-2">
          <img 
            src="/logo.svg" 
            alt="SMIKOLE Logo" 
            className={`transition-all duration-300 ${isExpanded ? "w-20 h-20" : "w-10 h-10"}`}
          />
        </div>

        {/* Burger Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-12 h-12 flex items-center justify-center rounded-lg transition-colors hover:bg-[#064a6a] mb-2"
          title={isExpanded ? "Tutup Sidebar" : "Buka Sidebar"}
        >
          <FontAwesomeIcon icon={faBars} size="lg" />
        </button>

        {/* Menu Items */}
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg transition-colors hover:bg-[#064a6a] ${
                isExpanded ? "w-48 px-3 py-2" : "w-10 h-10 justify-center"
              } ${isActive ? "bg-[#043d57]" : ""}`
            }
          >
            <FontAwesomeIcon icon={item.icon} size="lg" className="shrink-0" />
            {isExpanded && (
              <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#085C85] text-white border-t border-[#064a6a] flex justify-around py-4 z-50">
        {menuItems.filter(item => item.label !== "Personalisasi").map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs transition-all active:scale-90 active:bg-[#064a6a] rounded-lg p-3 ${
                isActive ? "bg-[#043d57]" : ""
              }`
            }
          >
            <FontAwesomeIcon icon={item.icon} size="xl" />
          </NavLink>
        ))}
      </nav>
    </>
  )
}
