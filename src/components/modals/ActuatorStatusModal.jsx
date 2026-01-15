import { useState, useEffect } from "react"

export default function ActuatorStatusModal({ 
  isOpen, 
  actuatorName, 
  isActive, 
  onClose, 
  onSave 
}) {
  const [mode, setMode] = useState("otomatis") // "otomatis" atau "manual"
  const [powerState, setPowerState] = useState(false) // on/off untuk mode manual

  // Reset state ketika modal dibuka
  useEffect(() => {
    if (isOpen) {
      setMode("otomatis")
      setPowerState(isActive)
    }
  }, [isOpen, isActive])

  if (!isOpen) return null

  const handleSave = () => {
    onSave({
      mode,
      powerState: mode === "manual" ? powerState : null
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-gray-800">Status Aktuator</h2>
          <p className="text-sm text-gray-500 mt-1">{actuatorName}</p>
        </div>

        {/* Mode Section */}
        <div className="bg-[#E8F5E9] rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700">Mode Kontrol</p>
              <p className="text-xs text-gray-500 mt-1">
                {mode === "otomatis" ? "Diatur oleh sistem" : "Diatur manual"}
              </p>
            </div>
            
            {/* Mode Toggle - Segmented Control Style */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMode("otomatis")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                  mode === "otomatis" 
                    ? "bg-[#4CAF50] text-white shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setMode("manual")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                  mode === "manual" 
                    ? "bg-[#2196F3] text-white shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Manual
              </button>
            </div>
          </div>
        </div>

        {/* Power Control - Only visible in manual mode */}
        {mode === "manual" && (
          <div className="bg-[#FFF3E0] rounded-xl p-4 mb-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700">Kontrol Power</p>
                <p className="text-xs text-gray-500 mt-1">
                  Status: <span className={powerState ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                    {powerState ? "ON" : "OFF"}
                  </span>
                </p>
              </div>
              
              {/* Power Toggle - Segmented Control Style */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setPowerState(false)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                    !powerState 
                      ? "bg-red-500 text-white shadow-sm" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  OFF
                </button>
                <button
                  onClick={() => setPowerState(true)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                    powerState 
                      ? "bg-[#4CAF50] text-white shadow-sm" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  ON
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Info */}
        <div className="border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              mode === "manual" && powerState ? "bg-green-500 animate-pulse" : 
              mode === "manual" && !powerState ? "bg-red-500" : 
              "bg-blue-500 animate-pulse"
            }`} />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {mode === "manual" 
                  ? (powerState ? "Aktuator Aktif (Manual)" : "Aktuator Nonaktif (Manual)")
                  : "Aktuator Mode Otomatis"
                }
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {mode === "manual" 
                  ? "Anda mengontrol aktuator secara langsung"
                  : "Sistem akan mengatur aktuator berdasarkan sensor"
                }
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 py-2.5 rounded-lg border-2 border-gray-300 transition-colors duration-200"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="bg-[#4CAF50] hover:bg-[#43A047] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors duration-200 shadow-md"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}
