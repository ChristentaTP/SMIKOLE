import { useState } from "react"
import ConfirmationModal from "../modals/ConfirmationModal"
import ActuatorStatusModal from "../modals/ActuatorStatusModal"

export default function ActuatorCard({ name, isActive, onToggle, onModeChange }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [pendingState, setPendingState] = useState(null)
  const [mode, setMode] = useState("otomatis") // "otomatis" atau "manual"
  const [powerState, setPowerState] = useState(false)

  const handleToggleClick = () => {
    setPendingState(!isActive)
    setShowConfirmModal(true)
  }

  const handleConfirm = () => {
    setShowConfirmModal(false)
    // Setelah konfirmasi, tampilkan modal status aktuator
    setShowStatusModal(true)
  }

  const handleCancel = () => {
    setShowConfirmModal(false)
    setPendingState(null)
  }

  const handleStatusSave = (statusData) => {
    setMode(statusData.mode)
    if (statusData.mode === "manual") {
      setPowerState(statusData.powerState)
      // Update status aktuator berdasarkan power state
      if (onToggle) {
        onToggle(statusData.powerState)
      }
    }
    // Callback untuk mode change jika diperlukan
    if (onModeChange) {
      onModeChange(statusData)
    }
    setShowStatusModal(false)
    setPendingState(null)
  }

  const handleStatusClose = () => {
    setShowStatusModal(false)
    setPendingState(null)
  }

  // Tentukan status display berdasarkan mode
  const getDisplayStatus = () => {
    if (mode === "manual") {
      return powerState
    }
    return isActive
  }

  return (
    <>
      <div className={`rounded-xl px-5 py-4 shadow-md transition-colors duration-300 ${
        getDisplayStatus() ? "bg-[#A8D5A2]" : "bg-[#FFCDD2]"
      }`}>
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
                getDisplayStatus() ? "text-green-600" : "text-red-500"
              }`}>
                • {getDisplayStatus() ? "ON" : "OFF"}
              </span>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <button
            onClick={handleToggleClick}
            className={`relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none ${
              getDisplayStatus() ? "bg-[#4CAF50]" : "bg-[#DC3545]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                getDisplayStatus() ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        message="Apakah anda yakin ingin mengambil alih aktuator ini?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* Actuator Status Modal */}
      <ActuatorStatusModal
        isOpen={showStatusModal}
        actuatorName={name}
        isActive={isActive}
        onClose={handleStatusClose}
        onSave={handleStatusSave}
      />
    </>
  )
}
