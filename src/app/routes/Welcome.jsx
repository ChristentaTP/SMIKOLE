import { Link } from "react-router-dom"

export default function Welcome() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0a4d6e 0%, #085C85 50%, #0a6a8f 100%)" }}>
      {/* Top Section with Logo */}
      <div className="flex-1 flex items-center justify-center">
        <h1 className="text-4xl md:text-5xl font-light tracking-[0.3em] text-white">
          SMIKOLE
        </h1>
      </div>

      {/* Bottom Wave Section */}
      <div className="relative">
        {/* Wave SVG */}
        <svg viewBox="0 0 1440 200" className="w-full" preserveAspectRatio="none">
          <path 
            fill="#ffffff" 
            d="M0,100 C300,180 400,60 720,100 C1040,140 1200,60 1440,100 L1440,200 L0,200 Z"
          />
        </svg>
        
        {/* Content on white background */}
        <div className="bg-white px-6 pb-8 -mt-1">
          <h2 className="text-2xl font-bold text-[#085C85] mb-2">SELAMAT DATANG</h2>
          <p className="text-gray-600 mb-6">Silakan Login Terlebih Dahulu</p>
          
          <Link 
            to="/login"
            className="inline-flex items-center gap-2 border-2 border-[#085C85] text-[#085C85] px-6 py-2 rounded-full hover:bg-[#085C85] hover:text-white transition-colors"
          >
            Continue
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
