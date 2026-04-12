import { useState, useEffect, useMemo } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faCalendarDays, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons"
import MainLayout from "../layout/MainLayout"
import LogbookCard from "../../components/cards/LogbookCard"
import LogbookFormModal from "../../components/modals/LogbookFormModal"
import LogbookDetailModal from "../../components/modals/LogbookDetailModal"
import { subscribeToLogbooks, createLogbook, updateLogbook, deleteLogbook } from "../../services/logbookService"
import { useAuth } from "../../contexts/AuthContext"

const PAGE_SIZE = 10

export default function Logbook() {
  const { user } = useAuth()
  const [logbooks, setLogbooks] = useState([])
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedLogbook, setSelectedLogbook] = useState(null)
  const [editingLogbook, setEditingLogbook] = useState(null)
  const [selectedDateFilter, setSelectedDateFilter] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

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

  // Reset page ke 1 setiap kali filter tanggal berubah
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedDateFilter])

  // --- Filter logbooks berdasarkan tanggal yang dipilih ---
  const filteredLogbooks = useMemo(() => {
    if (!selectedDateFilter) return logbooks
    return logbooks.filter(lb => lb.filterDate === selectedDateFilter)
  }, [logbooks, selectedDateFilter])

  // --- Paginasi: potong 30 item per halaman ---
  const totalPages = Math.max(1, Math.ceil(filteredLogbooks.length / PAGE_SIZE))
  const paginatedLogbooks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredLogbooks.slice(start, start + PAGE_SIZE)
  }, [filteredLogbooks, currentPage])

  // --- Grouping berdasarkan bulan (hanya dari item di halaman ini) ---
  const groupedLogbooks = useMemo(() => {
    const groups = {}
    paginatedLogbooks.forEach(logbook => {
      const month = logbook.monthYear || "Riwayat Lama"
      if (!groups[month]) groups[month] = []
      groups[month].push(logbook)
    })
    return groups
  }, [paginatedLogbooks])

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
      const { imageFiles, keepUrls, ...logbookData } = data
      if (editingLogbook) {
        await updateLogbook(editingLogbook.id, logbookData, user?.uid, imageFiles || [], keepUrls || [])
      } else {
        await createLogbook(logbookData, user?.uid, imageFiles || [])
      }
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
    setIsDetailModalOpen(false)
    setSelectedLogbook(null)
    setEditingLogbook(logbook)
    setIsFormModalOpen(true)
  }

  const handleDeleteLogbook = async (id, fotoUrls = []) => {
    setIsDeleting(true)
    try {
      await deleteLogbook(id, fotoUrls) // teruskan fotoUrls agar foto di Storage juga terhapus
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
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full sm:w-auto bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-0 cursor-pointer"
            />
            {selectedDateFilter && (
              <button
                onClick={() => setSelectedDateFilter("")}
                className="ml-3 text-red-500 hover:text-red-700 font-bold"
                title="Hapus filter tanggal"
              >
                ×
              </button>
            )}
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
        ) : filteredLogbooks.length === 0 ? (
          <div className="text-center text-gray-500 py-10 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <p>Tidak ada logbook pada tanggal ini.</p>
          </div>
        ) : (
          <>
            {/* Info halaman & total */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Menampilkan{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredLogbooks.length)}
                </span>{" "}
                dari <span className="font-semibold text-gray-700 dark:text-gray-200">{filteredLogbooks.length}</span> logbook
              </p>
              <span className="text-sm text-gray-400 dark:text-gray-500">
                Hal. {currentPage} / {totalPages}
              </span>
            </div>

            {/* Grouped Logbooks */}
            <div className="space-y-8">
              {Object.entries(groupedLogbooks).map(([month, items]) => (
                <div key={month}>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b dark:border-gray-700">
                    {month}
                    <span className="ml-2 text-sm font-normal text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                      {items.length} catatan
                    </span>
                  </h2>

                  <div className="flex flex-col gap-4">
                    {items.map((logbook) => (
                      <LogbookCard
                        key={logbook.id}
                        title={logbook.title}
                        date={logbook.date}
                        fotoUrls={logbook.fotoUrls}
                        onClick={() => handleCardClick(logbook)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 gap-2">
                <button
                  onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    currentPage === 1
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "bg-[#085C85] text-white hover:bg-[#064a6a]"
                  }`}
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                  Sebelumnya
                </button>

                {/* Page number pills */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                      className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                        page === currentPage
                          ? "bg-[#085C85] text-white shadow"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    currentPage === totalPages
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "bg-[#085C85] text-white hover:bg-[#064a6a]"
                  }`}
                >
                  Selanjutnya
                  <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                </button>
              </div>
            )}
          </>
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

