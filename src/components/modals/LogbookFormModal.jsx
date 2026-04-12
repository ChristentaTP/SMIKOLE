import { useState, useRef, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBold, faItalic, faUnderline, faCamera, faTimes, faTrash } from "@fortawesome/free-solid-svg-icons"

const MAX_PHOTOS = 5
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB batas sebelum kompresi

/**
 * Kompres gambar menggunakan Canvas API (browser-native, tanpa library tambahan).
 * Output: JPEG dengan max lebar 1280px dan kualitas 80% — ukuran ~70-90% lebih kecil.
 * @param {File} file - File gambar asli
 * @returns {Promise<File>} File gambar yang sudah dikompres
 */
const compressImage = (file) => {
  const MAX_WIDTH = 1280
  const QUALITY = 0.8 // 80% — kualitas bagus, ukuran kecil

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      let { width, height } = img

      // Scale down proporsional jika lebih lebar dari MAX_WIDTH
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width)
        width = MAX_WIDTH
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      canvas.getContext("2d").drawImage(img, 0, 0, width, height)

      // Konversi ke JPEG blob
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl)
          // Bungkus blob kembali jadi File agar kompatibel dengan upload
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"), // ganti ekstensi jadi .jpg
            { type: "image/jpeg" }
          )
          resolve(compressedFile)
        },
        "image/jpeg",
        QUALITY
      )
    }

    img.onerror = () => {
      // Jika gagal kompres, pakai file asli
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}

export default function LogbookFormModal({ isOpen, onClose, onSave, initialData = null, isLoading = false }) {
  const [title, setTitle] = useState("")
  const [imageFiles, setImageFiles] = useState([])       // New File objects to upload
  const [previews, setPreviews] = useState([])             // Preview URLs (blob or existing)
  const [existingUrls, setExistingUrls] = useState([])     // URLs already saved in Firestore
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false })
  const [isCompressing, setIsCompressing] = useState(false) // Indikator saat kompresi berjalan
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

  // Handle file selection — kompres setiap gambar sebelum masuk state
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const remaining = MAX_PHOTOS - totalPhotos
    if (remaining <= 0) {
      alert(`Maksimal ${MAX_PHOTOS} foto per logbook`)
      return
    }

    // Filter: hanya gambar, batasi jumlah, dan cek ukuran ekstrim (> 10 MB)
    const validFiles = []
    for (const file of files.slice(0, remaining)) {
      if (!file.type.startsWith("image/")) {
        alert("Hanya file gambar yang diperbolehkan")
        continue
      }
      if (file.size > MAX_SIZE_BYTES) {
        alert(`${file.name}: Ukuran gambar terlalu besar (maks 10MB sebelum dikompresi)`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    // Kompres semua file secara paralel
    setIsCompressing(true)
    try {
      const compressed = await Promise.all(validFiles.map(f => compressImage(f)))

      setImageFiles(prev => [...prev, ...compressed])
      setPreviews(prev => [
        ...prev,
        ...compressed.map(f => ({ url: URL.createObjectURL(f), isExisting: false, file: f }))
      ])
    } finally {
      setIsCompressing(false)
    }

    // Reset input agar file yang sama bisa dipilih ulang
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
    if (isCompressing) return // Blokir klik ganda saat kompresi
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
              disabled={isCompressing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
              title={isCompressing ? "Mengompresi gambar..." : "Tambah Foto"}>
              {isCompressing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#085C85]" />
                  <span className="text-xs text-[#085C85] font-medium">Kompresi...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCamera} className="text-gray-600 dark:text-gray-300" />
                  {totalPhotos > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{totalPhotos}/{MAX_PHOTOS}</span>
                  )}
                </>
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
