import { useState, useEffect } from "react"
import MainLayout from "../layout/MainLayout"
import LogbookCard from "../../components/cards/LogbookCard"
import AddLogbookCard from "../../components/cards/AddLogbookCard"
import LogbookFormModal from "../../components/modals/LogbookFormModal"
import LogbookDetailModal from "../../components/modals/LogbookDetailModal"
import { getLogbooks, createLogbook, deleteLogbook } from "../../services/logbookService"

export default function Logbook() {
  const [logbooks, setLogbooks] = useState([])
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedLogbook, setSelectedLogbook] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch logbooks on mount
  useEffect(() => {
    fetchLogbooks()
  }, [])

  const fetchLogbooks = async () => {
    setIsLoading(true)
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
    try {
      await createLogbook(data)
      await fetchLogbooks() // Refresh list
      setIsFormModalOpen(false)
    } catch (error) {
      console.error("Error saving logbook:", error)
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
    try {
      await deleteLogbook(id)
      await fetchLogbooks() // Refresh list
      setIsDetailModalOpen(false)
      setSelectedLogbook(null)
    } catch (error) {
      console.error("Error deleting logbook:", error)
    }
  }

  return (
    <MainLayout>
      <div className="pb-20 md:pb-0">
        {/* Header */}
        <h1 className="text-2xl font-bold mb-6">Logbook</h1>

        {/* Loading State */}
        {isLoading ? (
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
        />

        {/* Detail Modal */}
        <LogbookDetailModal
          isOpen={isDetailModalOpen}
          logbook={selectedLogbook}
          onClose={handleCloseDetailModal}
          onDelete={handleDeleteLogbook}
        />
      </div>
    </MainLayout>
  )
}
