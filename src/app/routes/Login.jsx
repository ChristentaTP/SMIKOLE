import { useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { loginUser, resetPassword } from "../../services/authService"
import { useAuth } from "../../contexts/AuthContext"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState("")
  const navigate = useNavigate()
  const { isLoggedIn, loading: authLoading } = useAuth()

  // Jika sudah login, redirect ke dashboard
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#085C85] to-[#043d57]">
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

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetError("")
    setResetLoading(true)
    try {
      await resetPassword(resetEmail)
      setResetSent(true)
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setResetError("Email tidak terdaftar")
      } else if (err.code === "auth/invalid-email") {
        setResetError("Format email tidak valid")
      } else {
        setResetError("Gagal mengirim email. Coba lagi nanti.")
      }
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#085C85] to-[#043d57] dark:from-gray-900 dark:to-gray-950 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="SMIKOLE" className="w-16 h-16 mb-3" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">SMIKOLE</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistem Monitoring Kolam Lele</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh@email.com"
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
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

        {/* Forgot Password Link */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => { setShowForgot(true); setResetEmail(email); setResetSent(false); setResetError("") }}
            className="text-sm text-[#085C85] dark:text-[#4A9CC7] hover:underline font-medium"
          >
            Lupa Password?
          </button>
        </div>

        {/* Forgot Password Modal */}
        {showForgot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowForgot(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg mx-4 max-w-md w-full animate-fade-in">
              <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Lupa Password</h2>
                <button onClick={() => setShowForgot(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
              </div>

              {resetSent ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Email Terkirim!</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Cek inbox <strong>{resetEmail}</strong> untuk link reset password. Jangan lupa cek folder spam.
                  </p>
                  <button
                    onClick={() => setShowForgot(false)}
                    className="bg-[#085C85] hover:bg-[#064a6a] text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                    Mengerti
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="p-4 space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Masukkan email Anda dan kami akan mengirim link untuk reset password.
                  </p>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => { setResetEmail(e.target.value); setResetError("") }}
                    placeholder="contoh@email.com"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    disabled={resetLoading}
                    autoFocus
                  />
                  {resetError && (
                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{resetError}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForgot(false)}
                      disabled={resetLoading}
                      className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading || !resetEmail}
                      className="flex-1 bg-[#085C85] hover:bg-[#064a6a] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {resetLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Mengirim...
                        </>
                      ) : (
                        "Kirim Link Reset"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          © 2026 SMIKOLE. All rights reserved.
        </p>
      </div>
    </div>
  )
}
