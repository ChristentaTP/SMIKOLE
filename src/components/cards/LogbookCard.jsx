export default function LogbookCard({ title, date, onClick }) {
  return (
    <div 
      className="rounded-xl overflow-hidden shadow-md cursor-pointer transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
      onClick={onClick}
    >
      {/* Card with blue gradient background */}
      <div className="bg-linear-to-br from-[#4A9CC7] to-[#085C85] p-4 h-32 flex flex-col justify-between">
        {/* Title */}
        <h3 
          className="text-white font-bold text-lg line-clamp-2 wrap-break-word overflow-hidden" 
          style={{ wordBreak: 'break-word' }}
        >
          {title}
        </h3>
        
        {/* Date Badge */}
        <div className="self-start">
          <span className="bg-[#085C85]/80 text-white text-xs px-3 py-1 rounded-full">
            {date}
          </span>
        </div>
      </div>
    </div>
  )
}
