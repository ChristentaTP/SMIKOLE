import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTimes, faTrash, faCalendar, faPenToSquare, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons"
import { useState } from "react"

export default function LogbookDetailModal({ isOpen, logbook, onClose, onEdit, onDelete, isLoading = false }) {
  const [photoIndex, setPhotoIndex] = useState(0)
  
  if (!isOpen || !logbook) return null

  const photos = logbook.fotoUrls || []

  const handleDelete = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus logbook ini?')) {
      onDelete(logbook.id)
    }
  }

  const prevPhoto = () => setPhotoIndex(i => (i > 0 ? i - 1 : photos.length - 1))
  const nextPhoto = () => setPhotoIndex(i => (i < photos.length - 1 ? i + 1 : 0))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg mx-4 max-w-md w-full animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Detail Logbook</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto grow">
          {/* Title */}
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white wrap-break-word overflow-hidden" style={{ wordBreak: 'break-word' }}>
            {logbook.title}
          </h3>

          {/* Date */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <FontAwesomeIcon icon={faCalendar} className="text-[#085C85] dark:text-[#4A9CC7]" />
            <span>{logbook.date}</span>
          </div>

          {/* Photos carousel */}
          {photos.length > 0 && (
            <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <img 
                src={photos[photoIndex]} 
                alt={`Foto ${photoIndex + 1}`} 
                className="w-full max-h-64 object-cover cursor-pointer"
                onClick={() => window.open(photos[photoIndex], '_blank')}
                title="Klik untuk lihat ukuran penuh"
              />
              
              {/* Navigation arrows */}
              {photos.length > 1 && (
                <>
                  <button onClick={prevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                    <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
                  </button>
                  <button onClick={nextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                    <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
                  </button>
                  
                  {/* Dots indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                      <button key={i} onClick={() => setPhotoIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === photoIndex ? 'bg-white' : 'bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Description */}
          <div className="prose prose-sm max-w-none">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Deskripsi</h4>
            {logbook.description ? (
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed wrap-break-word overflow-hidden"
                style={{ wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: logbook.description }} />
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">Tidak ada deskripsi</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 shrink-0 flex gap-3">
          <button onClick={() => onEdit(logbook)} disabled={isLoading}
            className="flex-1 bg-[#085C85] hover:bg-[#064a6a] text-white font-semibold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
            <FontAwesomeIcon icon={faPenToSquare} />
            Edit
          </button>
          <button onClick={handleDelete} disabled={isLoading}
            className="flex-1 bg-[#DC3545] hover:bg-[#c82333] text-white font-semibold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Menghapus...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTrash} />
                Hapus
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
