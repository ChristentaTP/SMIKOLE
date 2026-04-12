export default function ConfirmationModal({ isOpen, message, onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={onCancel}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mx-4 max-w-sm w-full animate-fade-in">
        <p className="text-center text-gray-800 dark:text-gray-200 mb-6 text-base">
          {message}
        </p>
        
        <div className="flex justify-center gap-6">
          {/* Tidak Button - kiri */}
          <button
            onClick={onCancel}
            className="bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold px-6 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-500 transition-colors duration-200"
          >
            Tidak
          </button>

          {/* Ya Button - kanan */}
          <button
            onClick={onConfirm}
            className="bg-[#DC3545] hover:bg-[#c82333] text-white font-semibold px-8 py-2 rounded-lg transition-colors duration-200"
          >
            Ya
          </button>
        </div>
      </div>
    </div>
  )
}
