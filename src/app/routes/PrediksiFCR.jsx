import { useState, useEffect } from "react"
import MainLayout from "../layout/MainLayout"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import {
  predictFCR,
  getHistory,
  savePredictionToFirestore,
  getFCRStatusStyle
} from "../../services/fcrService"
import { useAuth } from "../../contexts/AuthContext"
import { subscribeToPonds } from "../../services/dashboardService"
import * as XLSX from "xlsx"

export default function PrediksiFCR() {
  const { user, userData } = useAuth()

  // Pond access state
  const [hasAccess, setHasAccess] = useState(false)
  const [accessChecked, setAccessChecked] = useState(false)
  const [activePondId, setActivePondId] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    siklus: "",
    DOC: "",
    populasi: "1000",
    bobot_awal_per_ekor_gr: "",
    pakan_harian_gr: "",
    panjang_periode_hari: "7"
  })

  // Results state
  const [results, setResults] = useState(null)

  // History state
  const [history, setHistory] = useState([])
  const [chartData, setChartData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPredicting, setIsPredicting] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Modals
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Check pond assignment
  useEffect(() => {
    if (!user || !userData) return

    const unsubscribe = subscribeToPonds((ponds) => {
      // Find a pond that has FCR configured
      const pondWithFCR = ponds.find(p => (p.fcr || []).length > 0)
      if (pondWithFCR) {
        setHasAccess(true)
        setActivePondId(pondWithFCR.id)
      } else {
        setHasAccess(false)
        setActivePondId(null)
        setIsLoading(false)
      }
      setAccessChecked(true)
    }, user.uid, userData.role)

    return () => unsubscribe()
  }, [user, userData])

  // Fetch data when pond access is confirmed
  useEffect(() => {
    if (hasAccess && activePondId) {
      fetchData(activePondId)
    }
  }, [hasAccess, activePondId])

  const formatChartData = (records) => {
    const sorted = [...records].reverse()

    return sorted.map(r => ({
      name: `C${r.input.siklus} DOC${r.input.DOC}`,
      adg: r.metrics.ADG_gr_per_ekor_hari,
      fcr: r.metrics.FCR
    }))
  }

  const fetchData = async (pondId) => {
    setIsLoading(true)
    try {
      const historyData = await getHistory(pondId, 20)
      setHistory(historyData)
      setChartData(formatChartData(historyData))

      if (historyData.length > 0) {
        setResults(historyData[0])
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
    setIsPredicting(true)

    const payload = {
      siklus: parseInt(formData.siklus),
      DOC: parseInt(formData.DOC),
      populasi: parseInt(formData.populasi),
      bobot_awal_per_ekor_gr: parseFloat(formData.bobot_awal_per_ekor_gr),
      pakan_harian_gr: parseFloat(formData.pakan_harian_gr),
      panjang_periode_hari: parseInt(formData.panjang_periode_hari)
    }

    try {
      // 1. Dapatkan prediksi riil dari AI
      const data = await predictFCR(payload)
      setResults(data)

      // 2. Simpan hasil ke Firestore
      await savePredictionToFirestore(payload, data, activePondId)

      // 3. Refresh data tabel/grafik
      await fetchData(activePondId)

      setFormData(prev => ({
        ...prev,
        DOC: "",
        bobot_awal_per_ekor_gr: "",
        pakan_harian_gr: ""
      }))
    } catch (error) {
      console.error("Error calculating FCR:", error)
      alert(`Gagal memprediksi atau menyimpan data.\nDetail Error: ${error.message}`)
    } finally {
      setIsPredicting(false)
    }
  }

  // Pagination logic
  const totalPages = Math.ceil(history.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedHistory = history.slice(startIndex, startIndex + itemsPerPage)

  const handleExportExcel = () => {
    if (history.length === 0) return

    // 1. Format the data to be exported
    const formattedData = history.map((item, index) => ({
      "No": index + 1,
      "Siklus": item.input.siklus,
      "DOC (Hari)": item.input.DOC,
      "Populasi (Ekor)": item.input.populasi,
      "Bobot Awal (gr)": item.input.bobot_awal_per_ekor_gr,
      "Pakan Harian (gr)": item.input.pakan_harian_gr,
      "Periode (Hari)": item.input.panjang_periode_hari,
      "ADG (gr/hari)": item.metrics?.ADG_gr_per_ekor_hari?.toFixed(2),
      "FCR": item.metrics?.FCR?.toFixed(2),
      "Status Efisiensi": item.metrics?.status_efisiensi,
      "Rekomendasi Pakan (gr)": item.recommendations?.pakan_harian_next_gr,
      "Aksi": item.recommendations?.aksi,
      "Tanggal Simpan": new Date(item.createdAt).toLocaleString('id-ID')
    }))

    // 2. Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(formattedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat FCR")

    // 3. Save as file
    XLSX.writeFile(workbook, "Laporan_Prediksi_FCR_SMIKOLE.xlsx")
  }

  // No access guard
  if (accessChecked && !hasAccess) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <i className="ph ph-lock-key text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
          <h2 className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2">Akses Tidak Tersedia</h2>
          <p className="text-gray-500 dark:text-gray-500 max-w-md">
            Anda belum di-assign ke kolam dengan fitur FCR. Hubungi admin untuk mendapatkan akses.
          </p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="pb-32 md:pb-0">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Column */}
          <div className="space-y-6">
            {/* Input Data Mingguan */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold dark:text-white">Prediksi FCR AI</h2>
                <button
                  type="button"
                  onClick={() => setIsInfoModalOpen(true)}
                  className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800/60 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <i className="ph ph-question text-lg"></i>
                  <span>Panduan & Istilah</span>
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
                  {/* Siklus */}
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Siklus
                    </label>
                    <input
                      type="number"
                      name="siklus"
                      value={formData.siklus}
                      onChange={handleChange}
                      placeholder="1"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      required
                      min="1"
                    />
                  </div>

                  {/* DOC */}
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Hari Panen (DOC)
                    </label>
                    <input
                      type="number"
                      name="DOC"
                      value={formData.DOC}
                      onChange={handleChange}
                      placeholder="e.g. 14"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      required
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
                  {/* Populasi */}
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Populasi (Ekor)
                    </label>
                    <input
                      type="number"
                      name="populasi"
                      value={formData.populasi}
                      onChange={handleChange}
                      placeholder="1000"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      required
                      min="1"
                    />
                  </div>

                  {/* Bobot Awal */}
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Bobot Awal (gr/ekor)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="bobot_awal_per_ekor_gr"
                      value={formData.bobot_awal_per_ekor_gr}
                      onChange={handleChange}
                      placeholder="e.g. 5.5"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      required
                      min="0.1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
                  {/* Pakan Harian */}
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Pakan Harian (gr)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="pakan_harian_gr"
                      value={formData.pakan_harian_gr}
                      onChange={handleChange}
                      placeholder="e.g. 300"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      required
                      min="1"
                    />
                  </div>

                  {/* Panjang Periode */}
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Periode Pengukuran (Hari)
                    </label>
                    <input
                      type="number"
                      name="panjang_periode_hari"
                      value={formData.panjang_periode_hari}
                      onChange={handleChange}
                      placeholder="7"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      required
                      min="1"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  {/* Submit Button */}
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isPredicting}
                      className="w-full bg-[#085C85] hover:bg-[#064a6a] text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isPredicting ? (
                        <>
                          <i className="ph ph-spinner animate-spin"></i> Memproses...
                        </>
                      ) : (
                        <>
                          <span>Prediksi</span> <i className="ph ph-magic-wand"></i>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Area Grafik Historis */}
            {isLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border dark:border-gray-700 h-48 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#085C85]"></div>
              </div>
            ) : chartData.length > 0 ? (
              <div className="space-y-6">
                {/* Grafik ADG Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border dark:border-gray-700">
                  <h2 className="text-lg font-bold dark:text-white mb-6 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div> Grafik History ADG
                  </h2>
                  <div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={[0, 6]}
                          ticks={[0, 2, 4, 6]}
                          tick={{ fontSize: 12, fill: '#9ca3af' }}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: 'ADG (gr)', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="adg"
                          name="ADG"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ fill: "#3b82f6", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Grafik FCR Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border dark:border-gray-700">
                  <h2 className="text-lg font-bold dark:text-white mb-6 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div> Grafik History FCR
                  </h2>
                  <div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={[0, 3]}
                          ticks={[0, 1, 2, 4, 6]}
                          tick={{ fontSize: 12, fill: '#9ca3af' }}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: 'FCR', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="fcr"
                          name="FCR"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={{ fill: "#f59e0b", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border dark:border-gray-700 h-48 md:h-64 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <i className="ph ph-chart-bar text-4xl mb-2 opacity-50"></i>
                <p>Belum ada data history yang tersedia.</p>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Hasil Perhitungan */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border dark:border-gray-700 transition-colors duration-300">
              <h2 className="text-lg font-bold mb-4 dark:text-white">Hasil Prediksi</h2>

              {results ? (
                <div className="space-y-6">
                  {/* KPI Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* FCR Card */}
                    <div className={`p-4 h-full rounded-xl shadow-md flex flex-col items-center justify-center relative overflow-hidden ${getFCRStatusStyle(results.metrics?.status_efisiensi).cardBg}`}>
                      <div className="absolute inset-0 bg-white/10 z-0"></div>
                      <div className="relative z-10 text-center flex flex-col items-center justify-center h-full">
                        <p className={`text-sm font-medium mb-1 ${getFCRStatusStyle(results.metrics?.status_efisiensi).textColor} opacity-90`}>FCR</p>
                        <p className={`text-5xl font-extrabold mb-2 drop-shadow-md ${getFCRStatusStyle(results.metrics?.status_efisiensi).textColor}`}>{results.metrics?.FCR?.toFixed(2) || 'N/A'}</p>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold bg-black/20 backdrop-blur-sm border border-black/10 shadow-sm mt-auto ${getFCRStatusStyle(results.metrics?.status_efisiensi).textColor}`}>
                          {results.metrics?.status_efisiensi || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* ADG Card */}
                    <div className="p-4 h-full rounded-xl shadow-md flex flex-col items-center justify-center relative overflow-hidden bg-[#085C85]">
                      <div className="absolute inset-0 bg-white/5 z-0"></div>
                      <div className="relative z-10 text-center flex flex-col items-center justify-center h-full">
                        <p className="text-sm font-medium text-blue-100 mb-1 opacity-90">ADG</p>
                        <div className="flex items-baseline justify-center gap-1 mb-2">
                          <p className="text-5xl font-extrabold text-white drop-shadow-md">{results.metrics?.ADG_gr_per_ekor_hari?.toFixed(2) || 'N/A'}</p>
                          <span className="text-sm font-medium text-blue-100">gr/hari</span>
                        </div>
                        {/* Invisible spacer to match the FCR badge height and maintain perfect symmetry */}
                        <div className="h-7 w-full mt-auto"></div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-[#f0f9ff] dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                        <i className="ph ph-lightbulb"></i> Rekomendasi AI
                      </h3>
                      <button
                        onClick={() => setIsDetailModalOpen(true)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/40 hover:bg-blue-200 dark:hover:bg-blue-700/60 px-2 py-1 rounded transition-colors flex items-center gap-1 shadow-sm border border-blue-200/50 dark:border-blue-700/50"
                      >
                        <i className="ph ph-list-magnifying-glass"></i> Detail Prediksi
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-blue-200/50 dark:border-blue-800/50">
                        <span className="text-sm text-blue-700 dark:text-blue-400">Pakan Berikutnya</span>
                        <span className="font-bold text-blue-900 dark:text-blue-200">
                          {results.recommendations?.pakan_harian_next_gr?.toLocaleString('id-ID') || 0} gr/hari
                        </span>
                      </div>
                      <div>
                        <span className="block text-sm text-blue-700 dark:text-blue-400 mb-1">Aksi:</span>
                        <p className="text-sm text-blue-900 dark:text-blue-200 font-medium bg-white dark:bg-gray-800 p-2 rounded border border-blue-100 dark:border-gray-700">
                          {results.recommendations?.aksi || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  <div className="text-gray-400 dark:text-gray-500 mb-2">
                    <i className="ph ph-robot text-4xl"></i>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Masukkan data di form untuk melihat hasil prediksi dan rekomendasi AI</p>
                </div>
              )}
            </div>

            {/* Tabel Riwayat */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-md border dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold dark:text-white">Riwayat Terakhir</h2>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={history.length === 0}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${history.length > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 shadow-sm'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                    }`}
                >
                  <i className="ph ph-download-simple text-lg"></i>
                  <span className="hidden sm:inline">Ekspor Excel</span>
                  <span className="sm:hidden">Excel</span>
                </button>
              </div>

              {isLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#085C85]"></div>
                </div>
              ) : history.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                          <th className="py-2 px-2 whitespace-nowrap">DOC</th>
                          <th className="py-2 px-2">ADG</th>
                          <th className="py-2 px-2">FCR</th>
                          <th className="py-2 px-2">Status</th>
                          <th className="py-2 px-2 whitespace-nowrap">Pakan (Net)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedHistory.map((item, index) => {
                          const m = item.metrics
                          const r = item.recommendations
                          const statusStyle = getFCRStatusStyle(m.status_efisiensi)

                          return (
                            <tr key={item.id || index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="py-3 px-2 dark:text-gray-300">
                                <div className="flex flex-col">
                                  <span className="font-semibold">{item.input.DOC}</span>
                                  <span className="text-[10px] text-gray-400">Siklus {item.input.siklus}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2 dark:text-gray-300">{m.ADG_gr_per_ekor_hari?.toFixed(2)}</td>
                              <td className="py-3 px-2 font-bold dark:text-white">{m.FCR?.toFixed(2)}</td>
                              <td className="py-3 px-2">
                                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusStyle.color} ${statusStyle.textColor} shadow-sm inline-block`}>
                                  {m.status_efisiensi}
                                </span>
                              </td>
                              <td className="py-3 px-2 dark:text-gray-300">
                                <div className="flex flex-col">
                                  <span>{r.pakan_harian_next_gr?.toLocaleString('id-ID')}g</span>
                                  <span className="text-[10px] text-gray-400">({r.rasio_pakan_next_persen}%)</span>
                                </div>
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
                          className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${currentPage === page
                            ? "bg-[#085C85] text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                        >
                          {page}
                        </button>
                      ))}
                      {totalPages > 4 && (
                        <span className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500">...</span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-center p-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Belum ada data. Silakan lakukan prediksi pertama Anda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Prediksi Modal */}
      {isDetailModalOpen && results && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                <i className="ph ph-list-magnifying-glass text-[#085C85] dark:text-[#4A9CC7]"></i>
                Rincian Analisis Prediksi AI
              </h2>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
              >
                <i className="ph ph-x text-lg"></i>
              </button>
            </div>
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">

              {/* Section 1: Metrics */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                  <i className="ph ph-chart-line-up text-lg"></i>
                  1. Metrics Kesehatan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ADG (gr/ekor/hari)</span>
                    <strong className="text-lg text-gray-900 dark:text-white">{results.metrics?.ADG_gr_per_ekor_hari?.toFixed(2) || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1">FCR Total</span>
                    <strong className="text-lg text-gray-900 dark:text-white">{results.metrics?.FCR?.toFixed(2) || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Status Efisiensi</span>
                    <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold ${getFCRStatusStyle(results.metrics?.status_efisiensi).color} ${getFCRStatusStyle(results.metrics?.status_efisiensi).textColor}`}>
                      {results.metrics?.status_efisiensi || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Predictions */}
              <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-5 border border-blue-100 dark:border-blue-800/30">
                <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-4 border-b border-blue-200 dark:border-blue-800/50 pb-2 flex items-center gap-2">
                  <i className="ph ph-scales text-lg"></i>
                  2. Proyeksi Pertumbuhan (Predictions)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="block text-xs text-blue-600 dark:text-blue-400 mb-1">Biomassa Awal (Kg)</span>
                    <strong className="text-lg text-blue-900 dark:text-blue-100">{results.predictions?.biomassa_awal_kg?.toFixed(2) || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="block text-xs text-blue-600 dark:text-blue-400 mb-1">Bobot Plus (gr/ekor)</span>
                    <strong className="text-lg text-emerald-600 dark:text-emerald-400">+{results.predictions?.delta_bobot_per_ekor_gr?.toFixed(2) || '0.00'}</strong>
                  </div>
                  <div>
                    <span className="block text-xs text-blue-600 dark:text-blue-400 mb-1">Bobot Akhir (gr/ekor)</span>
                    <strong className="text-lg text-blue-900 dark:text-blue-100">{results.predictions?.bobot_akhir_per_ekor_gr?.toFixed(2) || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="block text-xs text-blue-600 dark:text-blue-400 mb-1">Biomassa Akhir (Kg)</span>
                    <strong className="text-lg text-[#085C85] dark:text-[#4A9CC7]">{results.predictions?.biomassa_akhir_kg?.toFixed(2) || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Section 3: Recommendations */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-5 border border-emerald-100 dark:border-emerald-800/30">
                <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-4 border-b border-emerald-200 dark:border-emerald-800/50 pb-2 flex items-center gap-2">
                  <i className="ph ph-brain text-lg"></i>
                  3. Rekomendasi Pakan AI
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <span className="block text-xs text-emerald-600 dark:text-emerald-400 mb-1">Pakan Harian (Berikutnya)</span>
                      <strong className="text-2xl text-emerald-700 dark:text-emerald-200">{results.recommendations?.pakan_harian_next_gr?.toLocaleString('id-ID') || 0} <span className="text-sm font-medium">gr</span></strong>
                    </div>
                    <div>
                      <span className="block text-xs text-emerald-600 dark:text-emerald-400 mb-1">Rasio Pakan AI</span>
                      <strong className="text-lg text-emerald-700 dark:text-emerald-200">{results.recommendations?.rasio_pakan_next_persen || 0}% <span className="text-sm font-medium">dari Biomassa</span></strong>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="block text-xs text-emerald-600 dark:text-emerald-400 mb-1">Catatan Rasio:</span>
                      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-50 bg-white/50 dark:bg-emerald-900/30 p-2.5 rounded-lg border border-emerald-100/50 dark:border-emerald-800/30">{results.recommendations?.catatan_rasio || 'Tidak ada catatan'}</p>
                    </div>
                    <div>
                      <span className="block text-xs text-emerald-600 dark:text-emerald-400 mb-1">Panduan Aksi:</span>
                      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-50 bg-white/50 dark:bg-emerald-900/30 p-2.5 rounded-lg border border-emerald-100/50 dark:border-emerald-800/30">{results.recommendations?.aksi || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 bg-[#085C85] hover:bg-[#064a6a] text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                Tutup Detail
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Info Modal */}
      {
        isInfoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">

              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                  <i className="ph ph-book-open-text text-[#085C85] dark:text-[#4A9CC7]"></i>
                  Panduan Sistem & Kamus Istilah
                </h2>
                <button
                  onClick={() => setIsInfoModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
                >
                  <i className="ph ph-x text-lg"></i>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar">

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-[#085C85] dark:text-[#4A9CC7] mb-3 flex items-center gap-2">
                    <i className="ph ph-robot"></i> Tentang Sistem AI
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-gray-700 dark:text-gray-300 text-sm leading-relaxed border border-blue-100 dark:border-blue-800/30">
                    <p>Sistem <strong>Prediksi FCR SMIKOLE</strong> menggunakan algoritma Machine Learning (<i>Random Forest</i>) untuk memprediksi pertumbuhan lele berdasarkan rekam jejak budidaya sebelumnya.</p>
                    <p className="mt-2">Tujuannya adalah untuk mendeteksi seawal mungkin jika konversi pakan (FCR) tidak efisien, menghindari pemborosan pangan (Tidak Efisien), dan memaksimalkan kecepatan pertumbuhan.</p>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-[#085C85] dark:text-[#4A9CC7] mb-3 flex items-center gap-2">
                    <i className="ph ph-translate"></i> Kamus Istilah Budidaya
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                      <i className="ph ph-calendar-check text-[#085C85] dark:text-[#4A9CC7] text-lg shrink-0 mt-0.5"></i>
                      <div>
                        <strong className="text-gray-900 dark:text-white block mb-0.5">DOC (Day of Culture)</strong>
                        Hari/umur budidaya yang dihitung sejak benih ditebar ke dalam kolam pembesaran.
                      </div>
                    </li>
                    <li className="flex gap-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                      <i className="ph ph-trend-up text-[#085C85] dark:text-[#4A9CC7] text-lg shrink-0 mt-0.5"></i>
                      <div>
                        <strong className="text-gray-900 dark:text-white block mb-0.5">ADG (Average Daily Growth)</strong>
                        Tren Pertumbuhan Harian. Menunjukkan rata-rata penambahan berat (gram) untuk 1 ekor lele setiap harinya. Semakin tinggi = semakin cepat panen.
                      </div>
                    </li>
                    <li className="flex gap-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                      <i className="ph ph-scales text-[#085C85] dark:text-[#4A9CC7] text-lg shrink-0 mt-0.5"></i>
                      <div>
                        <strong className="text-gray-900 dark:text-white block mb-0.5">FCR (Feed Conversion Ratio)</strong>
                        Rasio Konversi Pakan. Menunjukkan berapa kilogram pakan yang harus dihabiskan untuk menghasilkan 1 kilogram daging. Angka &lt; 1.0 = Sangat menguntungkan.
                      </div>
                    </li>
                    <li className="flex gap-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                      <i className="ph ph-arrows-clockwise text-[#085C85] dark:text-[#4A9CC7] text-lg shrink-0 mt-0.5"></i>
                      <div>
                        <strong className="text-gray-900 dark:text-white block mb-0.5">Siklus Budidaya</strong>
                        Satu gelombang panen penuh dari tebar benih hingga memanen ikan. Contoh: Kolam A Siklus 1.
                      </div>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#085C85] dark:text-[#4A9CC7] mb-3 flex items-center gap-2">
                    <i className="ph ph-clipboard-text"></i> Penjelasan Data
                  </h3>

                  <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <div className="pl-4 border-l-2 border-[#085C85] dark:border-[#4A9CC7]">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">1. Input Pembudidaya</h4>
                      <p className="text-xs">Data dasar seperti DOC, estimasi populasi ikan yang hidup, rata-rata bobot sampling, total pakan yang diberikan, dan periode pengukuran.</p>
                    </div>

                    <div className="pl-4 border-l-2 border-green-500">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">2. Metrics (Hasil Kalkulasi)</h4>
                      <p className="text-xs">Program akan menghitung ADG dan FCR historis selama periode yang Anda input untuk menentukan "Status Efisiensi".</p>
                    </div>

                    <div className="pl-4 border-l-2 border-orange-500">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">3. Rekomendasi (Prediksi AI)</h4>
                      <p className="text-xs">Model Random Forest memprediksi berapa banyak pakan yang sebaiknya Anda berikan di periode/minggu berikutnya agar FCR tetap efisien berdasarkan aturan baku dan tren pertumbuhannya.</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end">
                <button
                  onClick={() => setIsInfoModalOpen(false)}
                  className="px-5 py-2 bg-[#085C85] hover:bg-[#064a6a] text-white font-medium rounded-lg transition-colors"
                >
                  Tutup Panduan
                </button>
              </div>

            </div>
          </div>
        )
      }
    </MainLayout >
  )
}
