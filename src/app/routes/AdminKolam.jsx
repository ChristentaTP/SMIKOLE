import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faTrash, faWater, faPenToSquare, faTimes, faUsers } from "@fortawesome/free-solid-svg-icons"
import { collection, onSnapshot, deleteDoc, doc, setDoc, updateDoc, getDocs, query, where } from "firebase/firestore"
import { db } from "../../services/firebase"
import MainLayout from "../layout/MainLayout"

export default function AdminKolam() {
  const [ponds, setPonds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newPond, setNewPond] = useState({ id: "", name: "" })
  const [editingPond, setEditingPond] = useState(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [allUsers, setAllUsers] = useState([])

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

  const handleAddSensor = () => {
    setEditingPond(prev => ({
      ...prev,
      sensors: [...(prev.sensors || []), { key: "", label: "", unit: "", type: "generic" }]
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
                      <div key={idx} className="flex gap-2 items-start border dark:border-gray-600 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30">
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
