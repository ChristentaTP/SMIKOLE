import { useState, useRef, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBold, faItalic, faUnderline, faImage, faTimes } from "@fortawesome/free-solid-svg-icons"

export default function LogbookFormModal({ isOpen, onClose, onSave, initialData = null, isLoading = false }) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false
  })
  const editorRef = useRef(null)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || "")
      setActiveFormats({ bold: false, italic: false, underline: false })
      // Reset editor content
      if (editorRef.current) {
        editorRef.current.innerHTML = initialData?.description || ""
      }
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Get HTML content from contentEditable div
    const description = editorRef.current?.innerHTML || ""
    
    onSave({
      title,
      description
    })
    
    // Reset form
    setTitle("")
    if (editorRef.current) {
      editorRef.current.innerHTML = ""
    }
  }

  // Apply text formatting using execCommand
  const applyFormat = (format) => {
    // Focus editor first
    editorRef.current?.focus()
    
    // Apply format using document.execCommand
    document.execCommand(format, false, null)
    
    // Update active state
    updateActiveFormats()
  }

  // Check current formatting state
  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline')
    })
  }

  // Handle selection change to update toolbar state
  const handleSelectionChange = () => {
    updateActiveFormats()
  }

  // Handle image insertion (placeholder)
  const handleImageClick = () => {
    // Untuk sementara alert, nanti bisa dikembangkan dengan file picker
    alert('Fitur tambah gambar akan segera hadir!')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg mx-4 max-w-md w-full animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Logbook</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Judul Input */}
          <div>
            <input
              type="text"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              required
            />
          </div>


          {/* Text Formatting Toolbar */}
          <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-2">
            <button
              type="button"
              onClick={() => applyFormat('bold')}
              className={`p-2 rounded transition-colors ${activeFormats.bold ? 'bg-[#085C85] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              title="Bold (Ctrl+B)"
            >
              <FontAwesomeIcon icon={faBold} />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('italic')}
              className={`p-2 rounded transition-colors ${activeFormats.italic ? 'bg-[#085C85] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              title="Italic (Ctrl+I)"
            >
              <FontAwesomeIcon icon={faItalic} />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('underline')}
              className={`p-2 rounded transition-colors ${activeFormats.underline ? 'bg-[#085C85] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              title="Underline (Ctrl+U)"
            >
              <FontAwesomeIcon icon={faUnderline} />
            </button>
            <div className="grow" />
            <button
              type="button"
              onClick={handleImageClick}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Add Image"
            >
              <FontAwesomeIcon icon={faImage} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Rich Text Editor (contentEditable) */}
          <div>
            <div
              ref={editorRef}
              contentEditable
              onSelect={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              onMouseUp={handleSelectionChange}
              data-placeholder="Deskripsi..."
              className="w-full min-h-[150px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent transition-all resize-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 bg-white dark:bg-gray-700 dark:text-white break-words overflow-hidden"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#085C85] hover:bg-[#064a6a] text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
