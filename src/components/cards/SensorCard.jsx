import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

export default function SensorCard({ title, value, unit, color, icon }) {
  return (
    <div className={`rounded-lg p-4 text-white ${color}`}>
      <div className="flex justify-between items-start">
        <p className="text-sm">{title}</p>
        {icon && <FontAwesomeIcon icon={icon} className="text-lg opacity-80" />}
      </div>
      <p className="text-2xl font-bold mt-1">
        {value} <span className="text-sm">{unit}</span>
      </p>
    </div>
  )
}
