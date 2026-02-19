import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTimes, faTrash, faCalendar } from "@fortawesome/free-solid-svg-icons"

export default function LogbookDetailModal({ isOpen, logbook, onClose, onDelete, isLoading = false }) {
  if (!isOpen || !logbook) return null

  const handleDelete = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus logbook ini?')) {
      onDelete(logbook.id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg mx-4 max-w-md w-full animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Detail Logbook</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto grow">
          {/* Title */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{logbook.title}</h3>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <FontAwesomeIcon icon={faCalendar} className="text-[#085C85] dark:text-[#4A9CC7]" />
            <span>{logbook.date}</span>
          </div>

          {/* Divider */}
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Description */}
          <div className="prose prose-sm max-w-none">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Deskripsi
            </h4>
            {logbook.description ? (
              <div 
                className="text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: logbook.description }}
              />
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">Tidak ada deskripsi</p>
            )}
          </div>
        </div>

        {/* Footer with Delete Button */}
        <div className="p-4 border-t dark:border-gray-700 shrink-0">
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="w-full bg-[#DC3545] hover:bg-[#c82333] text-white font-semibold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Menghapus...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTrash} />
                Hapus Logbook
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
