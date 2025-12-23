import { useState, useEffect } from 'react';
import { Calendar, Users, Check, X, Clock, FileText, Download, Save, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { getAllCourses } from '../../lib/courseService';
import { getAllSeasons } from '../../lib/seasonService';
import { getEnrollmentsByCourse } from '../../lib/enrollmentService';
import { getStudent } from '../../lib/studentService';
import { 
  bulkCheckAttendance, 
  getAttendanceByDate, 
  getAttendanceStats,
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_CONFIG 
} from '../../lib/attendanceService';
import { exportAttendanceData } from '../../lib/excelUtils';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

export default function AttendancePage() {
  const { admin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Load courses and seasons
  useEffect(() => {
    const loadData = async () => {
      try {
        const [coursesData, seasonsData] = await Promise.all([
          getAllCourses(),
          getAllSeasons(),
        ]);
        setCourses(coursesData);
        setSeasons(seasonsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter courses by season
  const filteredCourses = courses.filter(course => 
    selectedSeason === 'all' || course.seasonId === selectedSeason
  );

  // Load students and attendance when course or date changes
  useEffect(() => {
    if (!selectedCourse) {
      setStudents([]);
      setAttendanceData({});
      setStats(null);
      return;
    }

    const loadStudentsAndAttendance = async () => {
      setLoadingStudents(true);
      try {
        // Get enrolled students
        const enrollments = await getEnrollmentsByCourse(selectedCourse.id);
        const approvedEnrollments = enrollments.filter(e => e.status === 'approved');
        
        // Enrich with student info
        const enrichedStudents = await Promise.all(
          approvedEnrollments.map(async (enrollment) => {
            const student = await getStudent(enrollment.studentId);
            return {
              ...enrollment,
              student,
              name: student?.name || enrollment.studentId,
              class: student?.class || '',
            };
          })
        );
        
        // Sort by name
        enrichedStudents.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        setStudents(enrichedStudents);

        // Get existing attendance for this date
        const existingAttendance = await getAttendanceByDate(selectedCourse.id, selectedDate);
        const attendanceMap = {};
        existingAttendance.forEach(record => {
          attendanceMap[record.studentId] = {
            status: record.status,
            note: record.note || '',
          };
        });
        setAttendanceData(attendanceMap);

        // Get course attendance stats
        const courseStats = await getAttendanceStats(selectedCourse.id);
        setStats(courseStats);
      } catch (error) {
        console.error('Failed to load students:', error);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudentsAndAttendance();
  }, [selectedCourse, selectedDate]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleNoteChange = (studentId, note) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }));
  };

  const handleBulkAction = (status) => {
    const newAttendance = {};
    students.forEach(student => {
      newAttendance[student.studentId] = {
        status,
        note: attendanceData[student.studentId]?.note || '',
      };
    });
    setAttendanceData(newAttendance);
  };

  const handleSave = async () => {
    if (!selectedCourse || students.length === 0) return;

    setSaving(true);
    try {
      const attendanceList = students
        .filter(student => attendanceData[student.studentId]?.status)
        .map(student => ({
          studentId: student.studentId,
          status: attendanceData[student.studentId].status,
          note: attendanceData[student.studentId].note || '',
        }));

      if (attendanceList.length === 0) {
        alert('저장할 출석 데이터가 없습니다.');
        setSaving(false);
        return;
      }

      await bulkCheckAttendance(selectedCourse.id, selectedDate, attendanceList, admin.uid);
      
      // Refresh stats
      const courseStats = await getAttendanceStats(selectedCourse.id);
      setStats(courseStats);
      
      alert('출석 정보가 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save attendance:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!selectedCourse || students.length === 0) return;

    const exportData = students.map((student, idx) => ({
      번호: idx + 1,
      반: student.class || '-',
      이름: student.name,
      날짜: selectedDate,
      상태: ATTENDANCE_STATUS_CONFIG[attendanceData[student.studentId]?.status]?.label || '-',
      비고: attendanceData[student.studentId]?.note || '',
    }));

    exportAttendanceData(exportData, selectedCourse.title, selectedDate);
  };

  if (loading) {
    return <LoadingSpinner message="데이터 로딩 중..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-[#00b6b2]" />
          출석 체크
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Season Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">학기</label>
            <select
              value={selectedSeason}
              onChange={(e) => {
                setSelectedSeason(e.target.value);
                setSelectedCourse(null);
              }}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
            >
              <option value="all">전체 학기</option>
              {seasons.map(season => (
                <option key={season.id} value={season.id}>{season.name}</option>
              ))}
            </select>
          </div>

          {/* Course Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">강좌 선택</label>
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const course = filteredCourses.find(c => c.id === e.target.value);
                setSelectedCourse(course || null);
              }}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
            >
              <option value="">강좌를 선택하세요</option>
              {filteredCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title} ({course.instructor})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">날짜</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
            />
          </div>
        </div>
      </div>

      {/* Stats Card */}
      {stats && selectedCourse && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">강좌 출석 통계</h3>
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
              <div className="text-2xl font-bold text-slate-700">{stats.rate}%</div>
              <div className="text-sm text-slate-600">출석률</div>
            </div>
          </div>
        </div>
      )}

      {/* Student List */}
      {selectedCourse && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Actions Bar */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">일괄 처리:</span>
              <button
                onClick={() => handleBulkAction(ATTENDANCE_STATUS.PRESENT)}
                className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                전체 출석
              </button>
              <button
                onClick={() => handleBulkAction(ATTENDANCE_STATUS.ABSENT)}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                전체 결석
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={students.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 text-slate-600 rounded-xl hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                엑셀 다운로드
              </button>
              <button
                onClick={handleSave}
                disabled={saving || students.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#00b6b2] text-white rounded-xl hover:bg-[#009da0] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          {loadingStudents ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-[#00b6b2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-500">학생 목록 로딩 중...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              수강 확정된 학생이 없습니다.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-500 text-sm">
                <tr>
                  <th className="text-left p-4 font-medium w-16">번호</th>
                  <th className="text-left p-4 font-medium w-24">반</th>
                  <th className="text-left p-4 font-medium">이름</th>
                  <th className="text-center p-4 font-medium">출석 상태</th>
                  <th className="text-left p-4 font-medium">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student, idx) => (
                  <tr key={student.studentId} className="hover:bg-slate-50/50">
                    <td className="p-4 text-slate-500">{idx + 1}</td>
                    <td className="p-4 text-slate-500">{student.class || '-'}</td>
                    <td className="p-4 font-medium text-slate-900">{student.name}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <StatusButton
                          status={ATTENDANCE_STATUS.PRESENT}
                          currentStatus={attendanceData[student.studentId]?.status}
                          onClick={() => handleStatusChange(student.studentId, ATTENDANCE_STATUS.PRESENT)}
                          icon={<CheckCircle2 className="w-4 h-4" />}
                          label="출석"
                          activeClass="bg-green-500 text-white"
                        />
                        <StatusButton
                          status={ATTENDANCE_STATUS.ABSENT}
                          currentStatus={attendanceData[student.studentId]?.status}
                          onClick={() => handleStatusChange(student.studentId, ATTENDANCE_STATUS.ABSENT)}
                          icon={<XCircle className="w-4 h-4" />}
                          label="결석"
                          activeClass="bg-red-500 text-white"
                        />
                        <StatusButton
                          status={ATTENDANCE_STATUS.LATE}
                          currentStatus={attendanceData[student.studentId]?.status}
                          onClick={() => handleStatusChange(student.studentId, ATTENDANCE_STATUS.LATE)}
                          icon={<Clock className="w-4 h-4" />}
                          label="지각"
                          activeClass="bg-yellow-500 text-white"
                        />
                        <StatusButton
                          status={ATTENDANCE_STATUS.EXCUSED}
                          currentStatus={attendanceData[student.studentId]?.status}
                          onClick={() => handleStatusChange(student.studentId, ATTENDANCE_STATUS.EXCUSED)}
                          icon={<AlertCircle className="w-4 h-4" />}
                          label="사유"
                          activeClass="bg-blue-500 text-white"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <input
                        type="text"
                        placeholder="비고 입력..."
                        value={attendanceData[student.studentId]?.note || ''}
                        onChange={(e) => handleNoteChange(student.studentId, e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!selectedCourse && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400">강좌를 선택하여 출석을 체크하세요.</p>
        </div>
      )}
    </div>
  );
}

function StatusButton({ status, currentStatus, onClick, icon, label, activeClass }) {
  const isActive = currentStatus === status;
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? activeClass
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
