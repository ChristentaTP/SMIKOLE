import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTimes, faUser, faEnvelope, faLock } from "@fortawesome/free-solid-svg-icons"
import ChangeEmailModal from "./ChangeEmailModal"
import ChangePasswordModal from "./ChangePasswordModal"

export default function EditProfileModal({
  isOpen,
  onClose,
  onSave,
  onChangeEmail,
  onChangePassword,
  userData,
  currentEmail,
  isLoading = false
}) {
  const [nama, setNama] = useState("")
  const [isEmailOpen, setIsEmailOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)

  // Populate form when modal opens
  useEffect(() => {
    if (isOpen && userData) {
      setNama(userData.nama || "")
      setIsEmailOpen(false)
      setIsPasswordOpen(false)
    }
  }, [isOpen, userData])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nama.trim()) return
    onSave({ nama: nama.trim() })
  }

  const isChanged = nama.trim() !== (userData?.nama || "")
  const isValid = nama.trim().length > 0

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/30"
          onClick={onClose}
        />

        {/* Modal Content */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg mx-4 max-w-md w-full animate-fade-in max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Edit Profil</h2>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xl" />
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* Avatar Preview */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-[#085C85] text-white flex items-center justify-center font-bold text-3xl">
                {(nama || "U").charAt(0).toUpperCase()}
              </div>
            </div>

            {/* ── BAGIAN NAMA ── */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  Nama
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Masukkan nama Anda..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
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
                  disabled={isLoading || !isValid || !isChanged}
                  className="flex-1 bg-[#085C85] hover:bg-[#064a6a] text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Nama"
                  )}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="border-t dark:border-gray-700" />

            {/* ── BAGIAN EMAIL ── */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <FontAwesomeIcon icon={faEnvelope} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Email</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{currentEmail || "-"}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailOpen(true)}
                disabled={isLoading}
                className="text-sm font-semibold text-[#085C85] dark:text-[#4A9CC7] hover:underline disabled:opacity-50"
              >
                Ubah
              </button>
            </div>

            {/* ── BAGIAN PASSWORD ── */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <FontAwesomeIcon icon={faLock} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Password</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Ubah password akun Anda</p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordOpen(true)}
                disabled={isLoading}
                className="text-sm font-semibold text-[#085C85] dark:text-[#4A9CC7] hover:underline disabled:opacity-50"
              >
                Ubah
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modal Ubah Email */}
      <ChangeEmailModal
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        onSave={onChangeEmail}
        currentEmail={currentEmail}
        isLoading={isLoading}
      />

      {/* Sub-modal Ubah Password */}
      <ChangePasswordModal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
        onSave={onChangePassword}
        isLoading={isLoading}
      />
    </>
  )
}
