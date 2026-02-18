/**
 * Protected Route
 * Redirect ke /login jika belum login
 */

import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

export default function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#085C85]"></div>
          <p className="text-gray-500 text-sm">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return children
}
