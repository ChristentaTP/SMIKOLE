import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { useConnectionStatus } from "../../hooks/useConnectionStatus"

export default function Header() {
  const { userData } = useAuth()
  const { isConnected } = useConnectionStatus("kolam1")

  const displayName = userData?.nama || userData?.email || "User"
  const displayRole = userData?.role || "pembudidaya"

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-white px-4 md:px-6 py-5 md:py-4 shadow">
      {/* Left - Welcome & Status */}
      <div>
        <p className="text-sm text-gray-500">Welcome to SMIKOLE</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
          <span className={`text-sm font-medium ${isConnected ? "text-green-600" : "text-red-500"}`}>
            {isConnected ? "Koneksi Terhubung" : "Koneksi Terputus"}
          </span>
        </div>
      </div>

      {/* Right - User Info */}
      <div className="flex items-center gap-3">
        {/* Desktop: horizontal layout */}
        <div className="hidden md:flex items-center gap-3">
          <span className="text-sm font-medium">{displayName}</span>
          <span className="text-xs text-gray-500 capitalize">{displayRole}</span>
        </div>
        
        {/* Mobile: vertical layout */}
        <div className="flex md:hidden flex-col items-end">
          <span className="text-sm font-medium">{displayName}</span>
          <span className="text-xs text-gray-500 capitalize">{displayRole}</span>
        </div>
        
        {/* Avatar - Clickable to go to Personalisasi */}
        <Link to="/personalisasi" className="block">
          <div className="w-8 h-8 rounded-full bg-[#085C85] text-white flex items-center justify-center font-bold text-sm cursor-pointer hover:ring-2 hover:ring-gray-300 transition-all duration-150 active:scale-75 active:ring-4 active:ring-blue-400">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </Link>
      </div>
    </header>
  )
}
