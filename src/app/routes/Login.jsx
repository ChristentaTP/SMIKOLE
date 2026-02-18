import { useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { loginUser } from "../../services/authService"
import { useAuth } from "../../contexts/AuthContext"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { isLoggedIn, loading: authLoading } = useAuth()

  // Jika sudah login, redirect ke dashboard
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#085C85] to-[#043d57]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
      </div>
    )
  }

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await loginUser(email, password)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      switch (err.code) {
        case "auth/invalid-email":
          setError("Format email tidak valid")
          break
        case "auth/user-not-found":
          setError("Akun tidak ditemukan")
          break
        case "auth/wrong-password":
          setError("Password salah")
          break
        case "auth/invalid-credential":
          setError("Email atau password salah")
          break
        case "auth/too-many-requests":
          setError("Terlalu banyak percobaan. Coba lagi nanti")
          break
        default:
          setError("Login gagal. Silakan coba lagi")
          console.error("Login error:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#085C85] to-[#043d57] px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="SMIKOLE" className="w-16 h-16 mb-3" />
          <h1 className="text-2xl font-bold text-gray-800">SMIKOLE</h1>
          <p className="text-sm text-gray-500 mt-1">Sistem Monitoring Kolam Lele</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh@email.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#085C85] text-white py-3 rounded-xl font-semibold hover:bg-[#064a6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Masuk...
              </span>
            ) : (
              "Masuk"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 SMIKOLE. All rights reserved.
        </p>
      </div>
    </div>
  )
}
