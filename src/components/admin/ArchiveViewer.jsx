import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Archive, Download, ChevronLeft, Users, BookOpen, Calendar, Trash2, AlertTriangle, X } from 'lucide-react';
import { getArchivedSeasons, getArchivedSeasonCourses, getArchivedSeasonEnrollments, getSeason, deleteArchivedSeasonData } from '../../lib/seasonService';
import { getStudent } from '../../lib/studentService';
import { getCourse } from '../../lib/courseService';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatDateTime, formatSchedule } from '../../lib/utils';
import { exportToExcel } from '../../lib/excelUtils';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ArchiveViewer() {
  const { admin } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSeasonId = searchParams.get('seasonId');
  
  const [archivedSeasons, setArchivedSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(initialSeasonId || '');
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('courses'); // courses, enrollments, students
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load archived seasons
  useEffect(() => {
    const loadArchivedSeasons = async () => {
      try {
        const seasons = await getArchivedSeasons();
        setArchivedSeasons(seasons);
        
        // If we have an initial season ID, select it
        if (initialSeasonId && seasons.find(s => s.id === initialSeasonId)) {
          setSelectedSeasonId(initialSeasonId);
        } else if (seasons.length > 0 && !selectedSeasonId) {
          setSelectedSeasonId(seasons[0].id);
        }
      } catch (error) {
        console.error('Failed to load archived seasons:', error);
      } finally {
        setLoading(false);
      }
    };

    loadArchivedSeasons();
  }, [initialSeasonId]);

  // Load data for selected season
  useEffect(() => {
    const loadSeasonData = async () => {
      if (!selectedSeasonId) {
        setCourses([]);
        setEnrollments([]);
        setSelectedSeason(null);
        return;
      }

      setDataLoading(true);
      try {
        const [season, coursesData, enrollmentsData] = await Promise.all([
          getSeason(selectedSeasonId),
          getArchivedSeasonCourses(selectedSeasonId),
          getArchivedSeasonEnrollments(selectedSeasonId)
        ]);
        
        setSelectedSeason(season);
        setCourses(coursesData);
        
        // Enrich enrollments with student and course data
        const enrichedEnrollments = await Promise.all(
          enrollmentsData.map(async (enrollment) => {
            const [student, course] = await Promise.all([
              getStudent(enrollment.studentId),
              getCourse(enrollment.courseId)
            ]);
            return {
              ...enrollment,
              student,
              course
            };
          })
        );
        
        setEnrollments(enrichedEnrollments);
      } catch (error) {
        console.error('Failed to load season data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadSeasonData();
  }, [selectedSeasonId]);

  // Get unique students from enrollments
  const uniqueStudents = [...new Map(
    enrollments
      .filter(e => e.student)
      .map(e => [e.studentId, e.student])
  ).values()];

  // Export functions
  const handleExportCourses = () => {
    const columns = [
      { key: 'title', header: '강좌명' },
      { key: 'instructor', header: '강사' },
      { key: 'category', header: '카테고리' },
      { key: 'schedule', header: '시간' },
      { key: 'room', header: '강의실' },
      { key: 'capacity', header: '정원' },
      { key: 'enrolled', header: '수강인원' },
    ];
    
    const data = courses.map(c => ({
      ...c,
      schedule: formatSchedule(c.day, c.startPeriod, c.endPeriod)
    }));
    
    exportToExcel(data, columns, `${selectedSeason?.name || '아카이브'}_강좌목록`);
  };

  const handleExportEnrollments = () => {
    const columns = [
      { key: 'studentName', header: '학생명' },
      { key: 'courseTitle', header: '강좌명' },
      { key: 'instructor', header: '강사' },
      { key: 'status', header: '상태' },
      { key: 'enrolledAt', header: '신청일' },
    ];
    
    const statusMap = {
      pending: '대기',
      approved: '승인',
      rejected: '반려',
      cancelled: '취소'
    };
    
    const data = enrollments.map(e => ({
      studentName: e.student?.name || e.studentId,
      courseTitle: e.course?.title || e.courseId,
      instructor: e.course?.instructor || '',
      status: statusMap[e.status] || e.status,
      enrolledAt: e.enrolledAt
    }));
    
    exportToExcel(data, columns, `${selectedSeason?.name || '아카이브'}_수강신청목록`);
  };

  const handleExportStudents = () => {
    const columns = [
      { key: 'name', header: '이름' },
      { key: 'phone', header: '전화번호' },
      { key: 'class', header: '반' },
      { key: 'enrollmentCount', header: '수강 강좌 수' },
    ];
    
    const data = uniqueStudents.map(student => ({
      name: student.name,
      phone: student.phone,
      class: student.class || '',
      enrollmentCount: enrollments.filter(e => e.studentId === student.id && e.status === 'approved').length
    }));
    
    exportToExcel(data, columns, `${selectedSeason?.name || '아카이브'}_수강생목록`);
  };

  const handleDeleteData = async () => {
    setDeleting(true);
    try {
      const result = await deleteArchivedSeasonData(selectedSeasonId);
      alert(`삭제 완료: 강좌 ${result.deletedCourses}개, 수강신청 ${result.deletedEnrollments}건`);
      setDeleteModal(false);
      
      // Reload data
      setCourses([]);
      setEnrollments([]);
      
      // Reload archived seasons
      const seasons = await getArchivedSeasons();
      setArchivedSeasons(seasons);
      
      // Update selected season
      const updatedSeason = await getSeason(selectedSeasonId);
      setSelectedSeason(updatedSeason);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제에 실패했습니다: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="아카이브 로딩 중..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/seasons"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Archive className="w-6 h-6 text-slate-600" />
            아카이브 뷰어
          </h1>
        </div>
        
        {/* Season Selector */}
        <div className="flex items-center gap-4">
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
          >
            <option value="">학기 선택</option>
            {archivedSeasons.map(season => (
              <option key={season.id} value={season.id}>
                {season.name} {season.dataDeleted ? '(데이터 삭제됨)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {archivedSeasons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Archive className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">아카이브된 학기가 없습니다.</p>
          <Link
            to="/admin/seasons"
            className="mt-4 inline-block text-[#00b6b2] font-medium hover:underline"
          >
            학기 관리로 돌아가기
          </Link>
        </div>
      ) : !selectedSeasonId ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">조회할 학기를 선택해주세요.</p>
        </div>
      ) : selectedSeason?.dataDeleted ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-2">이 학기의 데이터는 삭제되었습니다.</p>
          {selectedSeason.stats && (
            <div className="mt-4 inline-flex gap-6 text-sm text-slate-400">
              <span>강좌: {selectedSeason.stats.totalCourses}개</span>
              <span>수강생: {selectedSeason.stats.totalStudents}명</span>
              <span>승인된 수강: {selectedSeason.stats.approvedEnrollments}건</span>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Season Info */}
          {selectedSeason && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-700">{selectedSeason.name}</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {formatDate(selectedSeason.startDate)} ~ {formatDate(selectedSeason.endDate)}
                  </p>
                  {selectedSeason.archivedAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      아카이브 일시: {formatDateTime(selectedSeason.archivedAt)}
                    </p>
                  )}
                </div>
                {/* Stats */}
                {selectedSeason.stats && (
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-slate-700">{selectedSeason.stats.totalCourses}</div>
                      <div className="text-slate-500">강좌</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-slate-700">{selectedSeason.stats.totalStudents}</div>
                      <div className="text-slate-500">수강생</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-600">{selectedSeason.stats.approvedEnrollments}</div>
                      <div className="text-slate-500">승인된 수강</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Read-only Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              아카이브된 데이터는 읽기 전용입니다. 수정하려면 먼저 학기를 복원해주세요.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setActiveTab('courses')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'courses'
                  ? 'bg-[#00b6b2] text-white'
                  : 'bg-white border border-gray-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              강좌 ({courses.length})
            </button>
            <button
              onClick={() => setActiveTab('enrollments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'enrollments'
                  ? 'bg-[#00b6b2] text-white'
                  : 'bg-white border border-gray-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              수강신청 ({enrollments.length})
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                activeTab === 'students'
                  ? 'bg-[#00b6b2] text-white'
                  : 'bg-white border border-gray-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              수강생 ({uniqueStudents.length})
            </button>

            {/* Export and Delete buttons */}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  if (activeTab === 'courses') handleExportCourses();
                  else if (activeTab === 'enrollments') handleExportEnrollments();
                  else handleExportStudents();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                엑셀 다운로드
              </button>
              <button
                onClick={() => setDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                데이터 삭제
              </button>
            </div>
          </div>

          {/* Content */}
          {dataLoading ? (
            <LoadingSpinner message="데이터 로딩 중..." />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {activeTab === 'courses' && (
                <CoursesTable courses={courses} />
              )}
              {activeTab === 'enrollments' && (
                <EnrollmentsTable enrollments={enrollments} />
              )}
              {activeTab === 'students' && (
                <StudentsTable students={uniqueStudents} enrollments={enrollments} />
              )}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteDataModal
          season={selectedSeason}
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDeleteData}
          loading={deleting}
          courseCount={courses.length}
          enrollmentCount={enrollments.length}
        />
      )}
    </div>
  );
}

function CoursesTable({ courses }) {
  if (courses.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400">
        강좌 데이터가 없습니다.
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="bg-slate-50 text-slate-500 text-sm">
        <tr>
          <th className="text-left p-4 font-medium">강좌명</th>
          <th className="text-left p-4 font-medium">강사</th>
          <th className="text-left p-4 font-medium">카테고리</th>
          <th className="text-left p-4 font-medium">시간</th>
          <th className="text-left p-4 font-medium">강의실</th>
          <th className="text-left p-4 font-medium">수강현황</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {courses.map((course) => (
          <tr key={course.id} className="hover:bg-slate-50/50">
            <td className="p-4">
              <div className="font-medium text-slate-900">{course.title}</div>
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
            <td className="p-4 text-slate-600">{course.room}</td>
            <td className="p-4 text-slate-600">
              {course.enrolled}/{course.capacity}명
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EnrollmentsTable({ enrollments }) {
  if (enrollments.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400">
        수강신청 데이터가 없습니다.
      </div>
    );
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-600'
  };

  const statusLabels = {
    pending: '대기',
    approved: '승인',
    rejected: '반려',
    cancelled: '취소'
  };

  return (
    <table className="w-full">
      <thead className="bg-slate-50 text-slate-500 text-sm">
        <tr>
          <th className="text-left p-4 font-medium">학생</th>
          <th className="text-left p-4 font-medium">강좌</th>
          <th className="text-left p-4 font-medium">강사</th>
          <th className="text-left p-4 font-medium">상태</th>
          <th className="text-left p-4 font-medium">신청일</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {enrollments.map((enrollment) => (
          <tr key={enrollment.id} className="hover:bg-slate-50/50">
            <td className="p-4">
              <div className="font-medium text-slate-900">
                {enrollment.student?.name || enrollment.studentId}
              </div>
            </td>
            <td className="p-4">
              <div className="font-medium text-slate-900">
                {enrollment.course?.title || enrollment.courseId}
              </div>
            </td>
            <td className="p-4 text-slate-600">
              {enrollment.course?.instructor || '-'}
            </td>
            <td className="p-4">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[enrollment.status]}`}>
                {statusLabels[enrollment.status]}
              </span>
            </td>
            <td className="p-4 text-sm text-slate-600">
              {formatDateTime(enrollment.enrolledAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StudentsTable({ students, enrollments }) {
  if (students.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400">
        수강생 데이터가 없습니다.
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="bg-slate-50 text-slate-500 text-sm">
        <tr>
          <th className="text-left p-4 font-medium">이름</th>
          <th className="text-left p-4 font-medium">반</th>
          <th className="text-left p-4 font-medium">전화번호</th>
          <th className="text-left p-4 font-medium">승인된 수강</th>
          <th className="text-left p-4 font-medium">총 신청</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {students.map((student) => {
          const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
          const approvedCount = studentEnrollments.filter(e => e.status === 'approved').length;
          
          return (
            <tr key={student.id} className="hover:bg-slate-50/50">
              <td className="p-4">
                <div className="font-medium text-slate-900">{student.name}</div>
              </td>
              <td className="p-4 text-slate-600">{student.class || '-'}</td>
              <td className="p-4 text-slate-600">{student.phone}</td>
              <td className="p-4">
                <span className="font-medium text-green-600">{approvedCount}개</span>
              </td>
              <td className="p-4 text-slate-600">{studentEnrollments.length}건</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function DeleteDataModal({ season, onClose, onConfirm, loading, courseCount, enrollmentCount }) {
  const [confirmText, setConfirmText] = useState('');
  const expectedText = '데이터 삭제';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">아카이브 데이터 삭제</h2>
            <p className="text-sm text-slate-500">"{season?.name}"</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="font-medium text-red-800 mb-2">경고: 이 작업은 되돌릴 수 없습니다!</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• 강좌 {courseCount}개가 삭제됩니다.</li>
              <li>• 수강신청 {enrollmentCount}건이 삭제됩니다.</li>
              <li>• 학기 기록과 통계는 보존됩니다.</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              확인을 위해 "{expectedText}"를 입력해주세요
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder={expectedText}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || confirmText !== expectedText}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              '삭제 중...'
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                삭제하기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
