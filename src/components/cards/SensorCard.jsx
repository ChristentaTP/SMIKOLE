export default function SensorCard({ title, value, unit, color }) {
  return (
    <div className={`rounded-lg p-4 text-white ${color}`}>
      <p className="text-sm">{title}</p>
      <p className="text-2xl font-bold mt-1">
        {value} <span className="text-sm">{unit}</span>
      </p>
    </div>
  )
}
