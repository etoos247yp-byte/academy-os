import React from 'react';
import { Calendar } from 'lucide-react';
import { DAYS, PERIODS } from '../../constants';

// Mini Schedule for Sidebar
export function WeeklySchedule({ enrolledCourses }) {
  const getCourseBlock = (dayIndex, periodId) => {
    return enrolledCourses.find(course => {
      const days = course.day.split('/');
      const isDayMatch = days.includes(DAYS[dayIndex]);
      const isPeriodMatch = periodId >= course.startPeriod && periodId <= course.endPeriod;
      return isDayMatch && isPeriodMatch;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mt-6">
      <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[#00b6b2]" />
        주간 시간표 미리보기
      </h3>
      
      <div className="grid grid-cols-8 gap-1 text-[10px] text-center">
        <div className="text-slate-400">교시</div>
        {DAYS.map(day => <div key={day} className="font-semibold text-slate-600">{day}</div>)}

        {PERIODS.map((period) => (
          <React.Fragment key={period.id}>
            <div className="text-slate-400 h-8 flex flex-col items-center justify-center bg-slate-50 rounded-sm">
              <span className="font-bold">{period.id}</span>
              <span className="text-[8px] scale-90">{period.time}</span>
            </div>
            
            {DAYS.map((day, dayIndex) => {
              const course = getCourseBlock(dayIndex, period.id);
              const isStartBlock = course && course.startPeriod === period.id;
              
              if (period.id === 12 && (day === '토' || day === '일')) {
                return <div key={`${day}-${period.id}`} className="bg-gray-100/50 rounded-sm" />;
              }

              return (
                <div key={`${day}-${period.id}`} className="h-8 relative border border-slate-50">
                  {course && (
                    <div className={`absolute inset-0.5 ${course.color.replace('text-', 'bg-').replace('100', '200')} rounded-sm opacity-90 flex items-center justify-center`}>
                      <span className={`text-[9px] truncate px-0.5 leading-tight ${isStartBlock ? 'font-bold text-slate-900' : 'font-medium text-slate-500 opacity-60'}`}>
                        {course.title.split(' ')[0]}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            
            {(period.id === 4 || period.id === 8) && (
              <div className="col-span-8 h-2 bg-slate-50/50 -mx-1 my-1 border-t border-b border-slate-100" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Full Page Schedule
export function BigSchedule({ enrolledCourses, pendingCourses = [] }) {
  // Combine all courses for display
  const allCourses = [
    ...enrolledCourses.map(c => ({ ...c, isPending: false })),
    ...pendingCourses.map(c => ({ ...c, isPending: true }))
  ];

  const getCourseBlock = (dayIndex, periodId) => {
    return allCourses.find(course => {
      const days = course.day.split('/');
      const isDayMatch = days.includes(DAYS[dayIndex]);
      const isPeriodMatch = periodId >= course.startPeriod && periodId <= course.endPeriod;
      return isDayMatch && isPeriodMatch;
    });
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
              const isStartBlock = course && course.startPeriod === period.id;
              const isEndBlock = course && course.endPeriod === period.id;
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
