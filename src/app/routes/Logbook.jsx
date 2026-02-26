import { useState, useEffect } from "react"
import MainLayout from "../layout/MainLayout"
import LogbookCard from "../../components/cards/LogbookCard"
import AddLogbookCard from "../../components/cards/AddLogbookCard"
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
        {/* Header */}
        <h1 className="text-2xl font-bold mb-6 dark:text-white">Logbook</h1>

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
