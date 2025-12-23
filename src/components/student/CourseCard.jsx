import { User, Clock, Briefcase, Plus, Check, X, Clock3 } from 'lucide-react';
import { formatSchedule, formatSchedules } from '../../lib/utils';
import { STATUS_CONFIG } from '../../constants';

export default function CourseCard({ course, onAdd, isInCart, enrollmentStatus }) {
  const isFull = course.enrolled >= course.capacity;
  const isEnrolled = !!enrollmentStatus;
  const statusConfig = enrollmentStatus ? STATUS_CONFIG[enrollmentStatus] : null;

  const getButtonState = () => {
    if (isEnrolled) {
      return {
        disabled: true,
        className: 'bg-slate-100 text-slate-500 cursor-default',
        icon: <Check className="w-4 h-4" />,
        text: statusConfig?.label || '신청됨',
      };
    }
    if (isInCart) {
      return {
        disabled: true,
        className: 'bg-[#00b6b2]/10 text-[#00b6b2] cursor-default',
        icon: <Check className="w-4 h-4" />,
        text: '담기 완료',
      };
    }
    if (isFull) {
      return {
        disabled: true,
        className: 'bg-gray-100 text-gray-400 cursor-not-allowed',
        icon: <X className="w-4 h-4" />,
        text: '신청 마감',
      };
    }
    return {
      disabled: false,
      className: 'bg-slate-900 text-white hover:bg-[#00b6b2] shadow-md hover:shadow-[#00b6b2]/30',
      icon: <Plus className="w-4 h-4" />,
      text: '수강 신청',
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:border-[#00b6b2]/30 transition-all duration-300 flex flex-col h-full">
      {/* Status Badge for enrolled courses */}
      {isEnrolled && (
        <div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold ${statusConfig?.color}`}>
          {statusConfig?.label}
        </div>
      )}
      
      <div className="flex justify-between items-start mb-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${course.color}`}>
          {course.category}
        </span>
        <span className="text-xs font-medium text-slate-400 border border-slate-100 px-2 py-1 rounded-md">
          {course.level}
        </span>
      </div>
      
      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#00b6b2] transition-colors">
        {course.title}
      </h3>
      
      <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-grow">
        {course.description}
      </p>

      <div className="space-y-3 text-sm text-slate-600 mb-6">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          <span>{course.instructor}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{course.schedules ? formatSchedules(course.schedules) : formatSchedule(course.day, course.startPeriod, course.endPeriod)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-slate-400" />
          <span>{course.room}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full ${isFull ? 'bg-red-500' : 'bg-green-500'}`} />
          </div>
          <span className={isFull ? 'text-red-500 font-medium' : 'text-slate-600'}>
            {course.enrolled} / {course.capacity} 명
            {isFull && <span className="ml-1 text-xs">(마감)</span>}
          </span>
        </div>
      </div>

      <button
        onClick={() => !buttonState.disabled && onAdd(course)}
        disabled={buttonState.disabled}
        className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all duration-200 ${buttonState.className}`}
      >
        {buttonState.icon}
        {buttonState.text}
      </button>
    </div>
  );
}
