import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBell, faTimes } from "@fortawesome/free-solid-svg-icons"

export default function NotificationModal({ notification, onClose }) {
  if (!notification) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#085C85]/10 dark:bg-[#4A9CC7]/20 flex items-center justify-center text-[#085C85] dark:text-[#4A9CC7]">
              <FontAwesomeIcon icon={faBell} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                {notification.title}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">{notification.date}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <div className="overflow-y-auto grow custom-scrollbar pr-2">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed pb-4">
            {notification.message}
          </p>
        </div>
      </div>
    </div>
  );
}
