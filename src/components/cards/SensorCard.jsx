import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

export default function SensorCard({ title, value, unit, color, icon, status, statusColor, onClick }) {
  return (
    <div 
      className={`rounded-xl overflow-hidden shadow-md ${color} ${onClick ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform" : ""}`}
      onClick={onClick}
    >
      {/* Main Content */}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <p className="text-lg font-bold">{title}</p>
          {icon && <FontAwesomeIcon icon={icon} className="text-xl opacity-80" />}
        </div>
        <p className="text-2xl font-bold mt-2">
          {value} <span className="text-base font-normal">{unit}</span>
        </p>
      </div>
      
      {/* Status Bar (optional) */}
      {status && (
        <div className={`px-4 py-2 font-semibold text-sm ${statusColor || "bg-yellow-400 text-black"}`}>
          {status}
        </div>
      )}
    </div>
  )
}
