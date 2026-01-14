import { Routes, Route, Navigate } from "react-router-dom"
import Welcome from "./app/routes/Welcome"
import Login from "./app/routes/Login"
import Dashboard from "./app/routes/Dashboard"
import KontrolAktuator from "./app/routes/KontrolAktuator"
import Logbook from "./app/routes/Logbook"
import PrediksiFCR from "./app/routes/PrediksiFCR"
import Notifikasi from "./app/routes/Notifikasi"
import Personalisasi from "./app/routes/Personalisasi"

export default function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      
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
