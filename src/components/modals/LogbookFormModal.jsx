import { useState, useRef, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBold, faItalic, faUnderline, faCamera, faTimes, faTrash } from "@fortawesome/free-solid-svg-icons"

const MAX_PHOTOS = 5

export default function LogbookFormModal({ isOpen, onClose, onSave, initialData = null, isLoading = false }) {
  const [title, setTitle] = useState("")
  const [imageFiles, setImageFiles] = useState([])       // New File objects to upload
  const [previews, setPreviews] = useState([])             // Preview URLs (blob or existing)
  const [existingUrls, setExistingUrls] = useState([])     // URLs already saved in Firestore
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false })
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || "")
      setActiveFormats({ bold: false, italic: false, underline: false })
      setImageFiles([])
      
      // Load existing photos when editing
      const existing = initialData?.fotoUrls || []
      setExistingUrls(existing)
      setPreviews(existing.map(url => ({ url, isExisting: true })))
      
      if (editorRef.current) {
        editorRef.current.innerHTML = initialData?.description || ""
      }
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const totalPhotos = previews.length

  const handleSubmit = (e) => {
    e.preventDefault()
    const description = editorRef.current?.innerHTML || ""
    
    // Separate keep-urls (existing) from new files
    const keepUrls = previews.filter(p => p.isExisting).map(p => p.url)
    
    onSave({
      title,
      description,
      imageFiles,   // New files to upload
      keepUrls      // Existing URLs to keep
    })
    
    setTitle("")
    setImageFiles([])
    setPreviews([])
    setExistingUrls([])
    if (editorRef.current) {
      editorRef.current.innerHTML = ""
    }
  }

  const applyFormat = (format) => {
    editorRef.current?.focus()
    document.execCommand(format, false, null)
    updateActiveFormats()
  }

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline')
    })
  }

  const handleSelectionChange = () => {
    updateActiveFormats()
  }

  // Handle file selection — supports multiple
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const remaining = MAX_PHOTOS - totalPhotos
    if (remaining <= 0) {
      alert(`Maksimal ${MAX_PHOTOS} foto per logbook`)
      return
    }

    const validFiles = []
    for (const file of files.slice(0, remaining)) {
      if (!file.type.startsWith("image/")) {
        alert("Hanya file gambar yang diperbolehkan")
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name}: Ukuran gambar maksimal 5MB`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      setImageFiles(prev => [...prev, ...validFiles])
      setPreviews(prev => [
        ...prev,
        ...validFiles.map(f => ({ url: URL.createObjectURL(f), isExisting: false, file: f }))
      ])
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Remove a photo (existing or new)
  const handleRemovePhoto = (index) => {
    const removed = previews[index]
    
    setPreviews(prev => prev.filter((_, i) => i !== index))
    
    if (removed.isExisting) {
      setExistingUrls(prev => prev.filter(url => url !== removed.url))
    } else {
      setImageFiles(prev => prev.filter(f => f !== removed.file))
      URL.revokeObjectURL(removed.url)
    }
  }

  const handleCameraClick = () => {
    if (totalPhotos >= MAX_PHOTOS) {
      alert(`Maksimal ${MAX_PHOTOS} foto per logbook`)
      return
    }
    fileInputRef.current?.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg mx-4 max-w-md w-full animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{initialData ? "Edit Logbook" : "Logbook Baru"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Judul */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            required
          />

          {/* Toolbar */}
          <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-2">
            <button type="button" onClick={() => applyFormat('bold')}
              className={`p-2 rounded transition-colors ${activeFormats.bold ? 'bg-[#085C85] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              title="Bold">
              <FontAwesomeIcon icon={faBold} />
            </button>
            <button type="button" onClick={() => applyFormat('italic')}
              className={`p-2 rounded transition-colors ${activeFormats.italic ? 'bg-[#085C85] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              title="Italic">
              <FontAwesomeIcon icon={faItalic} />
            </button>
            <button type="button" onClick={() => applyFormat('underline')}
              className={`p-2 rounded transition-colors ${activeFormats.underline ? 'bg-[#085C85] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              title="Underline">
              <FontAwesomeIcon icon={faUnderline} />
            </button>
            <div className="grow" />
            <button type="button" onClick={handleCameraClick}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-1"
              title="Tambah Foto">
              <FontAwesomeIcon icon={faCamera} className="text-gray-600 dark:text-gray-300" />
              {totalPhotos > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{totalPhotos}/{MAX_PHOTOS}</span>
              )}
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Image Previews Grid */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((preview, index) => (
                <div key={index} className="relative rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 aspect-square">
                  <img src={preview.url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-colors"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                  </button>
                </div>
              ))}

              {/* Add more button */}
              {totalPhotos < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={handleCameraClick}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#085C85] dark:hover:border-[#4A9CC7] flex flex-col items-center justify-center gap-1 transition-colors text-gray-400 hover:text-[#085C85] dark:hover:text-[#4A9CC7]"
                >
                  <FontAwesomeIcon icon={faCamera} />
                  <span className="text-[10px]">Tambah</span>
                </button>
              )}
            </div>
          )}

          {/* Rich Text Editor */}
          <div
            ref={editorRef}
            contentEditable
            onSelect={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            onMouseUp={handleSelectionChange}
            data-placeholder="Deskripsi..."
            className="w-full min-h-[120px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent transition-all resize-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 bg-white dark:bg-gray-700 dark:text-white wrap-break-word overflow-hidden"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          />

          {/* Submit */}
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
        </form>
      </div>
    </div>
  )
}
