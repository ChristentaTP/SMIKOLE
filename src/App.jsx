import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import { ThemeProvider } from "./contexts/ThemeContext"
import ProtectedRoute from "./components/ProtectedRoute"
import Login from "./app/routes/Login"
import Dashboard from "./app/routes/Dashboard"
import KontrolAktuator from "./app/routes/KontrolAktuator"
import Logbook from "./app/routes/Logbook"
import AdminKolam from "./app/routes/AdminKolam"

import PrediksiFCR from "./app/routes/PrediksiFCR"
import Notifikasi from "./app/routes/Notifikasi"
import Personalisasi from "./app/routes/Personalisasi"

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Default redirect to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Protected routes — harus login */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/kontrol-aktuator" element={<ProtectedRoute><KontrolAktuator /></ProtectedRoute>} />
        <Route path="/logbook" element={<ProtectedRoute allowedRoles={["pembudidaya"]}><Logbook /></ProtectedRoute>} />
        <Route path="/admin/kolam" element={<ProtectedRoute allowedRoles={["admin"]}><AdminKolam /></ProtectedRoute>} />

        <Route path="/prediksi-fcr" element={<ProtectedRoute><PrediksiFCR /></ProtectedRoute>} />
        <Route path="/notifikasi" element={<ProtectedRoute><Notifikasi /></ProtectedRoute>} />
        <Route path="/personalisasi" element={<ProtectedRoute><Personalisasi /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  )
}
