import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Briefcase, Users, Download, Upload, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { getAllCourses, createCourse, updateCourse, deleteCourse, batchCreateCourses } from '../../lib/courseService';
import { getAllSeasons } from '../../lib/seasonService';
import { getEnrollmentsByCourse } from '../../lib/enrollmentService';
import { getStudent } from '../../lib/studentService';
import { useAuth } from '../../contexts/AuthContext';
import { formatSchedule, formatDateTime } from '../../lib/utils';
import { CATEGORIES, LEVELS, DAYS, PERIODS } from '../../constants';
import { exportToExcel, exportAttendanceSheet, parseExcelFile, downloadTemplate } from '../../lib/excelUtils';
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
    const columns = [
      { key: 'title', header: '강좌명' },
      { key: 'instructor', header: '강사' },
      { key: 'category', header: '카테고리' },
      { key: 'schedule', header: '시간' },
      { key: 'room', header: '강의실' },
      { key: 'capacity', header: '정원' },
      { key: 'enrolled', header: '신청수' },
    ];
    
    const data = filteredCourses.map(c => ({
      ...c,
      schedule: formatSchedule(c.day, c.startPeriod, c.endPeriod)
    }));
    
    exportToExcel(data, columns, '강좌목록');
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
            {filteredCourses.map((course) => (
              <tr key={course.id} className="hover:bg-slate-50/50">
                <td className="p-4">
                  <div className="font-medium text-slate-900">{course.title}</div>
                  <div className="text-xs text-slate-500">{course.room}</div>
                </td>
                <td className="p-4 text-slate-600">{course.instructor}</td>
                <td className="p-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${course.color}`}>
                    {course.category}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-600">
                  {formatSchedule(course.day, course.startPeriod, course.endPeriod)}
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
                  </div>
                </td>
              </tr>
            ))}
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
          seasons={seasons}
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
          seasons={seasons}
          onClose={() => setShowBulkUploadModal(false)}
          onSuccess={() => {
            setShowBulkUploadModal(false);
            loadData();
          }}
          adminUid={admin.uid}
        />
      )}
    </div>
  );
}

function CourseModal({ course, seasons, onClose, onSuccess, adminUid }) {
  const [formData, setFormData] = useState({
    title: course?.title || '',
    instructor: course?.instructor || '',
    category: course?.category || '수학',
    level: course?.level || '중급',
    day: course?.day?.split('/') || [],
    startPeriod: course?.startPeriod || 1,
    endPeriod: course?.endPeriod || 2,
    room: course?.room || '',
    capacity: course?.capacity || 20,
    description: course?.description || '',
    seasonId: course?.seasonId || (seasons[0]?.id || ''),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = (day) => {
    setFormData(prev => {
      const days = prev.day.includes(day)
        ? prev.day.filter(d => d !== day)
        : [...prev.day, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
      return { ...prev, day: days };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.day.length === 0) {
      setError('수업 요일을 선택해주세요.');
      return;
    }
    if (parseInt(formData.startPeriod) > parseInt(formData.endPeriod)) {
      setError('종료 교시가 시작 교시보다 빠를 수 없습니다.');
      return;
    }
    if (!formData.seasonId) {
      setError('학기를 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const courseData = {
        ...formData,
        day: formData.day.join('/'),
        startPeriod: parseInt(formData.startPeriod),
        endPeriod: parseInt(formData.endPeriod),
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

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">수업 요일</label>
                <div className="flex gap-2">
                  {DAYS.map(day => (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                        formData.day.includes(day)
                          ? 'bg-[#00b6b2] text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">시작 교시</label>
                  <select
                    value={formData.startPeriod}
                    onChange={(e) => setFormData({ ...formData, startPeriod: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                  >
                    {PERIODS.map(p => (
                      <option key={p.id} value={p.id}>{p.id}교시 ({p.time})</option>
                    ))}
                  </select>
                </div>
                <span className="text-slate-400 pt-5">~</span>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">종료 교시</label>
                  <select
                    value={formData.endPeriod}
                    onChange={(e) => setFormData({ ...formData, endPeriod: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
                  >
                    {PERIODS.map(p => (
                      <option key={p.id} value={p.id}>{p.id}교시 ({p.time})</option>
                    ))}
                  </select>
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
      
      // 데이터 정규화
      const normalized = data.map(row => ({
        title: String(row['강좌명'] || row['title'] || '').trim(),
        instructor: String(row['강사'] || row['강사명'] || row['instructor'] || '').trim(),
        category: String(row['카테고리'] || row['과목'] || row['category'] || '수학').trim(),
        level: String(row['난이도'] || row['level'] || '중급').trim(),
        day: String(row['요일'] || row['day'] || '').trim(),
        startPeriod: parseInt(row['시작교시'] || row['startPeriod'] || 1),
        endPeriod: parseInt(row['종료교시'] || row['endPeriod'] || 2),
        room: String(row['강의실'] || row['room'] || '').trim(),
        capacity: parseInt(row['정원'] || row['capacity'] || 20),
        description: String(row['설명'] || row['description'] || '').trim(),
      })).filter(row => row.title && row.instructor);

      if (normalized.length === 0) {
        setError('유효한 데이터가 없습니다. 양식을 확인해주세요.');
        setLoading(false);
        return;
      }

      // 요일 형식 검증 및 변환 (월,화,수 -> 월/화/수)
      normalized.forEach(course => {
        if (course.day.includes(',')) {
          course.day = course.day.split(',').map(d => d.trim()).join('/');
        }
      });

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
    const columns = [
      { header: '강좌명', example: '고등 수학 심화' },
      { header: '강사', example: '김선생' },
      { header: '카테고리', example: '수학' },
      { header: '난이도', example: '중급' },
      { header: '요일', example: '월/수' },
      { header: '시작교시', example: '1' },
      { header: '종료교시', example: '2' },
      { header: '강의실', example: '301호' },
      { header: '정원', example: '20' },
      { header: '설명', example: '고등학교 수학 심화 과정' },
    ];
    downloadTemplate(columns, '강좌등록');
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
                  <li>• <strong>요일</strong>: 월/수 또는 월,수 형식 (여러 요일은 /나 ,로 구분)</li>
                  <li>• <strong>교시</strong>: 1~12 (숫자만)</li>
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
                        <th className="text-left p-3 font-medium text-slate-600 whitespace-nowrap">요일</th>
                        <th className="text-left p-3 font-medium text-slate-600 whitespace-nowrap">교시</th>
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
                          <td className="p-3 text-slate-600">{item.day}</td>
                          <td className="p-3 text-slate-600">{item.startPeriod}~{item.endPeriod}</td>
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
