import { useState, useEffect, useMemo } from 'react';
import { Printer, Image, Clock3 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useStudent } from '../../contexts/StudentContext';
import { getCourse } from '../../lib/courseService';
import { cancelEnrollment } from '../../lib/enrollmentService';
import { formatSchedule, isWithinChangePeriod } from '../../lib/utils';
import { STATUS_CONFIG, ENROLLMENT_STATUS } from '../../constants';
import { BigSchedule } from './WeeklySchedule';
import LoadingSpinner from '../common/LoadingSpinner';

export default function MySchedulePage() {
  const { student, enrollments, refreshStudent } = useStudent();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  // Load course details for enrollments
  useEffect(() => {
    const loadCourses = async () => {
      if (enrollments.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      try {
        const coursePromises = enrollments.map(async (enrollment) => {
          const course = await getCourse(enrollment.courseId);
          return course ? { ...course, enrollmentId: enrollment.id, status: enrollment.status } : null;
        });

        const loadedCourses = (await Promise.all(coursePromises)).filter(Boolean);
        setCourses(loadedCourses);
      } catch (error) {
        console.error('Failed to load courses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [enrollments]);

  // Separate courses by status
  const { approvedCourses, pendingCourses } = useMemo(() => {
    const approved = courses.filter(c => c.status === ENROLLMENT_STATUS.APPROVED);
    const pending = courses.filter(c => c.status === ENROLLMENT_STATUS.PENDING);
    return { approvedCourses: approved, pendingCourses: pending };
  }, [courses]);

  const canCancel = useMemo(() => {
    if (!student) return false;
    return isWithinChangePeriod(student);
  }, [student]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportImage = async () => {
    const scheduleElement = document.getElementById('schedule-container');
    if (!scheduleElement) return;

    try {
      const canvas = await html2canvas(scheduleElement, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = `시간표_${student?.name}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('이미지 저장에 실패했습니다.');
    }
  };

  const handleCancel = async (enrollmentId, courseTitle) => {
    if (!canCancel) {
      alert('수강신청 변경 기간이 아닙니다.');
      return;
    }

    if (!confirm(`"${courseTitle}" 수강을 취소하시겠습니까?`)) {
      return;
    }

    setCancelling(enrollmentId);
    try {
      await cancelEnrollment(enrollmentId);
      alert('수강이 취소되었습니다.');
    } catch (error) {
      console.error('Cancel failed:', error);
      alert('취소 처리 중 오류가 발생했습니다.');
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <LoadingSpinner message="시간표를 불러오는 중..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {student?.name}님의 <span className="text-[#00b6b2]">시간표</span>
          </h1>
          <p className="text-slate-500 mt-2">
            수강신청 현황 및 확정된 시간표입니다.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            인쇄
          </button>
          <button 
            onClick={handleExportImage}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-[#00b6b2] transition-colors shadow-lg shadow-[#00b6b2]/20"
          >
            <Image className="w-4 h-4" />
            이미지 저장
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Schedule Visualizer */}
        <div className="lg:col-span-3" id="schedule-container">
          <BigSchedule enrolledCourses={approvedCourses} pendingCourses={pendingCourses} />
        </div>

        {/* Course List Summary */}
        <div className="lg:col-span-1 space-y-6 no-print">
          {/* Approved Courses */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              수강 확정 ({approvedCourses.length})
            </h3>
            <div className="space-y-4">
              {approvedCourses.map(course => (
                <CourseListItem 
                  key={course.id}
                  course={course}
                  onCancel={handleCancel}
                  canCancel={canCancel}
                  cancelling={cancelling === course.enrollmentId}
                />
              ))}
              {approvedCourses.length === 0 && (
                <p className="text-sm text-slate-400">확정된 강좌가 없습니다.</p>
              )}
            </div>
          </div>

          {/* Pending Courses */}
          {pendingCourses.length > 0 && (
            <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-6">
              <h3 className="font-bold text-yellow-800 mb-4 flex items-center gap-2">
                <Clock3 className="w-4 h-4" />
                신청 대기 ({pendingCourses.length})
              </h3>
              <div className="space-y-4">
                {pendingCourses.map(course => (
                  <CourseListItem 
                    key={course.id}
                    course={course}
                    onCancel={handleCancel}
                    canCancel={true} // Can always cancel pending
                    cancelling={cancelling === course.enrollmentId}
                    isPending
                  />
                ))}
              </div>
              <p className="text-xs text-yellow-700 mt-4">
                관리자 승인 대기 중입니다. 시간표에 줄무늬로 표시됩니다.
              </p>
            </div>
          )}
          
          {/* Change Period Info */}
          <div className={`rounded-2xl p-6 border ${canCancel ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className={`font-bold mb-2 ${canCancel ? 'text-green-800' : 'text-slate-600'}`}>
              수강신청 변경기간
            </h3>
            {student?.changeStartDate && student?.changeEndDate ? (
              <>
                <p className={`text-sm ${canCancel ? 'text-green-700' : 'text-slate-500'}`}>
                  {new Date(student.changeStartDate.toDate?.() || student.changeStartDate).toLocaleDateString('ko-KR')} ~ {' '}
                  {new Date(student.changeEndDate.toDate?.() || student.changeEndDate).toLocaleDateString('ko-KR')}
                </p>
                <p className={`text-xs mt-2 ${canCancel ? 'text-green-600' : 'text-slate-400'}`}>
                  {canCancel ? '현재 변경 가능 기간입니다.' : '변경 기간이 아닙니다.'}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                설정된 변경 기간이 없습니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseListItem({ course, onCancel, canCancel, cancelling, isPending }) {
  const statusConfig = STATUS_CONFIG[course.status];
  
  return (
    <div className={`flex gap-3 items-start p-3 rounded-xl border ${isPending ? 'bg-yellow-100/50 border-yellow-200' : 'bg-slate-50 border-slate-100'}`}>
      <div className={`w-1 h-full min-h-[40px] rounded-full ${course.color?.replace('text-', 'bg-').replace('100', '500') || 'bg-slate-300'}`} />
      <div className="flex-1">
        <div className="font-semibold text-sm text-slate-900">{course.title}</div>
        <div className="text-xs text-slate-500 mt-1">
          {formatSchedule(course.day, course.startPeriod, course.endPeriod)}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          {course.room} | {course.instructor}
        </div>
        {(canCancel || isPending) && (
          <button
            onClick={() => onCancel(course.enrollmentId, course.title)}
            disabled={cancelling}
            className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
          >
            {cancelling ? '취소 중...' : '수강 취소'}
          </button>
        )}
      </div>
    </div>
  );
}
