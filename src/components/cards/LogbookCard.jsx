export default function LogbookCard({ title, date, fotoUrls = [], onClick }) {
  const firstPhoto = fotoUrls.length > 0 ? fotoUrls[0] : null

  return (
    <div 
      className="rounded-xl overflow-hidden shadow-md cursor-pointer transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
      onClick={onClick}
    >
      {firstPhoto ? (
        <div className="relative h-32">
          <img src={firstPhoto} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
          
          {/* Photo count badge */}
          {fotoUrls.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
              📷 {fotoUrls.length}
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col justify-end">
            <h3 className="text-white font-bold text-lg line-clamp-1 wrap-break-word overflow-hidden" style={{ wordBreak: 'break-word' }}>
              {title}
            </h3>
            <span className="text-white/80 text-xs mt-1">{date}</span>
          </div>
        </div>
      ) : (
        <div className="bg-linear-to-br from-[#4A9CC7] to-[#085C85] p-4 h-32 flex flex-col justify-between">
          <h3 className="text-white font-bold text-lg line-clamp-2 wrap-break-word overflow-hidden" style={{ wordBreak: 'break-word' }}>
            {title}
          </h3>
          <div className="self-start">
            <span className="bg-[#085C85]/80 text-white text-xs px-3 py-1 rounded-full">{date}</span>
          </div>
        </div>
      )}
    </div>
  )
}
