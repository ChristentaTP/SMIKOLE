import { useState } from "react"
import ConfirmationModal from "../modals/ConfirmationModal"
import ActuatorStatusModal from "../modals/ActuatorStatusModal"

export default function ActuatorCard({ name, isActive, mode = "otomatis", onToggle, onModeChange }) {
  const [showStatusModal, setShowStatusModal] = useState(false)   // modal pilih mode/power
  const [showConfirmModal, setShowConfirmModal] = useState(false)  // konfirmasi akhir sebelum simpan
  const [pendingStatusData, setPendingStatusData] = useState(null) // simpan pilihan sementara

  // Klik card → langsung buka modal status (tanpa konfirmasi awal)
  const handleCardClick = () => {
    setShowStatusModal(true)
  }

  // User selesai memilih mode/power → simpan pilihan sementara, tutup modal status, tampilkan konfirmasi
  const handleStatusSave = (statusData) => {
    setPendingStatusData(statusData)   // tahan pilihan
    setShowStatusModal(false)          // tutup modal edit
    setShowConfirmModal(true)          // tampilkan konfirmasi "Apakah yakin?"
  }

  // User menutup modal status (Batal) tanpa menyimpan
  const handleStatusClose = () => {
    setShowStatusModal(false)
    setPendingStatusData(null)
  }

  // User konfirmasi "Ya" → kirim ke Firestore
  const handleConfirm = () => {
    setShowConfirmModal(false)
    if (!pendingStatusData) return

    if (pendingStatusData.mode === "manual" && onToggle) {
      onToggle(pendingStatusData.powerState)
    }
    if (onModeChange) {
      onModeChange(pendingStatusData)
    }
    setPendingStatusData(null)
  }

  // User batalkan konfirmasi → kembali ke modal edit dengan pilihan sebelumnya
  const handleConfirmCancel = () => {
    setShowConfirmModal(false)
    setShowStatusModal(true) // buka kembali modal edit
  }

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={`rounded-xl px-5 py-4 shadow-md transition-all duration-300 cursor-pointer select-none active:scale-[0.98] hover:shadow-lg ${
          isActive ? "bg-[#A8D5A2]" : "bg-[#FFCDD2]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-semibold text-gray-800">{name}</span>
            {/* Mode Badge */}
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                mode === "manual" 
                  ? "bg-blue-100 text-blue-700" 
                  : "bg-green-100 text-green-700"
              }`}>
                {mode === "manual" ? "Manual" : "Otomatis"}
              </span>
              <span className={`text-xs font-medium ${
                isActive ? "text-green-600" : "text-red-500"
              }`}>
                • {isActive ? "ON" : "OFF"}
              </span>
            </div>
          </div>
          
          {/* Toggle Switch Visual (non-interactive, just visual indicator) */}
          <div
            className={`relative w-12 h-7 rounded-full transition-colors duration-300 pointer-events-none ${
              isActive ? "bg-[#4CAF50]" : "bg-[#DC3545]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                isActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Modal Pilih Mode & Power */}
      <ActuatorStatusModal
        isOpen={showStatusModal}
        actuatorName={name}
        isActive={isActive}
        currentMode={mode}
        onClose={handleStatusClose}
        onSave={handleStatusSave}
      />

      {/* Konfirmasi setelah Simpan */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        message="Apakah Anda yakin ingin mengubah pengaturan aktuator ini?"
        onConfirm={handleConfirm}
        onCancel={handleConfirmCancel}
      />
    </>
  )
}
