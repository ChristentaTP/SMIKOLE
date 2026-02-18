import MainLayout from "../layout/MainLayout"
import { useAuth } from "../../contexts/AuthContext"
import { logoutUser } from "../../services/authService"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSignOutAlt, faUser, faEnvelope, faIdBadge } from "@fortawesome/free-solid-svg-icons"

export default function Personalisasi() {
  const { user, userData } = useAuth()
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
        <h1 className="text-2xl font-bold mb-6">Personalisasi</h1>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-md border p-6 mb-6">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-[#085C85] text-white flex items-center justify-center font-bold text-3xl mb-3">
              {(userData?.nama || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {userData?.nama || user?.email || "User"}
            </h2>
            <span className="text-sm text-[#085C85] font-medium bg-[#085C85]/10 px-3 py-1 rounded-full mt-1 capitalize">
              {userData?.role || "pembudidaya"}
            </span>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <FontAwesomeIcon icon={faEnvelope} className="text-gray-400 w-5" />
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-700">{user?.email || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <FontAwesomeIcon icon={faIdBadge} className="text-gray-400 w-5" />
              <div>
                <p className="text-xs text-gray-400">User ID</p>
                <p className="text-sm font-medium text-gray-700 font-mono">{user?.uid || "-"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <FontAwesomeIcon icon={faUser} className="text-gray-400 w-5" />
              <div>
                <p className="text-xs text-gray-400">Role</p>
                <p className="text-sm font-medium text-gray-700 capitalize">{userData?.role || "pembudidaya"}</p>
              </div>
            </div>
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
