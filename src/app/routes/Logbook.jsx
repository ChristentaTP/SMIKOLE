import { useState, useEffect, useMemo } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faCalendarDays } from "@fortawesome/free-solid-svg-icons"
import MainLayout from "../layout/MainLayout"
import LogbookCard from "../../components/cards/LogbookCard"
import LogbookFormModal from "../../components/modals/LogbookFormModal"
import LogbookDetailModal from "../../components/modals/LogbookDetailModal"
import { subscribeToLogbooks, createLogbook, updateLogbook, deleteLogbook } from "../../services/logbookService"
import { useAuth } from "../../contexts/AuthContext"

export default function Logbook() {
  const { user } = useAuth()
  const [logbooks, setLogbooks] = useState([])
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedLogbook, setSelectedLogbook] = useState(null)
  const [editingLogbook, setEditingLogbook] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState("all") // "all" or specific monthYear
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Real-time subscription to logbooks
  useEffect(() => {
    if (!user?.uid) return
    setIsLoading(true)
    const unsubscribe = subscribeToLogbooks(user.uid, (data) => {
      setLogbooks(data)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [user?.uid])

  // Extract unique monthYears for the filter dropdown
  const uniqueMonths = useMemo(() => {
    const months = new Set()
    logbooks.forEach(logbook => {
      if (logbook.monthYear) months.add(logbook.monthYear)
    })
    return Array.from(months)
  }, [logbooks])

  // Group and filter logbooks by monthYear
  const groupedLogbooks = useMemo(() => {
    const groups = {}
    logbooks.forEach(logbook => {
      const month = logbook.monthYear || 'Riwayat Lama'
      
      // Apply filter
      if (selectedMonth !== "all" && month !== selectedMonth) return

      if (!groups[month]) {
        groups[month] = []
      }
      groups[month].push(logbook)
    })
    return groups
  }, [logbooks, selectedMonth])

  const handleAddClick = () => {
    setEditingLogbook(null)
    setIsFormModalOpen(true)
  }

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false)
    setEditingLogbook(null)
  }

  const handleSaveLogbook = async (data) => {
    setIsSaving(true)
    try {
      if (editingLogbook) {
        // Update existing logbook
        await updateLogbook(editingLogbook.id, data)
      } else {
        // Create new logbook
        await createLogbook(data, user?.uid)
      }
      // No manual re-fetch needed — onSnapshot auto-updates
      setIsFormModalOpen(false)
      setEditingLogbook(null)
    } catch (error) {
      console.error("Error saving logbook:", error)
      alert("Gagal menyimpan logbook: " + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCardClick = (logbook) => {
    setSelectedLogbook(logbook)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedLogbook(null)
  }

  const handleEditLogbook = (logbook) => {
    // Close detail modal and open form modal with logbook data
    setIsDetailModalOpen(false)
    setSelectedLogbook(null)
    setEditingLogbook(logbook)
    setIsFormModalOpen(true)
  }

  const handleDeleteLogbook = async (id) => {
    setIsDeleting(true)
    try {
      await deleteLogbook(id)
      // No manual re-fetch needed — onSnapshot auto-updates
      setIsDetailModalOpen(false)
      setSelectedLogbook(null)
    } catch (error) {
      console.error("Error deleting logbook:", error)
      alert("Gagal menghapus logbook: " + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <MainLayout>
      <div className="pb-20 md:pb-0">
        {/* Header with Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold dark:text-white">Logbook</h1>
          
          <div className="flex items-center w-full sm:w-auto bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-sm border dark:border-gray-700">
            <FontAwesomeIcon icon={faCalendarDays} className="text-gray-400 mr-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="all">Semua Waktu</option>
              {uniqueMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
              {uniqueMonths.length > 0 && !uniqueMonths.includes('Riwayat Lama') && logbooks.some(l => !l.monthYear) && (
                <option value="Riwayat Lama">Riwayat Lama</option>
              )}
            </select>
          </div>
        </div>

        {/* Action Button (Full Width) */}
        <button 
          onClick={handleAddClick}
          className="w-full bg-white dark:bg-gray-800 border-2 border-dashed border-[#085C85]/30 hover:border-[#085C85] dark:border-gray-600 dark:hover:border-[#4A9CC7] text-[#085C85] dark:text-[#4A9CC7] font-semibold py-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 mb-8 shadow-sm"
        >
          <FontAwesomeIcon icon={faPlus} />
          Tambah Logbook Baru
        </button>

        {/* Loading State */}
        {isLoading && logbooks.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#085C85]"></div>
          </div>
        ) : logbooks.length === 0 ? (
          <div className="text-center text-gray-500 py-10 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <p>Belum ada logbook yang ditambahkan.</p>
          </div>
        ) : (
          /* Grouped Logbooks */
          <div className="space-y-8">
            {Object.entries(groupedLogbooks).map(([month, items]) => (
              <div key={month}>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b dark:border-gray-700">
                  {month}
                  <span className="ml-2 text-sm font-normal text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {items.length} catatan
                  </span>
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {items.map((logbook) => (
                    <LogbookCard
                      key={logbook.id}
                      title={logbook.title}
                      date={logbook.date}
                      onClick={() => handleCardClick(logbook)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal */}
        <LogbookFormModal
          isOpen={isFormModalOpen}
          onClose={handleCloseFormModal}
          onSave={handleSaveLogbook}
          initialData={editingLogbook}
          isLoading={isSaving}
        />

        {/* Detail Modal */}
        <LogbookDetailModal
          isOpen={isDetailModalOpen}
          logbook={selectedLogbook}
          onClose={handleCloseDetailModal}
          onEdit={handleEditLogbook}
          onDelete={handleDeleteLogbook}
          isLoading={isDeleting}
        />
      </div>
    </MainLayout>
  )
}
