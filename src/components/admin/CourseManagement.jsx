import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Briefcase, Users, Download, Upload, AlertTriangle, FileSpreadsheet, Calendar, CheckCircle2, XCircle, Clock, AlertCircle, Save, Lock } from 'lucide-react';
import { getAllCourses, createCourse, updateCourse, deleteCourse, batchCreateCourses } from '../../lib/courseService';
import { getAllSeasons, getNonArchivedSeasons } from '../../lib/seasonService';
import { getEnrollmentsByCourse } from '../../lib/enrollmentService';
import { getStudent } from '../../lib/studentService';
import { 
  bulkCheckAttendance, 
  getAttendanceByDate, 
  getAttendanceStats,
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_CONFIG 
} from '../../lib/attendanceService';
import { useAuth } from '../../contexts/AuthContext';
import { formatSchedule, formatSchedules, formatDateTime } from '../../lib/utils';
import { CATEGORIES, LEVELS, DAYS, PERIODS } from '../../constants';
import { exportToExcel, exportCoursesToExcel, exportAttendanceSheet, exportAttendanceData, parseExcelFile, downloadTemplate, downloadCourseTemplate, parseSchedulesFromExcel } from '../../lib/excelUtils';
import LoadingSpinner from '../common/LoadingSpinner';

export default function CourseManagement() {
  const { admin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showStudentsModal, setShowStudentsModal] = useState(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(null);

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

  useEffect(() => {
    loadData();
  }, []);

  const filteredCourses = courses.filter(course => 
    selectedSeason === 'all' || course.seasonId === selectedSeason
  );

  // Helper to check if a course belongs to an archived season
  const isSeasonArchived = (seasonId) => {
    const season = seasons.find(s => s.id === seasonId);
    return season?.isArchived === true;
  };

  // Get non-archived seasons for modals
  const nonArchivedSeasons = seasons.filter(s => !s.isArchived);

  const handleDelete = async (courseId, courseTitle) => {
    if (!confirm(`"${courseTitle}" 강좌를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteCourse(courseId);
      setCourses(courses.filter(c => c.id !== courseId));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleExportExcel = () => {
    exportCoursesToExcel(filteredCourses, '강좌목록');
  };

  if (loading) {
    return <LoadingSpinner message="강좌 목록 로딩 중..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-[#00b6b2]" />
          강좌 관리
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            엑셀 다운로드
          </button>
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            일괄 업로드
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] transition-colors"
          >
            <Plus className="w-4 h-4" />
            강좌 개설
          </button>
        </div>
      </div>

      {/* Season Filter */}
      <div className="mb-6">
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
        >
          <option value="all">전체 학기</option>
          {seasons.map(season => (
            <option key={season.id} value={season.id}>{season.name}</option>
          ))}
        </select>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-slate-500 text-sm">
            <tr>
              <th className="text-left p-4 font-medium">강좌명</th>
              <th className="text-left p-4 font-medium">강사</th>
              <th className="text-left p-4 font-medium">카테고리</th>
              <th className="text-left p-4 font-medium">시간</th>
              <th className="text-left p-4 font-medium">현황</th>
              <th className="text-right p-4 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCourses.map((course) => {
              const archived = isSeasonArchived(course.seasonId);
              return (
                <tr key={course.id} className={`hover:bg-slate-50/50 ${archived ? 'opacity-60' : ''}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{course.title}</span>
                      {archived && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-200 text-slate-500 text-xs rounded">
                          <Lock className="w-3 h-3" />
                          아카이브
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{course.room}</div>
                  </td>
                  <td className="p-4 text-slate-600">{course.instructor}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${course.color}`}>
                      {course.category}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {course.schedules ? formatSchedules(course.schedules) : formatSchedule(course.day, course.startPeriod, course.endPeriod)}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => setShowStudentsModal(course)}
                      className={`flex items-center gap-1 text-sm font-medium hover:underline ${
                        course.enrolled >= course.capacity ? 'text-red-500' : 'text-slate-600 hover:text-[#00b6b2]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {course.enrolled}/{course.capacity}명
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {archived ? (
                        <span className="text-xs text-slate-400 italic">읽기 전용</span>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowAttendanceModal(course)}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="출석 체크"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingCourse(course)}
                            className="p-2 text-slate-400 hover:text-[#00b6b2] hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id, course.title)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredCourses.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            개설된 강좌가 없습니다.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingCourse) && (
        <CourseModal
          course={editingCourse}
          seasons={nonArchivedSeasons}
          onClose={() => {
            setShowAddModal(false);
            setEditingCourse(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingCourse(null);
            loadData();
          }}
          adminUid={admin.uid}
        />
      )}

      {/* Course Students Modal (출석부) */}
      {showStudentsModal && (
        <CourseStudentsModal
          course={showStudentsModal}
          onClose={() => setShowStudentsModal(null)}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <CourseBulkUploadModal
          seasons={nonArchivedSeasons}
          onClose={() => setShowBulkUploadModal(false)}
          onSuccess={() => {
            setShowBulkUploadModal(false);
            loadData();
          }}
          adminUid={admin.uid}
        />
      )}

      {/* Quick Attendance Modal */}
      {showAttendanceModal && (
        <QuickAttendanceModal
          course={showAttendanceModal}
          adminUid={admin.uid}
          onClose={() => setShowAttendanceModal(null)}
        />
      )}
    </div>
  );
}

function CourseModal({ course, seasons, onClose, onSuccess, adminUid }) {
  // Initialize schedules from course or default
  const getInitialSchedules = () => {
    if (course?.schedules && course.schedules.length > 0) {
      return course.schedules.map(s => ({
        day: s.day,
        startPeriod: s.startPeriod,
        endPeriod: s.endPeriod,
      }));
    }
    // Fallback to legacy format
    if (course?.day) {
      const days = course.day.split('/');
      return days.map(day => ({
        day: day.trim(),
        startPeriod: course.startPeriod || 1,
        endPeriod: course.endPeriod || 2,
      }));
    }
    // Default: one empty schedule slot
    return [{ day: '월', startPeriod: 1, endPeriod: 2 }];
  };

  const [formData, setFormData] = useState({
    title: course?.title || '',
    instructor: course?.instructor || '',
    category: course?.category || '수학',
    level: course?.level || '중급',
    room: course?.room || '',
    capacity: course?.capacity || 20,
    description: course?.description || '',
    seasonId: course?.seasonId || (seasons[0]?.id || ''),
  });
  const [schedules, setSchedules] = useState(getInitialSchedules);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addScheduleSlot = () => {
    setSchedules([...schedules, { day: '월', startPeriod: 1, endPeriod: 2 }]);
  };

  const removeScheduleSlot = (index) => {
    if (schedules.length <= 1) {
      setError('최소 1개의 시간대가 필요합니다.');
      return;
    }
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateScheduleSlot = (index, field, value) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  const validateSchedules = () => {
    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      if (parseInt(s.startPeriod) > parseInt(s.endPeriod)) {
        return `시간대 ${i + 1}: 종료 교시가 시작 교시보다 빠를 수 없습니다.`;
      }
    }
    
    // Check for internal conflicts (same course schedules overlapping)
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const s1 = schedules[i];
        const s2 = schedules[j];
        if (s1.day === s2.day) {
          const overlap = parseInt(s1.startPeriod) <= parseInt(s2.endPeriod) && 
                          parseInt(s1.endPeriod) >= parseInt(s2.startPeriod);
          if (overlap) {
            return `시간대 ${i + 1}과 시간대 ${j + 1}이 같은 요일에 겹칩니다.`;
          }
        }
      }
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (schedules.length === 0) {
      setError('최소 1개의 시간대를 설정해주세요.');
      return;
    }

    const scheduleError = validateSchedules();
    if (scheduleError) {
      setError(scheduleError);
      return;
    }

    if (!formData.seasonId) {
      setError('학기를 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      // Prepare schedules with parsed integers
      const normalizedSchedules = schedules.map(s => ({
        day: s.day,
        startPeriod: parseInt(s.startPeriod),
        endPeriod: parseInt(s.endPeriod),
      }));

      const courseData = {
        ...formData,
        schedules: normalizedSchedules,
        capacity: parseInt(formData.capacity),
      };

      if (course) {
        await updateCourse(course.id, courseData);
      } else {
        await createCourse(courseData, adminUid);
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {course ? '강좌 수정' : '강좌 개설'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">학기</label>
                <select
                  value={formData.seasonId}
                  onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                  required
                >
                  <option value="">학기 선택</option>
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>{season.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">강좌명</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                  placeholder="고등 수학 심화"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">강사명</label>
                  <input
                    type="text"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">강의실</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                    placeholder="301호"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">카테고리</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                  >
                    {CATEGORIES.filter(c => c !== '전체').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">난이도</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                  >
                    {LEVELS.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column - Schedule Slots */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">수업 시간대</label>
                  <button
                    type="button"
                    onClick={addScheduleSlot}
                    className="flex items-center gap-1 text-xs text-[#00b6b2] hover:text-[#009da0] font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    시간대 추가
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[280px] overflow-y-auto">
                  {schedules.map((schedule, index) => (
                    <div key={index} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">시간대 {index + 1}</span>
                        {schedules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeScheduleSlot(index)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      
                      {/* Day selector */}
                      <div className="mb-2">
                        <label className="block text-xs text-slate-500 mb-1">요일</label>
                        <div className="flex gap-1">
                          {DAYS.map(day => (
                            <button
                              type="button"
                              key={day}
                              onClick={() => updateScheduleSlot(index, 'day', day)}
                              className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                                schedule.day === day
                                  ? 'bg-[#00b6b2] text-white'
                                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Period selectors */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-slate-500 mb-1">시작</label>
                          <select
                            value={schedule.startPeriod}
                            onChange={(e) => updateScheduleSlot(index, 'startPeriod', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                          >
                            {PERIODS.map(p => (
                              <option key={p.id} value={p.id}>{p.id}교시</option>
                            ))}
                          </select>
                        </div>
                        <span className="text-slate-400 pt-5">~</span>
                        <div className="flex-1">
                          <label className="block text-xs text-slate-500 mb-1">종료</label>
                          <select
                            value={schedule.endPeriod}
                            onChange={(e) => updateScheduleSlot(index, 'endPeriod', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                          >
                            {PERIODS.map(p => (
                              <option key={p.id} value={p.id}>{p.id}교시</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">정원</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                  min="1"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">강좌 설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2] h-24 resize-none"
              placeholder="강좌에 대한 설명을 입력하세요..."
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] disabled:opacity-50"
            >
              {loading ? '처리 중...' : (course ? '수정하기' : '개설하기')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CourseStudentsModal({ course, onClose }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const enrollments = await getEnrollmentsByCourse(course.id);
        
        // 각 enrollment에 대해 학생 정보 가져오기
        const enriched = await Promise.all(
          enrollments.map(async (enrollment) => {
            const student = await getStudent(enrollment.studentId);
            return { 
              ...enrollment, 
              student,
              name: student?.name || enrollment.studentId,
              class: student?.class || '' // 반 정보 (추후 추가)
            };
          })
        );
        
        // 이름순 정렬
        enriched.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        setStudents(enriched);
      } catch (error) {
        console.error('Failed to load students:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [course.id]);

  const handleExportAttendance = () => {
    const studentData = students.map(s => ({
      name: s.name,
      class: s.class || ''
    }));
    exportAttendanceSheet(studentData, course.title);
  };

  const approvedStudents = students.filter(s => s.status === 'approved');
  const pendingStudents = students.filter(s => s.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{course.title}</h2>
              <p className="text-sm text-slate-500">
                수강생 {approvedStudents.length}명 | 대기 {pendingStudents.length}명
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAttendance}
              disabled={approvedStudents.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              출석부 다운로드
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[#00b6b2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-500">수강생 목록 로딩 중...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              수강 신청한 학생이 없습니다.
            </div>
          ) : (
            <div className="space-y-6">
              {/* 수강 확정 학생 */}
              {approvedStudents.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    수강 확정 ({approvedStudents.length}명)
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 font-medium text-slate-600 w-16">번호</th>
                          <th className="text-left p-3 font-medium text-slate-600 w-24">반</th>
                          <th className="text-left p-3 font-medium text-slate-600">이름</th>
                          <th className="text-left p-3 font-medium text-slate-600">신청일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {approvedStudents.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-500">{idx + 1}</td>
                            <td className="p-3 text-slate-500">{item.class || '-'}</td>
                            <td className="p-3 font-medium text-slate-900">{item.name}</td>
                            <td className="p-3 text-slate-500 text-xs">
                              {formatDateTime(item.enrolledAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 신청 대기 학생 */}
              {pendingStudents.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-yellow-700 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    신청 대기 ({pendingStudents.length}명)
                  </h3>
                  <div className="border border-yellow-200 rounded-xl overflow-hidden bg-yellow-50">
                    <table className="w-full text-sm">
                      <thead className="bg-yellow-100">
                        <tr>
                          <th className="text-left p-3 font-medium text-yellow-700 w-16">번호</th>
                          <th className="text-left p-3 font-medium text-yellow-700 w-24">반</th>
                          <th className="text-left p-3 font-medium text-yellow-700">이름</th>
                          <th className="text-left p-3 font-medium text-yellow-700">신청일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-yellow-200">
                        {pendingStudents.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-yellow-100/50">
                            <td className="p-3 text-yellow-600">{idx + 1}</td>
                            <td className="p-3 text-yellow-600">{item.class || '-'}</td>
                            <td className="p-3 font-medium text-yellow-800">{item.name}</td>
                            <td className="p-3 text-yellow-600 text-xs">
                              {formatDateTime(item.enrolledAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseBulkUploadModal({ seasons, onClose, onSuccess, adminUid }) {
  const [step, setStep] = useState('upload'); // upload, preview, result
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasons[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setLoading(true);

    try {
      const data = await parseExcelFile(selectedFile);
      
      // 데이터 정규화 (다중 시간대 지원)
      const normalized = data.map(row => {
        // Parse schedules using the new parser
        const schedules = parseSchedulesFromExcel(row);
        
        return {
          title: String(row['강좌명'] || row['title'] || '').trim(),
          instructor: String(row['강사'] || row['강사명'] || row['instructor'] || '').trim(),
          category: String(row['카테고리'] || row['과목'] || row['category'] || '수학').trim(),
          level: String(row['난이도'] || row['level'] || '중급').trim(),
          schedules: schedules,
          room: String(row['강의실'] || row['room'] || '').trim(),
          capacity: parseInt(row['정원'] || row['capacity'] || 20),
          description: String(row['설명'] || row['description'] || '').trim(),
        };
      }).filter(row => row.title && row.instructor && row.schedules.length > 0);

      if (normalized.length === 0) {
        setError('유효한 데이터가 없습니다. 양식을 확인해주세요. (강좌명, 강사, 시간표 필수)');
        setLoading(false);
        return;
      }

      // 카테고리 검증
      const validCategories = CATEGORIES.filter(c => c !== '전체');
      normalized.forEach(course => {
        if (!validCategories.includes(course.category)) {
          course.category = '수학'; // 기본값
        }
      });

      // 난이도 검증
      normalized.forEach(course => {
        if (!LEVELS.includes(course.level)) {
          course.level = '중급'; // 기본값
        }
      });

      setParsedData(normalized);
      setStep('preview');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCourseTemplate();
  };

  const handleSubmit = async () => {
    if (!selectedSeasonId) {
      setError('학기를 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const results = await batchCreateCourses(parsedData, adminUid, selectedSeasonId);
      setResults(results);
      setStep('result');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const successCount = results?.filter(r => r.success).length || 0;
  const failCount = results?.filter(r => !r.success).length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">강좌 일괄 업로드</h2>
              <p className="text-sm text-slate-500">
                {step === 'upload' && '엑셀 파일을 업로드해주세요'}
                {step === 'preview' && '업로드할 데이터를 확인해주세요'}
                {step === 'result' && '업로드 결과'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* 학기 선택 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  강좌를 등록할 학기 선택
                </label>
                <select
                  value={selectedSeasonId}
                  onChange={(e) => setSelectedSeasonId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                >
                  <option value="">학기 선택</option>
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>{season.name}</option>
                  ))}
                </select>
              </div>

              <div 
                className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-[#00b6b2] transition-colors cursor-pointer"
                onClick={() => document.getElementById('course-excel-file-input').click()}
              >
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-2">
                  클릭하거나 파일을 드래그하여 업로드
                </p>
                <p className="text-sm text-slate-400">
                  .xlsx, .xls 파일 지원
                </p>
                <input
                  id="course-excel-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 text-sm text-[#00b6b2] hover:text-[#009da0] font-medium"
                >
                  <Download className="w-4 h-4" />
                  양식 다운로드
                </button>
              </div>

              {/* 양식 안내 */}
              <div className="bg-slate-50 rounded-xl p-4 text-sm">
                <h4 className="font-medium text-slate-700 mb-2">엑셀 양식 안내</h4>
                <ul className="text-slate-500 space-y-1">
                  <li>• <strong>카테고리</strong>: 국어, 수학, 영어, 과탐, 사탐, 수리논술, 인문논술</li>
                  <li>• <strong>난이도</strong>: 초급, 중급, 고급, 실전</li>
                  <li>• <strong>시간표</strong>: "화 1~2, 수 3~4" 형식 (다중 시간대 지원)</li>
                  <li>• <strong>레거시 형식</strong>: 요일/시작교시/종료교시 컬럼도 지원</li>
                  <li>• <strong>교시</strong>: 1~12</li>
                </ul>
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-4 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {loading && (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-[#00b6b2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-slate-500">파일 분석 중...</p>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="flex gap-4">
                <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{parsedData.length}</div>
                  <div className="text-sm text-blue-600">등록 예정 강좌</div>
                </div>
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <div className="text-lg font-bold text-slate-700">
                    {seasons.find(s => s.id === selectedSeasonId)?.name || '-'}
                  </div>
                  <div className="text-sm text-slate-600">등록 학기</div>
                </div>
              </div>

              {/* Data table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 font-medium text-slate-600 whitespace-nowrap">강좌명</th>
                        <th className="text-left p-3 font-medium text-slate-600 whitespace-nowrap">강사</th>
                        <th className="text-left p-3 font-medium text-slate-600 whitespace-nowrap">카테고리</th>
                        <th className="text-left p-3 font-medium text-slate-600 whitespace-nowrap">시간표</th>
                        <th className="text-left p-3 font-medium text-slate-600 whitespace-nowrap">강의실</th>
                        <th className="text-left p-3 font-medium text-slate-600 whitespace-nowrap">정원</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-900">{item.title}</td>
                          <td className="p-3 text-slate-600">{item.instructor}</td>
                          <td className="p-3">
                            <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{formatSchedules(item.schedules)}</td>
                          <td className="p-3 text-slate-600">{item.room || '-'}</td>
                          <td className="p-3 text-slate-600">{item.capacity}명</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && results && (
            <div className="space-y-6">
              {/* Result summary */}
              <div className="flex gap-4">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{successCount}</div>
                  <div className="text-sm text-green-600">등록 성공</div>
                </div>
                <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{failCount}</div>
                  <div className="text-sm text-red-600">등록 실패</div>
                </div>
              </div>

              {/* Detail list */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium text-slate-600">강좌명</th>
                      <th className="text-left p-3 font-medium text-slate-600">결과</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((result, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-medium text-slate-900">{result.title}</td>
                        <td className="p-3">
                          {result.success ? (
                            <span className="text-green-600">등록 완료</span>
                          ) : (
                            <span className="text-red-600">{result.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          {step === 'upload' && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
            >
              취소
            </button>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
              >
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !selectedSeasonId}
                className="flex-1 py-2.5 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] disabled:opacity-50"
              >
                {loading ? '처리 중...' : `${parsedData.length}개 강좌 등록하기`}
              </button>
            </>
          )}
          {step === 'result' && (
            <button
              onClick={onSuccess}
              className="flex-1 py-2.5 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0]"
            >
              완료
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAttendanceModal({ course, adminUid, onClose }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const enrollments = await getEnrollmentsByCourse(course.id);
        const approvedEnrollments = enrollments.filter(e => e.status === 'approved');
        
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
        
        enrichedStudents.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        setStudents(enrichedStudents);

        const existingAttendance = await getAttendanceByDate(course.id, selectedDate);
        const attendanceMap = {};
        existingAttendance.forEach(record => {
          attendanceMap[record.studentId] = { status: record.status, note: record.note || '' };
        });
        setAttendanceData(attendanceMap);

        const courseStats = await getAttendanceStats(course.id);
        setStats(courseStats);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [course.id, selectedDate]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  };

  const handleNoteChange = (studentId, note) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: { ...prev[studentId], note } }));
  };

  const handleBulkAction = (status) => {
    const newAttendance = {};
    students.forEach(student => {
      newAttendance[student.studentId] = { status, note: attendanceData[student.studentId]?.note || '' };
    });
    setAttendanceData(newAttendance);
  };

  const handleSave = async () => {
    if (students.length === 0) return;
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

      await bulkCheckAttendance(course.id, selectedDate, attendanceList, adminUid);
      const courseStats = await getAttendanceStats(course.id);
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
    if (students.length === 0) return;
    const exportData = students.map((student, idx) => ({
      번호: idx + 1,
      반: student.class || '-',
      이름: student.name,
      날짜: selectedDate,
      상태: ATTENDANCE_STATUS_CONFIG[attendanceData[student.studentId]?.status]?.label || '-',
      비고: attendanceData[student.studentId]?.note || '',
    }));
    exportAttendanceData(exportData, course.title, selectedDate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{course.title}</h2>
              <p className="text-sm text-slate-500">출석 체크</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 border-b border-gray-100 bg-slate-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">날짜</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00b6b2]" />
              </div>
              {stats && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-600">출석 {stats.present}</span>
                  <span className="text-red-600">결석 {stats.absent}</span>
                  <span className="text-yellow-600">지각 {stats.late}</span>
                  <span className="text-blue-600">사유 {stats.excused}</span>
                  <span className="text-slate-600 font-medium">({stats.rate}%)</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleBulkAction(ATTENDANCE_STATUS.PRESENT)} className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200">전체 출석</button>
              <button onClick={() => handleBulkAction(ATTENDANCE_STATUS.ABSENT)} className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200">전체 결석</button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-[#00b6b2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-500">로딩 중...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-400">수강 확정된 학생이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-500 text-sm sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium w-12">번호</th>
                  <th className="text-left p-3 font-medium w-20">반</th>
                  <th className="text-left p-3 font-medium">이름</th>
                  <th className="text-center p-3 font-medium">출석 상태</th>
                  <th className="text-left p-3 font-medium">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student, idx) => (
                  <tr key={student.studentId} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-500 text-sm">{idx + 1}</td>
                    <td className="p-3 text-slate-500 text-sm">{student.class || '-'}</td>
                    <td className="p-3 font-medium text-slate-900">{student.name}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleStatusChange(student.studentId, ATTENDANCE_STATUS.PRESENT)}
                          className={`p-1.5 rounded-lg transition-all ${attendanceData[student.studentId]?.status === ATTENDANCE_STATUS.PRESENT ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title="출석">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleStatusChange(student.studentId, ATTENDANCE_STATUS.ABSENT)}
                          className={`p-1.5 rounded-lg transition-all ${attendanceData[student.studentId]?.status === ATTENDANCE_STATUS.ABSENT ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title="결석">
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleStatusChange(student.studentId, ATTENDANCE_STATUS.LATE)}
                          className={`p-1.5 rounded-lg transition-all ${attendanceData[student.studentId]?.status === ATTENDANCE_STATUS.LATE ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title="지각">
                          <Clock className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleStatusChange(student.studentId, ATTENDANCE_STATUS.EXCUSED)}
                          className={`p-1.5 rounded-lg transition-all ${attendanceData[student.studentId]?.status === ATTENDANCE_STATUS.EXCUSED ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title="사유">
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <input type="text" placeholder="비고..." value={attendanceData[student.studentId]?.note || ''} onChange={(e) => handleNoteChange(student.studentId, e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00b6b2]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <button onClick={handleExport} disabled={students.length === 0} className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 text-slate-600 rounded-xl hover:bg-slate-50 disabled:opacity-50">
            <Download className="w-4 h-4" />엑셀 다운로드
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50">닫기</button>
            <button onClick={handleSave} disabled={saving || students.length === 0} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] disabled:opacity-50">
              <Save className="w-4 h-4" />{saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
