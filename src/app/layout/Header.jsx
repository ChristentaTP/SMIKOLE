import { Link } from "react-router-dom"

export default function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between bg-white px-4 md:px-6 py-5 md:py-4 shadow">
      {/* Left - Welcome & Status */}
      <div>
        <p className="text-sm text-gray-500">Welcome to SMIKOLE</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-green-600 font-medium">
            Koneksi Terhubung
          </span>
        </div>
      </div>

      {/* Right - User Info */}
      <div className="flex items-center gap-3">
        {/* Desktop: horizontal layout */}
        <div className="hidden md:flex items-center gap-3">
          <span className="text-sm font-medium">John Doe</span>
          <span className="text-xs text-gray-500">Pembudidaya</span>
        </div>
        
        {/* Mobile: vertical layout */}
        <div className="flex md:hidden flex-col items-end">
          <span className="text-sm font-medium">John Doe</span>
          <span className="text-xs text-gray-500">Pembudidaya</span>
        </div>
        
        {/* Avatar - Clickable on mobile to go to Personalisasi */}
        <Link to="/personalisasi" className="block">
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQKY7Aw1VjghTd-ESywfZD10frXXEo1NNJrlw&s" 
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-gray-300 transition-all duration-150 active:scale-75 active:ring-4 active:ring-blue-400"
          />
        </Link>
      </div>
    </header>
  )
}

