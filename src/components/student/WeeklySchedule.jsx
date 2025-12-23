import React, { useMemo } from 'react';
import { Calendar, CheckCircle, ShoppingCart } from 'lucide-react';
import { DAYS, PERIODS } from '../../constants';

const CELL_HEIGHT = 20; // px per period

/**
 * Get schedule slots from a course (supports both old and new format)
 */
const getScheduleSlots = (course) => {
  // New format: schedules array
  if (course.schedules && Array.isArray(course.schedules) && course.schedules.length > 0) {
    return course.schedules;
  }
  
  // Legacy format: day/startPeriod/endPeriod
  if (course.day) {
    const days = course.day.split('/');
    return days.map(day => ({
      day: day.trim(),
      startPeriod: course.startPeriod || 1,
      endPeriod: course.endPeriod || 2,
    }));
  }
  
  return [];
};

// Mini Schedule for Sidebar - Improved version with merged cells
export function WeeklySchedule({ enrolledCourses = [], cartCourses = [] }) {
  // Combine courses with type info
  const allCourses = useMemo(() => [
    ...enrolledCourses.map(c => ({ ...c, type: 'enrolled' })),
    ...cartCourses.map(c => ({ ...c, type: 'cart' }))
  ], [enrolledCourses, cartCourses]);

  // Generate course blocks for absolute positioning (multi-schedule aware)
  const courseBlocks = useMemo(() => {
    const blocks = [];
    
    allCourses.forEach(course => {
      const slots = getScheduleSlots(course);
      
      slots.forEach(slot => {
        const dayIndex = DAYS.indexOf(slot.day);
        if (dayIndex === -1) return;
        
        const periodSpan = slot.endPeriod - slot.startPeriod + 1;
        const top = (slot.startPeriod - 1) * CELL_HEIGHT;
        const height = periodSpan * CELL_HEIGHT;
        
        blocks.push({
          ...course,
          dayIndex,
          top,
          height,
          periodSpan,
          slotDay: slot.day,
          slotStartPeriod: slot.startPeriod,
          slotEndPeriod: slot.endPeriod,
        });
      });
    });
    
    return blocks;
  }, [allCourses]);

  const totalEnrolled = enrolledCourses.length;
  const totalCart = cartCourses.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[#00b6b2]" />
        주간 시간표 미리보기
      </h3>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-[10px]">
        {totalEnrolled > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-slate-600">확정 {totalEnrolled}</span>
          </div>
        )}
        {totalCart > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#00b6b2]"></div>
            <span className="text-slate-600">신청중 {totalCart}</span>
          </div>
        )}
        {totalEnrolled === 0 && totalCart === 0 && (
          <span className="text-slate-400">강좌를 선택해주세요</span>
        )}
      </div>
      
      {/* Schedule Grid */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        {/* Header */}
        <div className="grid grid-cols-8 bg-slate-100 border-b border-slate-200">
          <div className="py-1 text-[8px] text-slate-400 text-center font-medium"></div>
          {DAYS.map(day => (
            <div 
              key={day} 
              className={`py-1 text-[9px] text-center font-bold ${
                day === '일' ? 'text-red-400' : day === '토' ? 'text-blue-400' : 'text-slate-600'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Body with relative positioning */}
        <div className="relative" style={{ height: `${PERIODS.length * CELL_HEIGHT}px` }}>
          {/* Grid lines */}
          {PERIODS.map((period, idx) => (
            <div 
              key={period.id} 
              className="absolute left-0 right-0 grid grid-cols-8 border-b border-slate-100"
              style={{ top: `${idx * CELL_HEIGHT}px`, height: `${CELL_HEIGHT}px` }}
            >
              <div className="text-[7px] text-slate-300 flex items-center justify-center bg-slate-50/30">
                {period.id}
              </div>
              {DAYS.map((day, dayIdx) => (
                <div key={`${day}-${period.id}`} className="border-l border-slate-100" />
              ))}
            </div>
          ))}

          {/* Course blocks (absolute positioned) */}
          {courseBlocks.map((block, idx) => (
            <div
              key={`${block.id}-${block.dayIndex}-${block.slotStartPeriod}-${idx}`}
              className={`
                absolute rounded-sm flex flex-col items-center justify-center overflow-hidden
                transition-all duration-200 hover:z-20 hover:scale-105 cursor-pointer
                ${block.type === 'enrolled' 
                  ? 'bg-green-500 text-white shadow-sm shadow-green-500/30' 
                  : 'bg-[#00b6b2] text-white shadow-sm shadow-[#00b6b2]/30'
                }
              `}
              style={{
                top: `${block.top + 1}px`,
                left: `calc(${(block.dayIndex + 1) * 12.5}% + 2px)`,
                width: `calc(12.5% - 4px)`,
                height: `${block.height - 2}px`,
              }}
              title={`${block.title}\n${block.instructor}\n${block.room}\n${block.slotDay} ${block.slotStartPeriod}~${block.slotEndPeriod}교시`}
            >
              {/* Content */}
              <div className="flex flex-col items-center justify-center w-full h-full p-0.5">
                <span className="text-[7px] font-bold leading-tight text-center line-clamp-2">
                  {block.title.length > 8 ? block.title.substring(0, 8) : block.title}
                </span>
                {block.height >= 40 && (
                  <span className="text-[6px] opacity-70 mt-0.5">
                    {block.room}
                  </span>
                )}
              </div>
              
              {/* Status icon */}
              <div className="absolute top-0.5 right-0.5">
                {block.type === 'enrolled' ? (
                  <CheckCircle className="w-2 h-2 text-white/70" />
                ) : (
                  <ShoppingCart className="w-2 h-2 text-white/70" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Summary */}
      {(totalEnrolled > 0 || totalCart > 0) && (
        <div className="mt-2 text-[10px] text-slate-500 text-center">
          총 {totalEnrolled + totalCart}개 강좌
        </div>
      )}
    </div>
  );
}

// Full Page Schedule (multi-schedule aware)
export function BigSchedule({ enrolledCourses, pendingCourses = [] }) {
  // Combine all courses for display
  const allCourses = [
    ...enrolledCourses.map(c => ({ ...c, isPending: false })),
    ...pendingCourses.map(c => ({ ...c, isPending: true }))
  ];

  // Find course for a specific day and period (multi-schedule aware)
  const getCourseBlock = (dayIndex, periodId) => {
    const day = DAYS[dayIndex];
    
    for (const course of allCourses) {
      const slots = getScheduleSlots(course);
      
      for (const slot of slots) {
        if (slot.day === day && periodId >= slot.startPeriod && periodId <= slot.endPeriod) {
          // Return course with the specific slot info
          return {
            ...course,
            slotStartPeriod: slot.startPeriod,
            slotEndPeriod: slot.endPeriod,
          };
        }
      }
    }
    
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Legend for pending courses */}
      {pendingCourses.length > 0 && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2 text-xs text-yellow-700">
          <div className="w-4 h-4 rounded bg-yellow-200 flex items-center justify-center" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)'
          }} />
          <span>줄무늬 = 승인 대기 중</span>
        </div>
      )}
      
      <div className="grid grid-cols-8 divide-x divide-gray-200 border-b border-gray-200">
        <div className="py-3 text-center text-sm font-semibold text-slate-500 bg-slate-50">교시</div>
        {DAYS.map(day => (
          <div key={day} className={`py-3 text-center text-sm font-bold bg-slate-50 ${day === '일' ? 'text-red-500' : day === '토' ? 'text-blue-500' : 'text-slate-900'}`}>
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-8 divide-x divide-gray-200 bg-white">
        {PERIODS.map((period) => (
          <React.Fragment key={period.id}>
            <div className="min-h-[80px] text-xs font-medium text-slate-500 flex flex-col items-center justify-center bg-slate-50/30 border-b border-slate-100 p-2">
              <span className="font-bold text-lg text-slate-300 mb-1">{period.id}</span>
              <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{period.time}</span>
            </div>
            
            {DAYS.map((day, dayIndex) => {
              if (period.id === 12 && (day === '토' || day === '일')) {
                return <div key={`${day}-${period.id}`} className="bg-gray-50 border-b border-slate-100" />;
              }

              const course = getCourseBlock(dayIndex, period.id);
              const isStartBlock = course && course.slotStartPeriod === period.id;
              const isEndBlock = course && course.slotEndPeriod === period.id;
              const isPending = course?.isPending;
              
              return (
                <div key={`${day}-${period.id}`} className="min-h-[80px] relative border-b border-slate-100 hover:bg-slate-50 transition-colors p-1">
                  {course && (
                    <div 
                      className={`
                        absolute inset-1 rounded-lg p-2 flex flex-col gap-1 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] z-10 cursor-pointer
                        ${isPending ? 'bg-yellow-100' : course.color.replace('text-', 'bg-').replace('100', '200')} 
                        border ${isPending ? 'border-yellow-300' : 'border-transparent'}
                        ${isStartBlock ? 'rounded-t-lg' : 'rounded-t-none border-t-0 mt-[-1px]'}
                        ${isEndBlock ? 'rounded-b-lg' : 'rounded-b-none border-b-0 mb-[-1px] h-[calc(100%+2px)]'}
                      `}
                      style={isPending ? {
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)'
                      } : {}}
                    >
                      {isStartBlock ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold ${isPending ? 'text-yellow-800' : course.color.split(' ')[1]}`}>
                              {course.title}
                            </span>
                            {isPending && (
                              <span className="text-[9px] px-1 py-0.5 bg-yellow-300 text-yellow-800 rounded font-medium">
                                대기
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-auto">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded bg-white/50 backdrop-blur-sm ${isPending ? 'text-yellow-800' : course.color.split(' ')[1]}`}>
                              {course.room}
                            </span>
                            <span className={`text-[10px] opacity-80 ${isPending ? 'text-yellow-700' : course.color.split(' ')[1]}`}>
                              {course.instructor}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span className={`text-[10px] opacity-40 text-center leading-tight ${isPending ? 'text-yellow-700' : course.color.split(' ')[1]}`}>
                            {course.title}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {(period.id === 4 || period.id === 8) && (
              <div className="col-span-8 h-3 bg-slate-50 border-t border-b border-slate-200 flex items-center justify-center">
                <div className="w-16 h-1 bg-slate-200 rounded-full"></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
