/**
 * Logbook Service
 * Service layer untuk CRUD operations logbook
 * Saat ini menggunakan static data, nanti bisa diganti ke API calls
 */

// Static data untuk development
let logbooks = [
  {
    id: 1,
    title: "Judul",
    date: "12 Agustus 2025",
    description: "Deskripsi logbook pertama"
  },
  {
    id: 2,
    title: "Judul",
    date: "12 Agustus 2025",
    description: "Deskripsi logbook kedua"
  },
  {
    id: 3,
    title: "Judul",
    date: "12 Agustus 2025",
    description: "Deskripsi logbook ketiga"
  },
  {
    id: 4,
    title: "Judul",
    date: "12 Agustus 2025",
    description: "Deskripsi logbook keempat"
  }
]

let nextId = 5

/**
 * Get all logbook entries
 * @returns {Promise<Array>} Array of logbook entries
 */
export const getLogbooks = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100))
  return [...logbooks]
}

/**
 * Get single logbook entry by ID
 * @param {number} id - Logbook ID
 * @returns {Promise<Object|null>} Logbook entry or null
 */
export const getLogbookById = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 100))
  return logbooks.find(log => log.id === id) || null
}

/**
 * Create new logbook entry
 * @param {Object} data - Logbook data { title, date, description }
 * @returns {Promise<Object>} Created logbook entry
 */
export const createLogbook = async (data) => {
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const newLogbook = {
    id: nextId++,
    title: data.title,
    date: data.date,
    description: data.description
  }
  
  logbooks.push(newLogbook)
  return newLogbook
}

/**
 * Update existing logbook entry
 * @param {number} id - Logbook ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object|null>} Updated logbook or null
 */
export const updateLogbook = async (id, data) => {
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const index = logbooks.findIndex(log => log.id === id)
  if (index === -1) return null
  
  logbooks[index] = { ...logbooks[index], ...data }
  return logbooks[index]
}

/**
 * Delete logbook entry
 * @param {number} id - Logbook ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteLogbook = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const index = logbooks.findIndex(log => log.id === id)
  if (index === -1) return false
  
  logbooks.splice(index, 1)
  return true
}
