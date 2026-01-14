import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    // TODO: Add actual authentication logic
    navigate("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0a4d6e 0%, #085C85 50%, #0a6a8f 100%)" }}>
      {/* Top Section - gradient background */}
      <div className="h-48 md:h-64" />

      {/* Bottom Section with Wave */}
      <div className="flex-1 relative">
        {/* Wave SVG */}
        <svg viewBox="0 0 1440 120" className="w-full absolute -top-16" preserveAspectRatio="none">
          <path 
            fill="#ffffff" 
            d="M0,60 C300,100 400,20 720,60 C1040,100 1200,20 1440,60 L1440,120 L0,120 Z"
          />
        </svg>
        
        {/* Login Form */}
        <div className="bg-white min-h-full px-6 pt-12 pb-8">
          <h2 className="text-2xl font-bold text-[#085C85] mb-8">Login</h2>
          
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username Field */}
            <div>
              <label className="block text-sm text-[#085C85] mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent"
                placeholder="Masukkan username"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm text-[#085C85] mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#085C85] focus:border-transparent"
                placeholder="Masukkan password"
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full bg-[#085C85] text-white py-3 rounded-full font-semibold hover:bg-[#064a6a] transition-colors"
            >
              LOGIN
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
