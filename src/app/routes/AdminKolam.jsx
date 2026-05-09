import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faTrash, faWater, faPenToSquare, faTimes, faUsers, faChartLine, faFileExport, faFilePdf, faDatabase, faExclamationTriangle, faSpinner } from "@fortawesome/free-solid-svg-icons"
import { collection, onSnapshot, deleteDoc, doc, setDoc, updateDoc, getDocs, query, where } from "firebase/firestore"
import { db } from "../../services/firebase"
import MainLayout from "../layout/MainLayout"
import { fetchAllRealtimeData, fetchAllAiData, fetchAllFcrData, flushAllPondData } from "../../services/pondDataService"
import { generatePDFReport } from "../../utils/reportGenerator"
import * as XLSX from "xlsx"

export default function AdminKolam() {
  const [ponds, setPonds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newPond, setNewPond] = useState({ id: "", name: "" })
  const [editingPond, setEditingPond] = useState(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [allUsers, setAllUsers] = useState([])

  // Data management states
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isFlushing, setIsFlushing] = useState(false)
  const [dataProgress, setDataProgress] = useState("")
  const [exportMonth, setExportMonth] = useState("all")
  const [showFlushConfirm, setShowFlushConfirm] = useState(false)
  const [flushConfirmText, setFlushConfirmText] = useState("")

  // Subscribe to all ponds
  useEffect(() => {
    setIsLoading(true)
    const unsubscribe = onSnapshot(collection(db, "ponds"), (snapshot) => {
      const pondsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setPonds(pondsData)
      setIsLoading(false)
    }, (error) => {
      console.error("Error fetching ponds:", error)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Fetch all pembudidaya users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "pembudidaya"))
        const snapshot = await getDocs(q)
        const users = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }))
        setAllUsers(users)
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }
    fetchUsers()
  }, [])

  const handleAddPond = async (e) => {
    e.preventDefault()
    if (!newPond.id || !newPond.name) {
      alert("ID Kolam dan Nama Kolam harus diisi")
      return
    }

    try {
      setIsAdding(true)
      await setDoc(doc(db, "ponds", newPond.id), {
        name: newPond.name,
        createdAt: new Date().toISOString(),
        sensors: [],
        actuators: [],
        fcr: [],
        assignedUsers: []
      })
      setNewPond({ id: "", name: "" })
    } catch (error) {
      console.error("Error adding pond:", error)
      alert("Gagal menambahkan kolam: " + error.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeletePond = async (id) => {
    if (!window.confirm(`Yakin ingin menghapus kolam dengan ID: ${id}?\nSemua data histori di dalamnya tidak akan terhapus secara otomatis, hanya referensi kolamnya saja yang hilang dari daftar.`)) {
      return
    }

    try {
      await deleteDoc(doc(db, "ponds", id))
    } catch (error) {
      console.error("Error deleting pond:", error)
      alert("Gagal menghapus kolam: " + error.message)
    }
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingPond) return

    try {
      setIsSavingEdit(true)
      const pondRef = doc(db, "ponds", editingPond.id)
      await updateDoc(pondRef, {
        name: editingPond.name,
        sensors: editingPond.sensors || [],
        actuators: editingPond.actuators || [],
        fcr: editingPond.fcr || [],
        assignedUsers: editingPond.assignedUsers || []
      })
      setEditingPond(null)
    } catch (error) {
      console.error("Error updating pond config:", error)
      alert("Gagal menyimpan konfigurasi: " + error.message)
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Default threshold values per sensor type
  const THRESHOLD_DEFAULTS = {
    temperature: { amanMin: 25, amanMax: 30, waspMin: 23, waspMax: 32 },
    ph: { amanMin: 7.0, amanMax: 8.5, waspMin: 6.5, waspMax: 9.0 },
    do: { amanMin: 3.0, amanMax: 999, waspMin: 2.0, waspMax: 999 },
    generic: { amanMin: "", amanMax: "", waspMin: "", waspMax: "" }
  }

  const handleAddSensor = () => {
    const defaults = THRESHOLD_DEFAULTS["generic"]
    setEditingPond(prev => ({
      ...prev,
      sensors: [...(prev.sensors || []), { key: "", label: "", unit: "", type: "generic", ...defaults }]
    }))
  }

  const handleRemoveSensor = (index) => {
    setEditingPond(prev => ({
      ...prev,
      sensors: prev.sensors.filter((_, i) => i !== index)
    }))
  }

  const handleSensorChange = (index, field, value) => {
    setEditingPond(prev => {
      const newSensors = [...(prev.sensors || [])]
      newSensors[index] = { ...newSensors[index], [field]: value }
      
      // When type changes, auto-fill thresholds with defaults (only if current values are empty or match old defaults)
      if (field === 'type' && THRESHOLD_DEFAULTS[value]) {
        const defaults = THRESHOLD_DEFAULTS[value]
        const oldType = prev.sensors[index]?.type
        const oldDefaults = THRESHOLD_DEFAULTS[oldType] || {}
        
        // Only auto-fill if the current values match the old defaults (i.e., user hasn't manually changed them)
        Object.keys(defaults).forEach(key => {
          const currentVal = newSensors[index][key]
          if (currentVal === "" || currentVal === undefined || currentVal === oldDefaults[key]) {
            newSensors[index][key] = defaults[key]
          }
        })
      }
      
      return { ...prev, sensors: newSensors }
    })
  }

  const handleAddActuator = () => {
    setEditingPond(prev => ({
      ...prev,
      actuators: [...(prev.actuators || []), { key: "", label: "", type: "heater" }]
    }))
  }

  const handleRemoveActuator = (index) => {
    setEditingPond(prev => ({
      ...prev,
      actuators: prev.actuators.filter((_, i) => i !== index)
    }))
  }

  const handleActuatorChange = (index, field, value) => {
    setEditingPond(prev => {
      const newActuators = [...(prev.actuators || [])]
      newActuators[index] = { ...newActuators[index], [field]: value }
      return { ...prev, actuators: newActuators }
    })
  }

  // FCR handlers
  const handleAddFCR = () => {
    setEditingPond(prev => ({
      ...prev,
      fcr: [...(prev.fcr || []), { key: "", label: "" }]
    }))
  }

  const handleRemoveFCR = (index) => {
    setEditingPond(prev => ({
      ...prev,
      fcr: prev.fcr.filter((_, i) => i !== index)
    }))
  }

  const handleFCRChange = (index, field, value) => {
    setEditingPond(prev => {
      const newFCR = [...(prev.fcr || [])]
      newFCR[index] = { ...newFCR[index], [field]: value }
      return { ...prev, fcr: newFCR }
    })
  }

  const handleToggleUser = (uid) => {
    setEditingPond(prev => {
      const current = prev.assignedUsers || []
      const isAssigned = current.includes(uid)
      return {
        ...prev,
        assignedUsers: isAssigned
          ? current.filter(id => id !== uid)
          : [...current, uid]
      }
    })
  }

  // ─── Data Management Helpers ───

  /**
   * Generate month options from data for the dropdown filter
   */
  const getMonthOptions = (data) => {
    const months = new Set()
    data.forEach(r => {
      if (r._date && !isNaN(r._date)) {
        const key = `${r._date.getFullYear()}-${String(r._date.getMonth() + 1).padStart(2, '0')}`
        months.add(key)
      }
    })
    return Array.from(months).sort().reverse()
  }

  /**
   * Filter data by month key ("2026-05") or return all if "all"
   */
  const filterByMonth = (data, monthKey) => {
    if (monthKey === "all") return data
    const [year, month] = monthKey.split("-").map(Number)
    return data.filter(r => {
      if (!r._date || isNaN(r._date)) return false
      return r._date.getFullYear() === year && r._date.getMonth() + 1 === month
    })
  }

  /**
   * Format month key to readable label
   */
  const formatMonthLabel = (key) => {
    if (key === "all") return "Semua Data"
    const [year, month] = key.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  }

  /**
   * Handle Excel Export
   */
  const handleExportExcel = async () => {
    if (!editingPond) return
    setIsExporting(true)
    setDataProgress("Mengambil data realtime...")

    try {
      const [realtimeData, aiData, fcrData] = await Promise.all([
        fetchAllRealtimeData(editingPond.id),
        fetchAllAiData(editingPond.id),
        fetchAllFcrData(editingPond.id),
      ])

      const filteredRealtime = filterByMonth(realtimeData, exportMonth)
      const filteredAi = filterByMonth(aiData, exportMonth)
      const filteredFcr = filterByMonth(fcrData, exportMonth)

      setDataProgress(`Membuat file Excel (${filteredRealtime.length} realtime, ${filteredAi.length} AI, ${filteredFcr.length} FCR)...`)

      const wb = XLSX.utils.book_new()

      // Sheet 1: Realtime Data
      if (filteredRealtime.length > 0) {
        const rtRows = filteredRealtime.map(r => {
          const row = { Timestamp: r._date?.toISOString() || "-" }
          Object.keys(r).forEach(k => {
            if (["id", "_date", "timestamp", "userId", "kolamId"].includes(k)) return
            if (k.startsWith("status_")) return
            row[k] = r[k]
          })
          return row
        })
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rtRows), "Realtime")
      }

      // Sheet 2: AI Predictions
      if (filteredAi.length > 0) {
        const aiRows = filteredAi.map(r => ({
          Timestamp: r._date?.toISOString() || "-",
          Risk_Status: r.risk_status || "-",
          Predicted_Temperature: r.predicted_temperature_30min ?? "-",
          Predicted_pH: r.predicted_ph_30min ?? "-",
          Predicted_DO: r.predicted_do_30min ?? "-",
          Heater_Status: r.heater_status || "-",
          Temperature_Status: r.temperature_status || "-",
          Recommendations: Array.isArray(r.recommendations) ? r.recommendations.map(rec => typeof rec === 'string' ? rec : (rec?.detail || rec?.message || JSON.stringify(rec))).join("; ") : "-",
        }))
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(aiRows), "AI Predictions")
      }

      // Sheet 3: FCR Records
      if (filteredFcr.length > 0) {
        const fcrRows = filteredFcr.map(r => {
          const input = r.input || {}
          const metrics = r.metrics || {}
          const predictions = r.predictions || {}
          return {
            Timestamp: r._date?.toISOString() || "-",
            Siklus: input.siklus ?? "-",
            DOC: input.DOC ?? "-",
            Populasi: input.populasi ?? "-",
            Bobot_Awal: input.bobot_awal_per_ekor_gr ?? "-",
            Pakan_Harian: input.pakan_harian_gr ?? "-",
            Periode_Hari: input.panjang_periode_hari ?? "-",
            Predicted_FCR: predictions.predicted_FCR ?? "-",
            Predicted_ADG: predictions.predicted_ADG ?? "-",
            Efisiensi: metrics.efisiensi_status ?? "-",
            Survival_Rate: metrics.survival_rate ?? "-",
            Recommendations: Array.isArray(r.recommendations) ? r.recommendations.map(rec => typeof rec === 'string' ? rec : (rec?.detail || rec?.message || JSON.stringify(rec))).join("; ") : "-",
          }
        })
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fcrRows), "FCR")
      }

      const periodStr = formatMonthLabel(exportMonth).replace(/\s+/g, "_")
      XLSX.writeFile(wb, `SMIKOLE_${editingPond.id}_${periodStr}_${Date.now()}.xlsx`)
      setDataProgress("✅ File Excel berhasil diunduh!")
      setTimeout(() => setDataProgress(""), 3000)
    } catch (error) {
      console.error("Export error:", error)
      setDataProgress("❌ Gagal mengekspor: " + error.message)
    } finally {
      setIsExporting(false)
    }
  }

  /**
   * Handle PDF Report Download
   */
  const handleDownloadPdf = async () => {
    if (!editingPond) return
    setIsGeneratingPdf(true)
    setDataProgress("Mengambil semua data untuk laporan PDF...")

    try {
      const [realtimeData, aiData, fcrData] = await Promise.all([
        fetchAllRealtimeData(editingPond.id),
        fetchAllAiData(editingPond.id),
        fetchAllFcrData(editingPond.id),
      ])

      const filteredRealtime = filterByMonth(realtimeData, exportMonth)
      const filteredAi = filterByMonth(aiData, exportMonth)
      const filteredFcr = filterByMonth(fcrData, exportMonth)

      setDataProgress(`Membuat PDF report (${filteredRealtime.length} record)...`)

      generatePDFReport({
        pondId: editingPond.id,
        pondName: editingPond.name,
        sensors: editingPond.sensors || [],
        realtimeData: filteredRealtime,
        aiData: filteredAi,
        fcrData: filteredFcr,
        periodLabel: formatMonthLabel(exportMonth),
      })

      setDataProgress("✅ PDF report berhasil diunduh!")
      setTimeout(() => setDataProgress(""), 3000)
    } catch (error) {
      console.error("PDF error:", error)
      setDataProgress("❌ Gagal membuat PDF: " + error.message)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  /**
   * Handle Flush All Data
   */
  const handleFlushData = async () => {
    if (!editingPond) return
    if (flushConfirmText !== editingPond.name) {
      alert("Nama kolam tidak cocok. Flush dibatalkan.")
      return
    }

    setIsFlushing(true)
    setShowFlushConfirm(false)
    setFlushConfirmText("")

    try {
      const result = await flushAllPondData(editingPond.id, (msg) => {
        setDataProgress(msg)
      })
      setDataProgress(`✅ Flush selesai — ${result.realtime} realtime, ${result.ai} AI, ${result.fcr} FCR record terhapus.`)
    } catch (error) {
      console.error("Flush error:", error)
      setDataProgress("❌ Gagal flush data: " + error.message)
    } finally {
      setIsFlushing(false)
    }
  }

  return (
    <MainLayout>
      <div className="pb-20 md:pb-0 relative">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold dark:text-white">Manajemen Kolam (Admin)</h1>
        </div>

        {/* Add New Pond Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border dark:border-gray-700 mb-8">
          <h2 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} className="text-[#085C85] dark:text-[#4A9CC7]"/>
            Tambah Kolam Baru
          </h2>
          
          <form onSubmit={handleAddPond} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ID Kolam (cth: kolam3) *
              </label>
              <input
                type="text"
                value={newPond.id}
                onChange={e => setNewPond({...newPond, id: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')})}
                placeholder="kolam3"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#085C85] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Harus sama dengan ID yang dikirim IoT</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nama Kolam (Display) *
              </label>
              <input
                type="text"
                value={newPond.name}
                onChange={e => setNewPond({...newPond, name: e.target.value})}
                placeholder="Kolam Induk"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#085C85] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-transparent mb-1 select-none" aria-hidden="true">
                &nbsp;
              </label>
              <button
                type="submit"
                disabled={isAdding}
                className="w-full bg-[#085C85] text-white font-semibold py-2 px-4 rounded-lg hover:bg-[#064a6a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>Tambah Kolam</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Ponds List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border dark:border-gray-700 relative z-0">
          <h2 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
            <FontAwesomeIcon icon={faWater} className="text-[#085C85] dark:text-[#4A9CC7]"/>
            Daftar Kolam Aktif
          </h2>
          
          {isLoading ? (
             <div className="flex justify-center items-center py-8">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#085C85]"></div>
             </div>
          ) : ponds.length === 0 ? (
            <div className="text-center text-gray-500 py-8 border-2 border-dashed rounded-xl dark:border-gray-700">
              Belum ada data kolam.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ponds.map(pond => (
                <div key={pond.id} className="flex flex-col gap-3 justify-between bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600 hover:border-[#085C85] dark:hover:border-[#4A9CC7] transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-white text-lg">{pond.name || "Unnamed Pond"}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">ID: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">{pond.id}</code></p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingPond(JSON.parse(JSON.stringify(pond)))}
                        className="p-2 text-[#085C85] dark:text-[#4A9CC7] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit Kolam"
                      >
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </button>
                      <button
                        onClick={() => handleDeletePond(pond.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Hapus Kolam"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Summary Badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-1 rounded-md font-medium">
                      {(pond.sensors || []).length} Sensor
                    </span>
                    <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 px-2 py-1 rounded-md font-medium">
                      {(pond.actuators || []).length} Aktuator
                    </span>
                    <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-1 rounded-md font-medium">
                      <FontAwesomeIcon icon={faChartLine} className="mr-1" />
                      {(pond.fcr || []).length} FCR
                    </span>
                    <span className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-2 py-1 rounded-md font-medium">
                      <FontAwesomeIcon icon={faUsers} className="mr-1" />
                      {(pond.assignedUsers || []).length} Pembudidaya
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editing Modal Override */}
        {editingPond && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl shadow-xl relative my-auto">
              <button 
                onClick={() => setEditingPond(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <FontAwesomeIcon icon={faTimes} className="text-xl" />
              </button>
              
              <h2 className="text-xl font-bold mb-6 dark:text-white">Edit Konfigurasi Kolam: {editingPond.id}</h2>
              
              <form onSubmit={handleSaveEdit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nama Kolam (Display)
                  </label>
                  <input
                    type="text"
                    value={editingPond.name}
                    onChange={e => setEditingPond({...editingPond, name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#085C85] outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>

                <hr className="dark:border-gray-700" />
                
                {/* Sensors Config */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">Sensor List</h3>
                    <button type="button" onClick={handleAddSensor} className="text-sm bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-lg hover:bg-blue-100 font-medium transition-colors">
                      + Tambah Sensor
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {(!editingPond.sensors || editingPond.sensors.length === 0) && (
                      <p className="text-sm text-gray-500 italic">Belum ada sensor yang dikonfigurasi.</p>
                    )}
                    {(editingPond.sensors || []).map((sensor, idx) => (
                      <div key={idx} className="border dark:border-gray-600 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                        <div className="flex gap-2 items-start">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 grow">
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400 block">Key IoT</label>
                              <input type="text" value={sensor.key} onChange={e => handleSensorChange(idx, 'key', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder="suhu" className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400 block">Label</label>
                              <input type="text" value={sensor.label} onChange={e => handleSensorChange(idx, 'label', e.target.value)} placeholder="Suhu Air" className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400 block">Tipe</label>
                              <select value={sensor.type} onChange={e => handleSensorChange(idx, 'type', e.target.value)} className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="temperature">Suhu</option>
                                <option value="ph">pH</option>
                                <option value="do">Oksigen (DO)</option>
                                <option value="generic">Lainnya (Angka)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400 block">Satuan</label>
                              <input type="text" value={sensor.unit} onChange={e => handleSensorChange(idx, 'unit', e.target.value)} placeholder="°C" className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                          </div>
                          <button type="button" onClick={() => handleRemoveSensor(idx)} className="mt-5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded transition-colors">
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                        
                        {/* Threshold Parameters */}
                        <div className="mt-2 pt-2 border-t dark:border-gray-600">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Parameter Batas Nilai:</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400 block">Aman Min</label>
                              <input type="number" step="any" value={sensor.amanMin ?? ""} onChange={e => handleSensorChange(idx, 'amanMin', e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="-" className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400 block">Aman Max</label>
                              <input type="number" step="any" value={sensor.amanMax ?? ""} onChange={e => handleSensorChange(idx, 'amanMax', e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="-" className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400 block">Waspada Min</label>
                              <input type="number" step="any" value={sensor.waspMin ?? ""} onChange={e => handleSensorChange(idx, 'waspMin', e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="-" className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400 block">Waspada Max</label>
                              <input type="number" step="any" value={sensor.waspMax ?? ""} onChange={e => handleSensorChange(idx, 'waspMax', e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="-" className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                            </div>
                          </div>
                          {sensor.type === "generic" && (sensor.amanMin === "" || sensor.amanMin === undefined) && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">⚠ Isi parameter batas agar kartu sensor bisa berwarna di Dashboard.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <hr className="dark:border-gray-700" />
                
                {/* Actuators Config */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white">Aktuator List</h3>
                    <button type="button" onClick={handleAddActuator} className="text-sm bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-3 py-1 rounded-lg hover:bg-orange-100 font-medium transition-colors">
                      + Tambah Aktuator
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {(!editingPond.actuators || editingPond.actuators.length === 0) && (
                      <p className="text-sm text-gray-500 italic">Belum ada aktuator yang dikonfigurasi.</p>
                    )}
                    {(editingPond.actuators || []).map((actuator, idx) => (
                      <div key={idx} className="flex gap-2 items-start border dark:border-gray-600 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 grow">
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block">Key IoT</label>
                            <input type="text" value={actuator.key} onChange={e => handleActuatorChange(idx, 'key', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder="Aktuator" className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block">Label</label>
                            <input type="text" value={actuator.label} onChange={e => handleActuatorChange(idx, 'label', e.target.value)} placeholder="Water Heater" className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block">Tipe</label>
                            <select value={actuator.type} onChange={e => handleActuatorChange(idx, 'type', e.target.value)} className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                              <option value="heater">Heater</option>
                              <option value="pump">Pompa</option>
                              <option value="generic">Lainnya (Biner)</option>
                            </select>
                          </div>
                        </div>
                        <button type="button" onClick={() => handleRemoveActuator(idx)} className="mt-5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded transition-colors">
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <hr className="dark:border-gray-700" />

                {/* FCR Config */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <FontAwesomeIcon icon={faChartLine} className="text-amber-600" />
                      FCR List
                    </h3>
                    <button type="button" onClick={handleAddFCR} className="text-sm bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-lg hover:bg-amber-100 font-medium transition-colors">
                      + Tambah FCR
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {(!editingPond.fcr || editingPond.fcr.length === 0) && (
                      <p className="text-sm text-gray-500 italic">Belum ada FCR yang dikonfigurasi.</p>
                    )}
                    {(editingPond.fcr || []).map((fcr, idx) => (
                      <div key={idx} className="flex gap-2 items-start border dark:border-gray-600 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 grow">
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block">Key</label>
                            <input type="text" value={fcr.key} onChange={e => handleFCRChange(idx, 'key', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder="fcr" className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block">Label</label>
                            <input type="text" value={fcr.label} onChange={e => handleFCRChange(idx, 'label', e.target.value)} placeholder="FCR Kolam 1" className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                          </div>
                        </div>
                        <button type="button" onClick={() => handleRemoveFCR(idx)} className="mt-5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded transition-colors">
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <hr className="dark:border-gray-700" />

                {/* Assign Pembudidaya */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <FontAwesomeIcon icon={faUsers} className="text-green-600" />
                      Assign Pembudidaya
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {(editingPond.assignedUsers || []).length} dipilih
                    </span>
                  </div>
                  
                  {allUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Tidak ada akun pembudidaya yang ditemukan.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border dark:border-gray-600 rounded-lg p-3">
                      {allUsers.map(u => {
                        const isChecked = (editingPond.assignedUsers || []).includes(u.uid)
                        return (
                          <label
                            key={u.uid}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              isChecked 
                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleUser(u.uid)}
                              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium dark:text-white truncate">{u.nama || u.email || u.uid}</p>
                              <p className="text-xs text-gray-400 truncate">{u.email || u.uid}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                <hr className="dark:border-gray-700" />

                {/* Data Management Section */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <FontAwesomeIcon icon={faDatabase} className="text-purple-600" />
                      Data Management
                    </h3>
                  </div>

                  {/* Month Filter */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Periode Ekspor</label>
                    <select
                      value={exportMonth}
                      onChange={(e) => setExportMonth(e.target.value)}
                      className="w-full md:w-64 px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="all">📊 Semua Data (Keseluruhan)</option>
                      {/* Generate month options dynamically when user clicks export */}
                      {(() => {
                        // Pre-populate with common recent months
                        const options = []
                        const now = new Date()
                        for (let i = 0; i < 12; i++) {
                          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                          const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
                          options.push(<option key={key} value={key}>📅 {label}</option>)
                        }
                        return options
                      })()}
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    {/* Export Excel */}
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      disabled={isExporting || isGeneratingPdf || isFlushing}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExporting ? (
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      ) : (
                        <FontAwesomeIcon icon={faFileExport} />
                      )}
                      Ekspor Excel
                    </button>

                    {/* Download PDF */}
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isExporting || isGeneratingPdf || isFlushing}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingPdf ? (
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      ) : (
                        <FontAwesomeIcon icon={faFilePdf} />
                      )}
                      Download PDF Report
                    </button>

                    {/* Flush Data */}
                    <button
                      type="button"
                      onClick={() => setShowFlushConfirm(true)}
                      disabled={isExporting || isGeneratingPdf || isFlushing}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isFlushing ? (
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      ) : (
                        <FontAwesomeIcon icon={faTrash} />
                      )}
                      Flush Semua Data
                    </button>
                  </div>

                  {/* Flush Confirmation Dialog */}
                  {showFlushConfirm && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4 mb-3">
                      <div className="flex items-start gap-3">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-xl mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-red-700 dark:text-red-400 text-sm">⚠️ Peringatan: Tindakan ini tidak bisa dibatalkan!</p>
                          <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                            Semua data <strong>realtime</strong>, <strong>AI predictions</strong>, dan <strong>FCR</strong> untuk kolam ini akan dihapus secara permanen. Pastikan Anda sudah mengekspor data terlebih dahulu.
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-300 mt-2 font-medium">
                            Ketik <code className="bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded font-bold">{editingPond.name}</code> untuk konfirmasi:
                          </p>
                          <input
                            type="text"
                            value={flushConfirmText}
                            onChange={(e) => setFlushConfirmText(e.target.value)}
                            placeholder={`Ketik "${editingPond.name}" di sini...`}
                            className="w-full mt-2 px-3 py-2 text-sm border-2 border-red-300 dark:border-red-700 rounded-lg focus:ring-2 focus:ring-red-500 outline-none dark:bg-gray-800 dark:text-white"
                          />
                          <div className="flex gap-2 mt-3">
                            <button
                              type="button"
                              onClick={handleFlushData}
                              disabled={flushConfirmText !== editingPond.name}
                              className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                            >
                              Ya, Hapus Semua Data
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowFlushConfirm(false); setFlushConfirmText("") }}
                              className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Progress / Status Message */}
                  {dataProgress && (
                    <div className={`text-sm px-3 py-2 rounded-lg ${
                      dataProgress.startsWith("✅") 
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800" 
                        : dataProgress.startsWith("❌")
                          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
                          : "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                    }`}>
                      {!dataProgress.startsWith("✅") && !dataProgress.startsWith("❌") && (
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                      )}
                      {dataProgress}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="bg-[#085C85] text-white font-semibold py-2 px-8 rounded-lg hover:bg-[#064a6a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingEdit ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      "Simpan Konfigurasi"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
