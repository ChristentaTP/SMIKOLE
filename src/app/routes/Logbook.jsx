import { useState, useEffect } from "react"
import MainLayout from "../layout/MainLayout"
import LogbookCard from "../../components/cards/LogbookCard"
import AddLogbookCard from "../../components/cards/AddLogbookCard"
import LogbookFormModal from "../../components/modals/LogbookFormModal"
import LogbookDetailModal from "../../components/modals/LogbookDetailModal"
// import { getLogbooks, createLogbook, deleteLogbook } from "../../services/logbookService"

// Mock Service (Backend Deleted)
const getLogbooks = async () => []
const createLogbook = async (data) => ({ id: Date.now(), ...data })
const deleteLogbook = async (id) => {}
import { useAuth } from "../../contexts/AuthContext"

export default function Logbook() {
  const { user } = useAuth()
  const [logbooks, setLogbooks] = useState([])
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedLogbook, setSelectedLogbook] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch logbooks on mount
  useEffect(() => {
    fetchLogbooks()
  }, [])

  const fetchLogbooks = async () => {
    // Only show global loading on first load
    if (logbooks.length === 0) setIsLoading(true)
    try {
      const data = await getLogbooks()
      setLogbooks(data)
    } catch (error) {
      console.error("Error fetching logbooks:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddClick = () => {
    setIsFormModalOpen(true)
  }

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false)
  }

  const handleSaveLogbook = async (data) => {
    setIsSaving(true)
    try {
      const newLog = await createLogbook(data, user?.uid)
      
      // Optimistic Update: Add to list immediately
      setLogbooks(prev => [newLog, ...prev])
      
      // Close modal immediately
      setIsFormModalOpen(false)
      
      // Refresh background to be sure
      fetchLogbooks() 
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

  const handleDeleteLogbook = async (id) => {
    setIsDeleting(true)
    try {
      await deleteLogbook(id)
      
      // Optimistic Update: Remove from list immediately
      setLogbooks(prev => prev.filter(log => log.id !== id))
      
      // Close modal immediately
      setIsDetailModalOpen(false)
      setSelectedLogbook(null)
      
      // Refresh background
      fetchLogbooks()
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
        {/* Header */}
        <h1 className="text-2xl font-bold mb-6">Logbook</h1>

        {/* Loading State */}
        {isLoading && logbooks.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#085C85]"></div>
          </div>
        ) : (
          /* Grid Cards */
          <div className="grid grid-cols-2 gap-4">
            {/* Logbook Cards */}
            {logbooks.map((logbook) => (
              <LogbookCard
                key={logbook.id}
                title={logbook.title}
                date={logbook.date}
                onClick={() => handleCardClick(logbook)}
              />
            ))}

            {/* Add Button Card */}
            <AddLogbookCard onClick={handleAddClick} />
          </div>
        )}

        {/* Form Modal */}
        <LogbookFormModal
          isOpen={isFormModalOpen}
          onClose={handleCloseFormModal}
          onSave={handleSaveLogbook}
          isLoading={isSaving}
        />

        {/* Detail Modal */}
        <LogbookDetailModal
          isOpen={isDetailModalOpen}
          logbook={selectedLogbook}
          onClose={handleCloseDetailModal}
          onDelete={handleDeleteLogbook}
          isLoading={isDeleting}
        />
      </div>
    </MainLayout>
  )
}
