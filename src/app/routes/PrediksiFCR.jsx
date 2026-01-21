import { useState, useEffect } from "react"
import MainLayout from "../layout/MainLayout"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCalendar } from "@fortawesome/free-solid-svg-icons"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { 
  calculateFCR, 
  predictNextFCR, 
  getRecommendedFeed, 
  getFCRStatus, 
  getHistory, 
  addWeeklyData,
  getChartData 
} from "../../services/fcrService"

export default function PrediksiFCR() {
  // Form state
  const [formData, setFormData] = useState({
    pakan: "",
    tanggal: "",
    kenaikanBerat: ""
  })

  // Results state
  const [results, setResults] = useState({
    fcrAktual: null,
    fcrPrediksi: null,
    rekomendasiPakan: null,
    status: null
  })

  // History state
  const [history, setHistory] = useState([])
  const [chartData, setChartData] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Fetch data on mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [historyData, chartDataResult] = await Promise.all([
        getHistory(),
        getChartData()
      ])
      setHistory(historyData)
      setChartData(chartDataResult)
      
      // Set initial results from latest data
      if (historyData.length > 0) {
        const latest = historyData[historyData.length - 1]
        const fcrPrediksi = predictNextFCR(historyData)
        const status = getFCRStatus(latest.fcr)
        
        setResults({
          fcrAktual: latest.fcr,
          fcrPrediksi,
          rekomendasiPakan: getRecommendedFeed(fcrPrediksi, 240),
          status
        })
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const pakan = Number(formData.pakan)
    const kenaikanBerat = Number(formData.kenaikanBerat)
    
    if (pakan <= 0 || kenaikanBerat <= 0) {
      alert("Mohon isi data dengan benar")
      return
    }

    try {
      // Add new data
      await addWeeklyData({
        pakan,
        kenaikanBerat,
        tanggal: formData.tanggal
      })

      // Recalculate and refresh
      const fcrAktual = calculateFCR(pakan, kenaikanBerat)
      const historyData = await getHistory()
      const fcrPrediksi = predictNextFCR(historyData)
      const status = getFCRStatus(fcrAktual)
      const rekomendasiPakan = getRecommendedFeed(fcrPrediksi, kenaikanBerat)

      setResults({
        fcrAktual,
        fcrPrediksi,
        rekomendasiPakan,
        status
      })

      // Refresh data
      await fetchData()

      // Reset form
      setFormData({ pakan: "", tanggal: "", kenaikanBerat: "" })
    } catch (error) {
      console.error("Error calculating FCR:", error)
    }
  }

  // Pagination logic
  const totalPages = Math.ceil(history.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedHistory = history.slice(startIndex, startIndex + itemsPerPage)

  return (
    <MainLayout>
      <div className="pb-20 md:pb-0">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column */}
          <div className="space-y-6">
            {/* Input Data Mingguan */}
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border">
              <h2 className="text-lg font-bold mb-4">Input Data Mingguan</h2>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
                  {/* Jumlah Pakan */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Jumlah pakan minggu ini (gram)
                    </label>
                    <input
                      type="number"
                      name="pakan"
                      value={formData.pakan}
                      onChange={handleChange}
                      placeholder="300"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85]"
                      required
                    />
                  </div>

                  {/* Tanggal */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Pilih tanggal
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        name="tanggal"
                        value={formData.tanggal}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85]"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
                  {/* Kenaikan Berat */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Kenaikan berat ikan (gram)
                    </label>
                    <input
                      type="number"
                      name="kenaikanBerat"
                      value={formData.kenaikanBerat}
                      onChange={handleChange}
                      placeholder="240"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85]"
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-[#085C85] hover:bg-[#064a6a] text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Hitung FCR
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Grafik Historis */}
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border">
              <h2 className="text-lg font-bold mb-4">Grafik Historis</h2>
              
              {isLoading ? (
                <div className="h-48 md:h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#085C85]"></div>
                </div>
              ) : (
                <div className="h-48 md:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis 
                        domain={[0.5, 3]}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="fcrAktual" 
                        name="FCR Aktual"
                        stroke="#72BB53" 
                        strokeWidth={2}
                        dot={{ fill: "#72BB53", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="fcrPrediksi" 
                        name="FCR Prediksi"
                        stroke="#4A9CC7" 
                        strokeWidth={2}
                        dot={{ fill: "#4A9CC7", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Hasil Perhitungan */}
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border">
              <h2 className="text-lg font-bold mb-4">Hasil Perhitungan</h2>
              
              {results.fcrAktual !== null ? (
                <div className="space-y-4">
                  {/* FCR Aktual */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">FCR Aktual</p>
                      <p className="text-4xl font-bold">{results.fcrAktual}</p>
                    </div>
                    {results.status && (
                      <span className={`px-4 py-2 rounded-full font-semibold ${results.status.color} ${results.status.textColor}`}>
                        {results.status.label}
                      </span>
                    )}
                  </div>

                  {/* Prediksi FCR */}
                  <div>
                    <p className="text-sm text-gray-500">Prediksi FCR Minggu Depan</p>
                    <p className="text-3xl font-bold">{results.fcrPrediksi}</p>
                  </div>

                  {/* Rekomendasi Pakan */}
                  <div>
                    <p className="text-sm text-gray-500">Rekomendasi Pakan Minggu Depan</p>
                    <p className="text-3xl font-bold">{results.rekomendasiPakan} Gram</p>
                  </div>

                  {/* Status Description */}
                  {results.status && (
                    <p className="text-sm text-gray-600">
                      Status : {results.status.description}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Masukkan data untuk melihat hasil perhitungan</p>
              )}
            </div>

            {/* Tabel Riwayat */}
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-md border">
              <h2 className="text-lg font-bold mb-4">Tabel Riwayat</h2>
              
              {isLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#085C85]"></div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="py-2 px-2">Minggu</th>
                          <th className="py-2 px-2">Pakan (g)</th>
                          <th className="py-2 px-2">Kenaikan Berat (g)</th>
                          <th className="py-2 px-2">FCR</th>
                          <th className="py-2 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedHistory.map((item) => {
                          const status = getFCRStatus(item.fcr)
                          return (
                            <tr key={item.minggu} className="border-b">
                              <td className="py-3 px-2">{item.minggu}</td>
                              <td className="py-3 px-2">{item.pakan}</td>
                              <td className="py-3 px-2">{item.kenaikanBerat}</td>
                              <td className="py-3 px-2">{item.fcr}</td>
                              <td className="py-3 px-2">
                                <span className={`text-xs ${status.label === "Efisien" ? "text-green-600" : status.label === "Kurang Efisien" ? "text-yellow-600" : "text-red-600"}`}>
                                  {status.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                            currentPage === page
                              ? "bg-[#085C85] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      {totalPages > 4 && (
                        <span className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
