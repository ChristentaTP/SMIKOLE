import { Routes, Route } from "react-router-dom"
import Dashboard from "./app/routes/Dashboard"

export default function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}
