import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTimes } from "@fortawesome/free-solid-svg-icons"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts"

const SENSOR_CONFIG = {
  temperature: {
    label: "Suhu Air",
    unit: "°C",
    color: "#F0DF22",
    dataKey: "temperature",
    thresholds: { safe: [26, 32], warn: [24, 34] },
  },
  ph: {
    label: "pH Air",
    unit: "",
    color: "#085C85",
    dataKey: "ph",
    thresholds: { safe: [6.5, 8.5], warn: [6.0, 9.0] },
  },
  do: {
    label: "Oksigen Terlarut (DO)",
    unit: "ppm",
    color: "#72BB53",
    dataKey: "do",
    thresholds: { safe: [5, Infinity], warn: [4, Infinity] },
  },
  heater: {
    label: "Aktuator",
    unit: "",
    color: "#E34A33",
    dataKey: "heater",
    thresholds: null,
    isActuator: true,
  },
}

export default function SensorChartModal({ isOpen, onClose, sensorType, historicalData, sensorData }) {
  if (!isOpen || !sensorType) return null

  // Resolve sensor config: try direct match, then pattern-based, then generic fallback
  const resolveConfig = (key) => {
    let baseConfig = null;
    if (SENSOR_CONFIG[key]) {
      baseConfig = { ...SENSOR_CONFIG[key], dataKey: key };
    } else {
      const keyLower = key.toLowerCase()
      if (keyLower.includes('suhu') || keyLower.includes('temp')) baseConfig = { ...SENSOR_CONFIG.temperature, dataKey: key }
      else if (keyLower.includes('ph')) baseConfig = { ...SENSOR_CONFIG.ph, dataKey: key }
      else if (keyLower.includes('do') || keyLower.includes('oksigen')) baseConfig = { ...SENSOR_CONFIG.do, dataKey: key }
      else if (keyLower.includes('aktuator') || keyLower.includes('heater')) baseConfig = { ...SENSOR_CONFIG.heater, dataKey: key }
      else {
        // Generic fallback
        baseConfig = {
          label: key.charAt(0).toUpperCase() + key.slice(1),
          unit: "",
          color: "#085C85",
          dataKey: key,
          thresholds: null,
        }
      }
    }

    // Merge with dynamic data from DB if available
    if (sensorData) {
      baseConfig.label = sensorData.label || baseConfig.label;
      if (sensorData.unit !== undefined && sensorData.unit !== "") baseConfig.unit = sensorData.unit;
      
      const parseThresh = (val) => {
        if (val === undefined || val === null || val === "") return null;
        const parsed = parseFloat(String(val).replace(',', '.'));
        return isNaN(parsed) ? null : parsed;
      }
      
      const t = sensorData.thresholds || {};
      const amanMin = parseThresh(t.amanMin);
      const amanMax = parseThresh(t.amanMax);
      const waspMin = parseThresh(t.waspMin);
      const waspMax = parseThresh(t.waspMax);

      // As long as they have configured AT LEAST one parameter, we accept it as dynamic bounds
      if (amanMin !== null || amanMax !== null || waspMin !== null || waspMax !== null) {
        baseConfig.thresholds = {
          amanMin,
          amanMax,
          waspMin,
          waspMax
        }
      }
    }
    return baseConfig;
  }

  const config = resolveConfig(sensorType)
  if (!config) return null

  // Format tooltip date
  const formatDate = (date) => {
    if (!date) return "-"
    const d = new Date(date)
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  // Format X axis to show time
  const formatTime = (date) => {
    const d = new Date(date)
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  // Sort data ascending so latest readings appear on the right
  const chartData = [...historicalData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Calculate extended domain to guarantee threshold lines are visible
  const yDomain = (() => {
    if (config.isActuator) return [0, 1];
    const t = config.thresholds || {};
    const threshVals = [t.amanMin, t.amanMax, t.waspMin, t.waspMax].filter(v => v !== undefined && v !== null);
    if (threshVals.length === 0) return ['auto', 'auto'];
    const minT = Math.min(...threshVals);
    const maxT = Math.max(...threshVals);
    return [
      dataMin => Math.min(dataMin, minT) - 1,
      dataMax => Math.max(dataMax, maxT) + 1
    ];
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg mx-3 max-w-2xl w-full animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              Grafik {config.label}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Data historis sensor
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Chart */}
        <div className="p-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatTime}
                  fontSize={11}
                  tick={{ fill: "#9ca3af" }}
                />
                <YAxis
                  fontSize={11}
                  tick={{ fill: "#9ca3af" }}
                  tickFormatter={(v) => {
                    if (config.isActuator) return v === 1 ? "ON" : "OFF"
                    return config.unit ? `${v}${config.unit}` : v
                  }}
                  domain={yDomain}
                  ticks={config.isActuator ? [0, 1] : undefined}
                />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value) => {
                    if (config.isActuator) return [value === 1 ? "ON" : "OFF", config.label]
                    return [`${value}${config.unit ? " " + config.unit : ""}`, config.label]
                  }}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    color: "#000"
                  }}
                />

                {/* Reference Lines */}
                {(() => {
                  let topRed = null;
                  let topYellow = null;
                  let botYellow = null;
                  let botRed = null;

                  if (config.thresholds) {
                    const { amanMin, amanMax, waspMin, waspMax } = config.thresholds;
                    
                    if (amanMax !== undefined && amanMax !== null) {
                      if (waspMax !== undefined && waspMax !== null && waspMax > amanMax) {
                        topRed = waspMax;
                        topYellow = amanMax;
                      } else {
                        topRed = amanMax;
                      }
                    }

                    if (amanMin !== undefined && amanMin !== null) {
                      if (waspMin !== undefined && waspMin !== null && waspMin < amanMin) {
                        botYellow = amanMin;
                        botRed = waspMin;
                      } else {
                        botRed = amanMin;
                      }
                    }
                  }

                  return (
                    <>
                      {topRed !== null && <ReferenceLine y={topRed} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />}
                      {topYellow !== null && <ReferenceLine y={topYellow} stroke="#eab308" strokeWidth={2} strokeDasharray="4 4" />}
                      {botYellow !== null && <ReferenceLine y={botYellow} stroke="#eab308" strokeWidth={2} strokeDasharray="4 4" />}
                      {botRed !== null && <ReferenceLine y={botRed} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />}
                    </>
                  );
                })()}

                <Line
                  type={config.isActuator ? "stepAfter" : "monotone"}
                  dataKey={config.dataKey}
                  stroke={config.color}
                  strokeWidth={2.5}
                  dot={config.isActuator ? false : { fill: config.color, r: 3 }}
                  activeDot={{ r: 6, stroke: config.color, strokeWidth: 2, fill: "white" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              Tidak ada data historis untuk ditampilkan
            </div>
          )}

          {/* Threshold Legend */}
          {config.thresholds && config.thresholds.safe ? (
            <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500 dark:text-gray-400 justify-center">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Aman: {config.thresholds.safe[0]}–{config.thresholds.safe[1] === Infinity ? "∞" : config.thresholds.safe[1]} {config.unit}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                Waspada: {config.thresholds.warn[0]}–{config.thresholds.warn[1] === Infinity ? "∞" : config.thresholds.warn[1]} {config.unit}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Bahaya: di luar batas
              </span>
            </div>
          ) : config.thresholds && config.thresholds.amanMin !== undefined ? (
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400 justify-center">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Aman: 
                {config.thresholds.amanMin !== null ? ` ${config.thresholds.amanMin}` : ""}
                {(config.thresholds.amanMin !== null && config.thresholds.amanMax !== null) ? " - " : (config.thresholds.amanMax !== null ? " hingga" : "> ")}
                {config.thresholds.amanMax !== null ? ` ${config.thresholds.amanMax}` : ""}
                {" "}{config.unit}
              </span>
              {(config.thresholds.waspMin !== null || config.thresholds.waspMax !== null) && (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                  Waspada: 
                  {config.thresholds.waspMin !== null ? ` ${config.thresholds.waspMin}` : ""}
                  {(config.thresholds.waspMin !== null && config.thresholds.waspMax !== null) ? " - " : (config.thresholds.waspMax !== null ? " hingga" : "")}
                  {config.thresholds.waspMax !== null ? ` ${config.thresholds.waspMax}` : ""}
                  {" "}{config.unit}
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Bahaya: di luar batas
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
