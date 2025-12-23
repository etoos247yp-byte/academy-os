import { useState, useEffect, useMemo } from 'react';
import { Calendar, BookOpen, CheckCircle2, XCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { useStudent } from '../../contexts/StudentContext';
import { getCourse } from '../../lib/courseService';
import { getStudentAttendance, getStudentAttendanceStats, ATTENDANCE_STATUS_CONFIG } from '../../lib/attendanceService';
import LoadingSpinner from '../common/LoadingSpinner';

export default function MyAttendancePage() {
  const { student, enrollments } = useStudent();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Load enrolled courses
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const approvedEnrollments = enrollments.filter(e => e.status === 'approved');
        const coursePromises = approvedEnrollments.map(async (enrollment) => {
          const course = await getCourse(enrollment.courseId);
          return course ? { ...course, id: enrollment.courseId } : null;
        });
        
        const coursesData = await Promise.all(coursePromises);
        const validCourses = coursesData.filter(c => c !== null);
        setCourses(validCourses);
        
        if (validCourses.length > 0) {
          setSelectedCourse(validCourses[0]);
        }
      } catch (error) {
        console.error('Failed to load courses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [enrollments]);

  // Load attendance records when course changes
  useEffect(() => {
    if (!selectedCourse || !student) return;

    const loadAttendance = async () => {
      setLoadingRecords(true);
      try {
        const [records, courseStats] = await Promise.all([
          getStudentAttendance(student.id, selectedCourse.id),
          getStudentAttendanceStats(student.id, selectedCourse.id),
        ]);
        
        setAttendanceRecords(records);
        setStats(courseStats);
      } catch (error) {
        console.error('Failed to load attendance:', error);
      } finally {
        setLoadingRecords(false);
      }
    };

    loadAttendance();
  }, [selectedCourse, student]);

  // Group records by month
  const groupedRecords = useMemo(() => {
    const groups = {};
    attendanceRecords.forEach(record => {
      const month = record.date.substring(0, 7); // YYYY-MM
      if (!groups[month]) {
        groups[month] = [];
      }
      groups[month].push(record);
    });
    return groups;
  }, [attendanceRecords]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'late':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'excused':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
  };

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return `${year}년 ${parseInt(month)}월`;
  };

  if (loading) {
    return <LoadingSpinner message="출석 정보 로딩 중..." />;
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-[#00b6b2]" />
          내 출석 현황
        </h1>
        <p className="text-slate-500 mt-2">
          수강 중인 강좌별 출석 기록을 확인하세요.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400">수강 확정된 강좌가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* Course Selector */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">강좌 선택</label>
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const course = courses.find(c => c.id === e.target.value);
                setSelectedCourse(course || null);
              }}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
            >
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title} - {course.instructor}
                </option>
              ))}
            </select>
          </div>

          {/* Stats Card */}
          {stats && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#00b6b2]" />
                출석 통계
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{stats.present}</div>
                  <div className="text-sm text-green-600">출석</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{stats.absent}</div>
                  <div className="text-sm text-red-600">결석</div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-700">{stats.late}</div>
                  <div className="text-sm text-yellow-600">지각</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{stats.excused}</div>
                  <div className="text-sm text-blue-600">사유</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className={`text-2xl font-bold ${stats.rate >= 80 ? 'text-green-700' : stats.rate >= 60 ? 'text-yellow-700' : 'text-red-700'}`}>
                    {stats.rate}%
                  </div>
                  <div className="text-sm text-slate-600">출석률</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      stats.rate >= 80 ? 'bg-green-500' : stats.rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${stats.rate}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Attendance Records */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-slate-900">출석 기록</h3>
            </div>

            {loadingRecords ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-2 border-[#00b6b2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-slate-500">출석 기록 로딩 중...</p>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                출석 기록이 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {Object.entries(groupedRecords)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([month, records]) => (
                    <div key={month}>
                      <div className="bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                        {formatMonth(month)}
                      </div>
                      <div className="divide-y divide-gray-50">
                        {records
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map(record => (
                            <div
                              key={record.id}
                              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50"
                            >
                              <div className="flex items-center gap-3">
                                {getStatusIcon(record.status)}
                                <div>
                                  <div className="font-medium text-slate-900">
                                    {formatDate(record.date)}
                                  </div>
                                  {record.note && (
                                    <div className="text-sm text-slate-500">
                                      {record.note}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${ATTENDANCE_STATUS_CONFIG[record.status]?.color}`}>
                                {ATTENDANCE_STATUS_CONFIG[record.status]?.label}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
