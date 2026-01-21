import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus } from "@fortawesome/free-solid-svg-icons"

export default function AddLogbookCard({ onClick }) {
  return (
    <div 
      className="rounded-xl overflow-hidden shadow-md cursor-pointer transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg border-2 border-dashed border-gray-300 hover:border-[#085C85]"
      onClick={onClick}
    >
      {/* Card with white background */}
      <div className="bg-white p-4 h-32 flex items-center justify-center">
        <FontAwesomeIcon 
          icon={faPlus} 
          className="text-4xl text-gray-400 hover:text-[#085C85] transition-colors duration-200" 
        />
      </div>
    </div>
  )
}
