import Sidebar from "./Sidebar"
import Header from "./Header"
import Footer from "./Footer"

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      
      {/* Sidebar desktop */}
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  )
}
