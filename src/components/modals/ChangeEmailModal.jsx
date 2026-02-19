import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTimes, faEnvelope, faLock, faExclamationTriangle, faCheck } from "@fortawesome/free-solid-svg-icons"

export default function ChangeEmailModal({ isOpen, onClose, onSave, currentEmail, isLoading = false }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword("")
      setNewEmail("")
      setError("")
      setSuccess(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const isValid = currentPassword.length > 0 && newEmail.length > 0 && newEmail !== currentEmail

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    try {
      await onSave(newEmail, currentPassword)
      setSuccess(true)
    } catch (err) {
      // Translate Firebase errors to Indonesian
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Password saat ini salah.")
      } else if (err.code === "auth/email-already-in-use") {
        setError("Email ini sudah digunakan akun lain.")
      } else if (err.code === "auth/invalid-email") {
        setError("Format email tidak valid.")
      } else {
        setError(err.message || "Terjadi kesalahan. Silakan coba lagi.")
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg mx-4 max-w-md w-full animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Ubah Email</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faCheck} className="text-3xl text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Link Verifikasi Terkirim!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Cek inbox <strong>{newEmail}</strong> dan klik link verifikasi untuk menyelesaikan perubahan email.
            </p>
            <button
              onClick={onClose}
              className="bg-[#085C85] hover:bg-[#064a6a] text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Mengerti
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Setelah klik Simpan, link verifikasi akan dikirim ke email baru Anda. Email berubah setelah link diklik.
            </p>
          </div>

          {/* Current Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Email Saat Ini
            </label>
            <p className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
              {currentEmail}
            </p>
          </div>

          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              <FontAwesomeIcon icon={faLock} className="mr-2" />
              Password Saat Ini
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setError("") }}
              placeholder="Masukkan password saat ini..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              required
              disabled={isLoading}
            />
          </div>

          {/* New Email */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
              Email Baru
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setError("") }}
              placeholder="Masukkan email baru..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              required
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {error}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || !isValid}
              className="flex-1 bg-[#085C85] hover:bg-[#064a6a] text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
