export default function LogbookCard({ title, date, fotoUrls = [], onClick }) {
  const firstPhoto = fotoUrls.length > 0 ? fotoUrls[0] : null

  return (
    <div 
      className="rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer transform transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex h-20 sm:h-24"
      onClick={onClick}
    >
      {firstPhoto ? (
        <div className="relative w-24 sm:w-32 h-full shrink-0">
          <img src={firstPhoto} alt={title} className="w-full h-full object-cover" />
          {fotoUrls.length > 1 && (
            <div className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[9px] font-bold px-1 py-0.5 rounded">
              📷 {fotoUrls.length}
            </div>
          )}
        </div>
      ) : (
        <div className="w-24 sm:w-32 h-full shrink-0 bg-linear-to-br from-[#4A9CC7] to-[#085C85] flex flex-col items-center justify-center opacity-90">
            <i className="ph ph-notebook text-2xl text-white opacity-80 mb-1"></i>
        </div>
      )}
      
      <div className="p-3 flex flex-col justify-center flex-1 min-w-0">
        <h3 className="text-gray-800 dark:text-gray-100 font-bold text-[13px] sm:text-sm line-clamp-2 wrap-break-word overflow-hidden mb-1">
          {title}
        </h3>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <i className="ph ph-calendar-blank"></i> {date}
        </span>
      </div>
    </div>
  )
}
