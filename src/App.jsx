import { Routes, Route, Navigate } from "react-router-dom"
import Dashboard from "./app/routes/Dashboard"
import KontrolAktuator from "./app/routes/KontrolAktuator"
import Logbook from "./app/routes/Logbook"
import PrediksiFCR from "./app/routes/PrediksiFCR"
import Notifikasi from "./app/routes/Notifikasi"
import Personalisasi from "./app/routes/Personalisasi"

export default function App() {
  return (
    <Routes>
      {/* Default redirect to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Main routes */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/kontrol-aktuator" element={<KontrolAktuator />} />
      <Route path="/logbook" element={<Logbook />} />
      <Route path="/prediksi-fcr" element={<PrediksiFCR />} />
      <Route path="/notifikasi" element={<Notifikasi />} />
      <Route path="/personalisasi" element={<Personalisasi />} />
    </Routes>
  )
}
