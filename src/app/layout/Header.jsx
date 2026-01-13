export default function Header() {
  return (
    <header className="flex items-center justify-between bg-white px-6 py-4 shadow">
      <div>
        <p className="text-sm text-gray-500">Welcome, Pembudidaya</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-green-600 font-medium">
            Koneksi Terhubung
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">John Doe</span>
        <span className="text-xs text-gray-500">Pembudidaya</span>
        <div className="w-8 h-8 bg-gray-300 rounded-full" />
      </div>
    </header>
  )
}
