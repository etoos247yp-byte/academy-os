import { X, AlertTriangle, XCircle, CheckCircle, Info } from 'lucide-react';

const TYPE_CONFIG = {
  warning: {
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-500',
    lightBg: 'bg-amber-50',
    icon: AlertTriangle,
  },
  error: {
    bgColor: 'bg-red-500',
    textColor: 'text-red-500',
    lightBg: 'bg-red-50',
    icon: XCircle,
  },
  success: {
    bgColor: 'bg-[#00b6b2]',
    textColor: 'text-[#00b6b2]',
    lightBg: 'bg-teal-50',
    icon: CheckCircle,
  },
  info: {
    bgColor: 'bg-slate-500',
    textColor: 'text-slate-500',
    lightBg: 'bg-slate-50',
    icon: Info,
  },
};

export default function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  details = [],
  type = 'info',
}) {
  if (!isOpen) return null;

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className={`${config.bgColor} text-white p-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <IconComponent className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-700 text-[15px] leading-relaxed">{message}</p>

          {details.length > 0 && (
            <div className={`mt-4 p-4 ${config.lightBg} rounded-xl`}>
              <ul className="space-y-2">
                {details.map((detail, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${config.bgColor}`} />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-[#00b6b2] text-white font-bold hover:bg-[#009da0] transition-colors shadow-lg shadow-[#00b6b2]/30"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
