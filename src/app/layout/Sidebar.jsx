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
import { useNotifications } from "../../hooks/useNotifications"
import { useAuth } from "../../contexts/AuthContext"

const menuItems = [
  { icon: faHome, label: "Dashboard", path: "/dashboard" },
  { icon: faDroplet, label: "Kontrol Aktuator", path: "/kontrol-aktuator" },
  { icon: faPenToSquare, label: "Logbook", path: "/logbook", roles: ["pembudidaya"] },

  { icon: faUsers, label: "Prediksi FCR", path: "/prediksi-fcr" },
  { icon: faBell, label: "Notifikasi", path: "/notifikasi" },
  { icon: faGear, label: "Personalisasi", path: "/personalisasi" },
]

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { user, userData } = useAuth()
  const { unreadCount } = useNotifications(user?.uid || "001")
  const userRole = userData?.role || "pembudidaya"

  // Filter menu items based on user role
  const filteredMenu = menuItems.filter(item => !item.roles || item.roles.includes(userRole))

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
        {filteredMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-lg transition-colors hover:bg-[#064a6a] ${
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
            {/* Notification Badge */}
            {item.label === "Notifikasi" && unreadCount > 0 && (
              <span className={`absolute flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 ${
                isExpanded ? "right-2" : "-top-1 -right-1"
              }`}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#085C85] text-white border-t border-[#064a6a] flex justify-around py-4 z-50">
        {filteredMenu.filter(item => item.label !== "Personalisasi").map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 text-xs transition-all active:scale-90 active:bg-[#064a6a] rounded-lg p-3 ${
                isActive ? "bg-[#043d57]" : ""
              }`
            }
          >
            <FontAwesomeIcon icon={item.icon} size="xl" />
            {/* Notification Badge (mobile) */}
            {item.label === "Notifikasi" && unreadCount > 0 && (
              <span className="absolute -top-1 right-0 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
