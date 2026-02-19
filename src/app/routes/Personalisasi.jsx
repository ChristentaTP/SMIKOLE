import MainLayout from "../layout/MainLayout"
import { useAuth } from "../../contexts/AuthContext"
import { useTheme } from "../../contexts/ThemeContext"
import { logoutUser } from "../../services/authService"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSignOutAlt, faUser, faEnvelope, faIdBadge, faSun, faMoon } from "@fortawesome/free-solid-svg-icons"

export default function Personalisasi() {
  const { user, userData } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (!window.confirm("Apakah Anda yakin ingin keluar?")) return
    try {
      await logoutUser()
      navigate("/login", { replace: true })
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <MainLayout>
      <div className="pb-20 md:pb-0 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">Personalisasi</h1>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border dark:border-gray-700 p-6 mb-6">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-[#085C85] text-white flex items-center justify-center font-bold text-3xl mb-3">
              {(userData?.nama || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {userData?.nama || user?.email || "User"}
            </h2>
            <span className="text-sm text-[#085C85] dark:text-[#4A9CC7] font-medium bg-[#085C85]/10 dark:bg-[#085C85]/20 px-3 py-1 rounded-full mt-1 capitalize">
              {userData?.role || "pembudidaya"}
            </span>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 dark:text-gray-500 w-5" />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.email || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <FontAwesomeIcon icon={faIdBadge} className="text-gray-400 dark:text-gray-500 w-5" />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">User ID</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 font-mono">{user?.uid || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <FontAwesomeIcon icon={faUser} className="text-gray-400 dark:text-gray-500 w-5" />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Role</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize">{userData?.role || "pembudidaya"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dark Mode Toggle Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border dark:border-gray-700 p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <FontAwesomeIcon 
                  icon={isDark ? faMoon : faSun} 
                  className={`text-lg ${isDark ? "text-yellow-300" : "text-yellow-500"}`} 
                />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">Mode Gelap</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {isDark ? "Mode gelap aktif" : "Mode terang aktif"}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={toggleTheme}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#085C85] dark:focus:ring-offset-gray-800 ${
                isDark ? "bg-[#085C85]" : "bg-gray-300"
              }`}
              aria-label="Toggle dark mode"
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                  isDark ? "translate-x-6" : "translate-x-0"
                }`}
              >
                <FontAwesomeIcon 
                  icon={isDark ? faMoon : faSun} 
                  className={`text-xs ${isDark ? "text-[#085C85]" : "text-yellow-500"}`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faSignOutAlt} />
          Keluar
        </button>
      </div>
    </MainLayout>
  )
}
