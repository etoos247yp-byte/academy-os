import { useState, useEffect } from 'react';
import { Plus, Search, ToggleLeft, ToggleRight, Calendar, Trash2, Edit2, X, Check, Upload, Download, AlertTriangle, FileSpreadsheet, History, CalendarDays, Printer, Image, Users, Wand2, CheckSquare, Square, Filter } from 'lucide-react';
import html2canvas from 'html2canvas';
import { 
  getAllStudents, 
  createStudent, 
  updateStudent, 
  deleteStudent,
  setEnrollmentStatus,
  setChangePeriod,
  batchSetEnrollmentStatus,
  batchCreateStudents,
  checkBatchDuplicates
} from '../../lib/studentService';
import { getStudentAllEnrollments, getStudentEnrollments } from '../../lib/enrollmentService';
import { getCourse } from '../../lib/courseService';
import { 
  getActiveClasses, 
  batchAssignStudentsToClass, 
  batchRemoveStudentsFromClass,
  autoAssignStudents,
  executeAutoAssignment
} from '../../lib/classService';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatDateTime } from '../../lib/utils';
import { STATUS_CONFIG, ENROLLMENT_STATUS } from '../../constants';
import { exportToExcel, parseExcelFile, downloadTemplate } from '../../lib/excelUtils';
import { BigSchedule } from '../student/WeeklySchedule';
import LoadingSpinner from '../common/LoadingSpinner';

export default function StudentManagement() {
  const { admin } = useAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all'); // 'all', 'unassigned', or specific class name
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showChangePeriodModal, setShowChangePeriodModal] = useState(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showBulkAutoAssignModal, setShowBulkAutoAssignModal] = useState(false);
  
  // Bulk selection
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const loadData = async () => {
    try {
      const [studentsData, classesData] = await Promise.all([
        getAllStudents(),
        getActiveClasses()
      ]);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Get unique class names from students for filter
  const uniqueClassNames = [...new Set(students.map(s => s.class).filter(Boolean))].sort();

  const filteredStudents = students
    .filter(student => {
      // Search filter
      const matchesSearch = 
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.phone.includes(searchQuery);
      
      // Class filter
      let matchesClass = true;
      if (classFilter === 'unassigned') {
        matchesClass = !student.class;
      } else if (classFilter !== 'all') {
        matchesClass = student.class === classFilter;
      }
      
      return matchesSearch && matchesClass;
    })
    // Sort by class first, then by name
    .sort((a, b) => {
      // Unassigned students go last
      if (!a.class && b.class) return 1;
      if (a.class && !b.class) return -1;
      // Sort by class name
      if (a.class !== b.class) {
        return (a.class || '').localeCompare(b.class || '', 'ko');
      }
      // Then sort by name
      return a.name.localeCompare(b.name, 'ko');
    });

  const handleToggleEnrollment = async (studentId, currentStatus) => {
    try {
      await setEnrollmentStatus(studentId, !currentStatus);
      setStudents(students.map(s => 
        s.id === studentId ? { ...s, enrollmentOpen: !currentStatus } : s
      ));
    } catch (error) {
      console.error('Failed to toggle enrollment:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleBatchToggle = async (isOpen) => {
    const targetIds = selectMode && selectedStudents.size > 0 
      ? Array.from(selectedStudents)
      : filteredStudents.map(s => s.id);
    
    if (targetIds.length === 0) return;
    
    if (!confirm(`${targetIds.length}명의 학생 수강신청을 ${isOpen ? '열겠' : '닫겠'}습니까?`)) {
      return;
    }

    try {
      await batchSetEnrollmentStatus(targetIds, isOpen);
      loadData();
      setSelectedStudents(new Set());
    } catch (error) {
      console.error('Batch toggle failed:', error);
      alert('일괄 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (studentId, studentName) => {
    if (!confirm(`"${studentName}" 학생을 삭제하시겠습니까?\n관련된 모든 수강 신청도 함께 삭제됩니다.`)) {
      return;
    }

    try {
      await deleteStudent(studentId);
      setStudents(students.filter(s => s.id !== studentId));
      selectedStudents.delete(studentId);
      setSelectedStudents(new Set(selectedStudents));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.size === 0) return;
    
    if (!confirm(`선택된 ${selectedStudents.size}명의 학생을 삭제하시겠습니까?\n관련된 모든 수강 신청도 함께 삭제됩니다.`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedStudents).map(id => deleteStudent(id));
      await Promise.all(deletePromises);
      loadData();
      setSelectedStudents(new Set());
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('일괄 삭제에 실패했습니다.');
    }
  };

  const handleBulkRemoveFromClass = async () => {
    if (selectedStudents.size === 0) return;
    
    if (!confirm(`선택된 ${selectedStudents.size}명의 학생을 반에서 제외하시겠습니까?`)) {
      return;
    }

    try {
      await batchRemoveStudentsFromClass(Array.from(selectedStudents));
      loadData();
      setSelectedStudents(new Set());
    } catch (error) {
      console.error('Bulk remove from class failed:', error);
      alert('일괄 제외에 실패했습니다.');
    }
  };

  const handleExportExcel = () => {
    const columns = [
      { key: 'name', header: '이름' },
      { key: 'class', header: '반' },
      { key: 'phone', header: '전화번호 뒷자리' },
      { key: 'birthDate', header: '생년월일' },
      { key: 'enrollmentStatus', header: '수강신청 상태' },
    ];
    
    const data = filteredStudents.map(s => ({
      ...s,
      class: s.class || '',
      enrollmentStatus: s.enrollmentOpen ? '열림' : '닫힘'
    }));
    
    exportToExcel(data, columns, '학생목록');
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleSelectStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedStudents(new Set());
    }
  };

  if (loading) {
    return <LoadingSpinner message="학생 목록 로딩 중..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">학생 관리</h1>
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
            학생 등록
          </button>
        </div>
      </div>

      {/* Search, Filter and Batch Actions */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="이름 또는 전화번호로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
            />
          </div>
          
          {/* Class Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
            >
              <option value="all">전체 반</option>
              <option value="unassigned">미배정</option>
              {uniqueClassNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Batch Actions Row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleSelectMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
              selectMode 
                ? 'bg-[#00b6b2] text-white' 
                : 'bg-white border border-gray-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            {selectMode ? '선택 모드 해제' : '선택 모드'}
          </button>
          
          {selectMode && (
            <>
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-white border border-gray-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                {selectedStudents.size === filteredStudents.length ? '전체 해제' : '전체 선택'}
              </button>
              
              <span className="text-sm text-slate-500 px-2">
                {selectedStudents.size}명 선택됨
              </span>
              
              {selectedStudents.size > 0 && (
                <>
                  <button
                    onClick={() => setShowBulkAssignModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    반 배정
                  </button>
                  <button
                    onClick={() => setShowBulkAutoAssignModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 transition-colors"
                  >
                    <Wand2 className="w-4 h-4" />
                    여러 반 배정
                  </button>
                  <button
                    onClick={handleBulkRemoveFromClass}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-xl font-medium hover:bg-orange-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    반 제외
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                </>
              )}
            </>
          )}
          
          <div className="flex-1" />
          
          <button
            onClick={() => setShowAutoAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            자동 배정
          </button>
          
          <button
            onClick={() => handleBatchToggle(true)}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition-colors"
          >
            수강신청 열기
          </button>
          <button
            onClick={() => handleBatchToggle(false)}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors"
          >
            수강신청 닫기
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-slate-500 text-sm">
            <tr>
              {selectMode && (
                <th className="w-12 p-4">
                  <button onClick={handleSelectAll}>
                    {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-[#00b6b2]" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </th>
              )}
              <th className="text-left p-4 font-medium">반</th>
              <th className="text-left p-4 font-medium">이름</th>
              <th className="text-left p-4 font-medium">전화번호 뒷자리</th>
              <th className="text-left p-4 font-medium">생년월일</th>
              <th className="text-left p-4 font-medium">수강신청</th>
              <th className="text-left p-4 font-medium">변경기간</th>
              <th className="text-right p-4 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStudents.map((student) => (
              <tr 
                key={student.id} 
                className={`hover:bg-slate-50/50 ${selectedStudents.has(student.id) ? 'bg-[#00b6b2]/5' : ''}`}
              >
                {selectMode && (
                  <td className="p-4">
                    <button onClick={() => handleSelectStudent(student.id)}>
                      {selectedStudents.has(student.id) ? (
                        <CheckSquare className="w-5 h-5 text-[#00b6b2]" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  </td>
                )}
                <td className="p-4">
                  {student.class ? (
                    <span className="inline-flex px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                      {student.class}
                    </span>
                  ) : (
                    <span className="text-slate-400">미배정</span>
                  )}
                </td>
                <td className="p-4 font-medium text-slate-900">{student.name}</td>
                <td className="p-4 text-slate-600">{student.phone}</td>
                <td className="p-4 text-slate-600">{student.birthDate || '-'}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleToggleEnrollment(student.id, student.enrollmentOpen)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      student.enrollmentOpen
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {student.enrollmentOpen ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        열림
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        닫힘
                      </>
                    )}
                  </button>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => setShowChangePeriodModal(student)}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#00b6b2]"
                  >
                    <Calendar className="w-4 h-4" />
                    {student.changeStartDate && student.changeEndDate
                      ? `${formatDate(student.changeStartDate)} ~ ${formatDate(student.changeEndDate)}`
                      : '설정하기'}
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setShowScheduleModal(student)}
                      className="p-2 text-slate-400 hover:text-[#00b6b2] hover:bg-slate-100 rounded-lg transition-colors"
                      title="시간표"
                    >
                      <CalendarDays className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingStudent(student)}
                      className="p-2 text-slate-400 hover:text-[#00b6b2] hover:bg-slate-100 rounded-lg transition-colors"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowHistoryModal(student)}
                      className="p-2 text-slate-400 hover:text-[#00b6b2] hover:bg-slate-100 rounded-lg transition-colors"
                      title="신청 이력"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(student.id, student.name)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredStudents.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            {searchQuery || classFilter !== 'all' ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <AddStudentModal
          classes={classes}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
          adminUid={admin.uid}
        />
      )}

      {/* Change Period Modal */}
      {showChangePeriodModal && (
        <ChangePeriodModal
          student={showChangePeriodModal}
          onClose={() => setShowChangePeriodModal(null)}
          onSuccess={() => {
            setShowChangePeriodModal(null);
            loadData();
          }}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <BulkUploadModal
          classes={classes}
          onClose={() => setShowBulkUploadModal(false)}
          onSuccess={() => {
            setShowBulkUploadModal(false);
            loadData();
          }}
          adminUid={admin.uid}
        />
      )}

      {/* Student History Modal */}
      {showHistoryModal && (
        <StudentHistoryModal
          student={showHistoryModal}
          onClose={() => setShowHistoryModal(null)}
        />
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          classes={classes}
          onClose={() => setEditingStudent(null)}
          onSuccess={() => {
            setEditingStudent(null);
            loadData();
          }}
        />
      )}

      {/* Student Schedule Modal */}
      {showScheduleModal && (
        <StudentScheduleModal
          student={showScheduleModal}
          onClose={() => setShowScheduleModal(null)}
        />
      )}

      {/* Auto Assign Modal */}
      {showAutoAssignModal && (
        <AutoAssignModal
          students={classFilter === 'unassigned' ? filteredStudents : students.filter(s => !s.class)}
          classes={classes}
          onClose={() => setShowAutoAssignModal(false)}
          onSuccess={() => {
            setShowAutoAssignModal(false);
            loadData();
          }}
        />
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <BulkAssignModal
          selectedStudentIds={Array.from(selectedStudents)}
          students={students}
          classes={classes}
          onClose={() => setShowBulkAssignModal(false)}
          onSuccess={() => {
            setShowBulkAssignModal(false);
            setSelectedStudents(new Set());
            loadData();
          }}
        />
      )}

      {/* Bulk Auto Assign to Multiple Classes Modal */}
      {showBulkAutoAssignModal && (
        <BulkAutoAssignModal
          selectedStudentIds={Array.from(selectedStudents)}
          students={students}
          classes={classes}
          onClose={() => setShowBulkAutoAssignModal(false)}
          onSuccess={() => {
            setShowBulkAutoAssignModal(false);
            setSelectedStudents(new Set());
            loadData();
          }}
        />
      )}
    </div>
  );
}

function AddStudentModal({ classes, onClose, onSuccess, adminUid }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    birthDate: '',
    class: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.name.trim().length < 2) {
      setError('이름을 정확히 입력해주세요.');
      return;
    }
    if (formData.phone.length !== 4) {
      setError('전화번호 뒷자리 4자리를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await createStudent(formData, adminUid);
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
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">학생 등록</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              placeholder="홍길동"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">전화번호 뒷자리</label>
            <input
              type="text"
              maxLength={4}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '') })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              placeholder="1234"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">반</label>
              <select
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              >
                <option value="">미배정</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.name}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">생년월일</label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              />
            </div>
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
              {loading ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditStudentModal({ student, classes, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: student.name || '',
    phone: student.phone || '',
    birthDate: student.birthDate || '',
    class: student.class || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      await updateStudent(student.id, {
        birthDate: formData.birthDate,
        class: formData.class,
      });
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
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">학생 정보 수정</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
            <input
              type="text"
              value={formData.name}
              disabled
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">이름은 수정할 수 없습니다</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">전화번호 뒷자리</label>
            <input
              type="text"
              value={formData.phone}
              disabled
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">전화번호는 수정할 수 없습니다</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">반</label>
              <select
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              >
                <option value="">미배정</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.name}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">생년월일</label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              />
            </div>
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
              {loading ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AutoAssignModal({ students, classes, onClose, onSuccess }) {
  const [method, setMethod] = useState('balance');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const methodDescriptions = {
    alphabetical: '학생 이름을 가나다순으로 정렬하여 반에 균등 배분합니다.',
    balance: '각 반의 학생 수가 균등해지도록 배분합니다.',
    category: '학생이 가장 많이 수강한 과목 카테고리를 기준으로 배정합니다. (예: 수학반, 영어반 등)',
  };

  const handlePreview = async () => {
    if (classes.length === 0) {
      setError('배정할 반이 없습니다. 먼저 반을 등록해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await autoAssignStudents(method, students, classes);
      setPreview(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      await executeAutoAssignment(preview);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group preview by class
  const previewByClass = preview?.reduce((acc, item) => {
    if (!acc[item.className]) {
      acc[item.className] = [];
    }
    acc[item.className].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">자동 반 배정</h2>
              <p className="text-sm text-slate-500">
                미배정 학생 {students.length}명
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!preview ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">배정 방식</label>
                <div className="space-y-3">
                  {[
                    { value: 'balance', label: '균등 배분' },
                    { value: 'alphabetical', label: '가나다순' },
                    { value: 'category', label: '수강 과목 기준' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                        method === opt.value 
                          ? 'border-[#00b6b2] bg-[#00b6b2]/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="method"
                        value={opt.value}
                        checked={method === opt.value}
                        onChange={(e) => setMethod(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-slate-900">{opt.label}</div>
                        <div className="text-sm text-slate-500">{methodDescriptions[opt.value]}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-4 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="font-medium text-green-800">미리보기 결과</div>
                <div className="text-sm text-green-600">{preview.length}명이 {Object.keys(previewByClass).length}개 반에 배정됩니다.</div>
              </div>

              {Object.entries(previewByClass).map(([className, items]) => (
                <div key={className} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 font-medium text-slate-700 flex items-center justify-between">
                    <span>{className}</span>
                    <span className="text-sm text-slate-500">{items.length}명</span>
                  </div>
                  <div className="p-4 flex flex-wrap gap-2">
                    {items.map(item => (
                      <span 
                        key={item.studentId} 
                        className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm"
                      >
                        {item.studentName}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          {!preview ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handlePreview}
                disabled={loading || students.length === 0}
                className="flex-1 py-2.5 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] disabled:opacity-50"
              >
                {loading ? '계산 중...' : '미리보기'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
              >
                다시 설정
              </button>
              <button
                onClick={handleExecute}
                disabled={loading}
                className="flex-1 py-2.5 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] disabled:opacity-50"
              >
                {loading ? '배정 중...' : '배정 실행'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BulkAssignModal({ selectedStudentIds, students, classes, onClose, onSuccess }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedStudentNames = selectedStudentIds
    .map(id => students.find(s => s.id === id)?.name)
    .filter(Boolean);

  const handleSubmit = async () => {
    if (!selectedClass) {
      setError('반을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      await batchAssignStudentsToClass(selectedStudentIds, selectedClass);
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
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">일괄 반 배정</h2>
              <p className="text-sm text-slate-500">{selectedStudentIds.length}명 선택됨</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 max-h-32 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {selectedStudentNames.map((name, idx) => (
                <span 
                  key={idx} 
                  className="inline-flex px-2.5 py-1 bg-white border border-gray-200 text-slate-700 rounded-lg text-sm"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">배정할 반</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
            >
              <option value="">반 선택</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.name}>
                  {cls.name} ({cls.studentCount || 0}/{cls.capacity}명)
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedClass}
              className="flex-1 py-2.5 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] disabled:opacity-50"
            >
              {loading ? '배정 중...' : '배정하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkAutoAssignModal({ selectedStudentIds, students, classes, onClose, onSuccess }) {
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedStudents = selectedStudentIds
    .map(id => students.find(s => s.id === id))
    .filter(Boolean);

  const unassignedSelected = selectedStudents.filter(s => !s.class);

  const toggleClass = (className) => {
    setSelectedClasses(prev => 
      prev.includes(className) 
        ? prev.filter(c => c !== className)
        : [...prev, className]
    );
    setPreview(null);
  };

  const handlePreview = () => {
    if (selectedClasses.length === 0) {
      setError('배정할 반을 선택해주세요.');
      return;
    }

    if (unassignedSelected.length === 0) {
      setError('미배정 상태인 학생이 없습니다.');
      return;
    }

    setError('');

    // Distribute students evenly across selected classes
    const studentsToAssign = [...unassignedSelected].sort((a, b) => 
      a.name.localeCompare(b.name, 'ko')
    );
    
    const assignments = [];
    const classCount = selectedClasses.length;
    
    studentsToAssign.forEach((student, idx) => {
      const classIndex = idx % classCount;
      assignments.push({
        studentId: student.id,
        studentName: student.name,
        className: selectedClasses[classIndex],
      });
    });

    setPreview(assignments);
  };

  const handleExecute = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      // Group by class and execute batch assignment
      const byClass = {};
      preview.forEach(item => {
        if (!byClass[item.className]) {
          byClass[item.className] = [];
        }
        byClass[item.className].push(item.studentId);
      });

      for (const [className, studentIds] of Object.entries(byClass)) {
        await batchAssignStudentsToClass(studentIds, className);
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group preview by class
  const previewByClass = preview?.reduce((acc, item) => {
    if (!acc[item.className]) {
      acc[item.className] = [];
    }
    acc[item.className].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">여러 반에 균등 배정</h2>
              <p className="text-sm text-slate-500">
                선택된 학생 {selectedStudentIds.length}명 중 미배정 {unassignedSelected.length}명
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!preview ? (
            <div className="space-y-6">
              {/* Selected students preview */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  배정 대상 학생 (미배정 {unassignedSelected.length}명)
                </label>
                <div className="bg-slate-50 rounded-xl p-4 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {unassignedSelected.map(student => (
                      <span 
                        key={student.id} 
                        className="inline-flex px-2.5 py-1 bg-white border border-gray-200 text-slate-700 rounded-lg text-sm"
                      >
                        {student.name}
                      </span>
                    ))}
                    {unassignedSelected.length === 0 && (
                      <span className="text-slate-400 text-sm">미배정 학생이 없습니다</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Class selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  배정할 반 선택 (여러 개 선택 가능)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {classes.map(cls => (
                    <button
                      key={cls.id}
                      onClick={() => toggleClass(cls.name)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedClasses.includes(cls.name)
                          ? 'border-[#00b6b2] bg-[#00b6b2]/5 ring-2 ring-[#00b6b2]/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-slate-900">{cls.name}</div>
                      <div className="text-xs text-slate-500">
                        {cls.studentCount || 0}/{cls.capacity}명
                      </div>
                    </button>
                  ))}
                </div>
                {selectedClasses.length > 0 && (
                  <div className="mt-2 text-sm text-[#00b6b2]">
                    {selectedClasses.length}개 반 선택됨: {selectedClasses.join(', ')}
                  </div>
                )}
              </div>

              {/* Distribution info */}
              {selectedClasses.length > 0 && unassignedSelected.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="text-sm text-blue-800">
                    <strong>{unassignedSelected.length}명</strong>의 학생이 
                    <strong> {selectedClasses.length}개</strong> 반에 균등하게 배정됩니다.
                    <br />
                    각 반에 약 <strong>{Math.ceil(unassignedSelected.length / selectedClasses.length)}명</strong>씩 배정됩니다.
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-4 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="font-medium text-green-800">미리보기 결과</div>
                <div className="text-sm text-green-600">
                  {preview.length}명이 {Object.keys(previewByClass).length}개 반에 배정됩니다.
                </div>
              </div>

              {Object.entries(previewByClass).map(([className, items]) => (
                <div key={className} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 font-medium text-slate-700 flex items-center justify-between">
                    <span>{className}</span>
                    <span className="text-sm text-slate-500">{items.length}명</span>
                  </div>
                  <div className="p-4 flex flex-wrap gap-2">
                    {items.map(item => (
                      <span 
                        key={item.studentId} 
                        className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm"
                      >
                        {item.studentName}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          {!preview ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handlePreview}
                disabled={loading || selectedClasses.length === 0 || unassignedSelected.length === 0}
                className="flex-1 py-2.5 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] disabled:opacity-50"
              >
                미리보기
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
              >
                다시 설정
              </button>
              <button
                onClick={handleExecute}
                disabled={loading}
                className="flex-1 py-2.5 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] disabled:opacity-50"
              >
                {loading ? '배정 중...' : '배정 실행'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentScheduleModal({ student, onClose }) {
  const [courses, setCourses] = useState({ approved: [], pending: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const enrollments = await getStudentEnrollments(student.id);
        
        // 각 enrollment에 대해 강좌 정보 가져오기
        const enrichedEnrollments = await Promise.all(
          enrollments.map(async (enrollment) => {
            const course = await getCourse(enrollment.courseId);
            return { ...enrollment, course };
          })
        );

        // 승인된 강좌와 대기 중인 강좌 분리
        const approved = enrichedEnrollments
          .filter(e => e.status === ENROLLMENT_STATUS.APPROVED && e.course)
          .map(e => e.course);
        const pending = enrichedEnrollments
          .filter(e => e.status === ENROLLMENT_STATUS.PENDING && e.course)
          .map(e => e.course);

        setCourses({ approved, pending });
      } catch (error) {
        console.error('Failed to load schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [student.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportImage = async () => {
    const scheduleElement = document.getElementById('admin-schedule-container');
    if (!scheduleElement) return;

    try {
      const canvas = await html2canvas(scheduleElement, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = `시간표_${student.name}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('이미지 저장에 실패했습니다.');
    }
  };

  const totalCourses = courses.approved.length + courses.pending.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00b6b2]/10 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-[#00b6b2]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{student.name} 학생 시간표</h2>
              <p className="text-sm text-slate-500">
                수강 확정 {courses.approved.length}개
                {courses.pending.length > 0 && ` | 대기 ${courses.pending.length}개`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={totalCourses === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              인쇄
            </button>
            <button
              onClick={handleExportImage}
              disabled={totalCourses === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-[#00b6b2] disabled:opacity-50"
            >
              <Image className="w-4 h-4" />
              이미지 저장
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[#00b6b2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-500">시간표 로딩 중...</p>
            </div>
          ) : totalCourses === 0 ? (
            <div className="text-center py-12 text-slate-400">
              수강 신청한 강좌가 없습니다.
            </div>
          ) : (
            <div id="admin-schedule-container">
              <BigSchedule 
                enrolledCourses={courses.approved} 
                pendingCourses={courses.pending} 
              />
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

function ChangePeriodModal({ student, onClose, onSuccess }) {
  const [startDate, setStartDate] = useState(
    student.changeStartDate 
      ? new Date(student.changeStartDate.toDate?.() || student.changeStartDate).toISOString().split('T')[0]
      : ''
  );
  const [endDate, setEndDate] = useState(
    student.changeEndDate 
      ? new Date(student.changeEndDate.toDate?.() || student.changeEndDate).toISOString().split('T')[0]
      : ''
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await setChangePeriod(
        student.id,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );
      onSuccess();
    } catch (error) {
      console.error('Failed to set change period:', error);
      alert('설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">수강신청 변경기간 설정</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-600 mb-4">
          <strong>{student.name}</strong> 학생의 변경기간을 설정합니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
            />
          </div>

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
              {loading ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkUploadModal({ classes, onClose, onSuccess, adminUid }) {
  const [step, setStep] = useState('upload'); // upload, preview, result
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [checkedData, setCheckedData] = useState([]);
  const [duplicateActions, setDuplicateActions] = useState({});
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
        name: String(row['이름'] || row['name'] || '').trim(),
        class: String(row['반'] || row['class'] || '').trim(),
        phone: String(row['전화번호뒷자리'] || row['전화번호 뒷자리'] || row['phone'] || '').trim(),
        birthDate: String(row['생년월일'] || row['birthDate'] || '').trim(),
      })).filter(row => row.name && row.phone);

      if (normalized.length === 0) {
        setError('유효한 데이터가 없습니다. 양식을 확인해주세요.');
        setLoading(false);
        return;
      }

      // 전화번호 4자리 검증
      const invalidPhone = normalized.find(row => row.phone.length !== 4 || !/^\d{4}$/.test(row.phone));
      if (invalidPhone) {
        setError(`전화번호 뒷자리는 4자리 숫자여야 합니다. (오류: ${invalidPhone.name})`);
        setLoading(false);
        return;
      }

      setParsedData(normalized);
      
      // 중복 체크
      const checked = await checkBatchDuplicates(normalized);
      setCheckedData(checked);
      
      // 기본 중복 처리 액션 설정
      const actions = {};
      checked.forEach(item => {
        if (item.isDuplicate) {
          actions[item.studentId] = 'skip'; // 기본값: 건너뛰기
        }
      });
      setDuplicateActions(actions);
      
      setStep('preview');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const classNames = classes.map(c => c.name).join(', ') || 'A반, B반, C반';
    const columns = [
      { header: '이름', example: '홍길동' },
      { header: '반', example: classNames.split(', ')[0] || 'A반' },
      { header: '전화번호뒷자리', example: '1234' },
      { header: '생년월일', example: '2005-03-15' },
    ];
    downloadTemplate(columns, '학생등록');
  };

  const handleDuplicateAction = (studentId, action) => {
    setDuplicateActions(prev => ({
      ...prev,
      [studentId]: action
    }));
  };

  const handleSetAllDuplicates = (action) => {
    const newActions = {};
    checkedData.forEach(item => {
      if (item.isDuplicate) {
        newActions[item.studentId] = action;
      }
    });
    setDuplicateActions(newActions);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const results = await batchCreateStudents(parsedData, adminUid, duplicateActions);
      setResults(results);
      setStep('result');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const duplicateCount = checkedData.filter(d => d.isDuplicate).length;
  const newCount = checkedData.filter(d => !d.isDuplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">학생 일괄 업로드</h2>
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
              <div 
                className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-[#00b6b2] transition-colors cursor-pointer"
                onClick={() => document.getElementById('excel-file-input').click()}
              >
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-2">
                  클릭하거나 파일을 드래그하여 업로드
                </p>
                <p className="text-sm text-slate-400">
                  .xlsx, .xls 파일 지원
                </p>
                <input
                  id="excel-file-input"
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
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{newCount}</div>
                  <div className="text-sm text-green-600">신규 등록</div>
                </div>
                <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-700">{duplicateCount}</div>
                  <div className="text-sm text-yellow-600">중복</div>
                </div>
              </div>

              {/* Duplicate handling */}
              {duplicateCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">
                      {duplicateCount}명의 중복 학생이 있습니다
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSetAllDuplicates('skip')}
                      className="px-3 py-1.5 text-sm bg-white border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-100"
                    >
                      전체 건너뛰기
                    </button>
                    <button
                      onClick={() => handleSetAllDuplicates('overwrite')}
                      className="px-3 py-1.5 text-sm bg-white border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-100"
                    >
                      전체 덮어쓰기
                    </button>
                  </div>
                </div>
              )}

              {/* Data table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-slate-600">상태</th>
                      <th className="text-left p-3 font-medium text-slate-600">이름</th>
                      <th className="text-left p-3 font-medium text-slate-600">반</th>
                      <th className="text-left p-3 font-medium text-slate-600">전화번호</th>
                      <th className="text-left p-3 font-medium text-slate-600">생년월일</th>
                      <th className="text-left p-3 font-medium text-slate-600">처리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {checkedData.map((item, idx) => (
                      <tr key={idx} className={item.isDuplicate ? 'bg-yellow-50' : ''}>
                        <td className="p-3">
                          {item.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              중복
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                              신규
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-900">{item.name}</td>
                        <td className="p-3 text-slate-600">{item.class || '-'}</td>
                        <td className="p-3 text-slate-600">{item.phone}</td>
                        <td className="p-3 text-slate-600">{item.birthDate || '-'}</td>
                        <td className="p-3">
                          {item.isDuplicate ? (
                            <select
                              value={duplicateActions[item.studentId] || 'skip'}
                              onChange={(e) => handleDuplicateAction(item.studentId, e.target.value)}
                              className="text-xs px-2 py-1 border border-slate-200 rounded-lg"
                            >
                              <option value="skip">건너뛰기</option>
                              <option value="overwrite">덮어쓰기</option>
                            </select>
                          ) : (
                            <span className="text-xs text-slate-400">등록 예정</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'result' && results && (
            <div className="space-y-6">
              {/* Result summary */}
              <div className="flex gap-4">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {results.filter(r => r.success && r.created).length}
                  </div>
                  <div className="text-sm text-green-600">신규 등록</div>
                </div>
                <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">
                    {results.filter(r => r.success && r.overwritten).length}
                  </div>
                  <div className="text-sm text-blue-600">덮어쓰기</div>
                </div>
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-slate-700">
                    {results.filter(r => r.skipped).length}
                  </div>
                  <div className="text-sm text-slate-600">건너뜀</div>
                </div>
                <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">
                    {results.filter(r => !r.success && !r.skipped).length}
                  </div>
                  <div className="text-sm text-red-600">실패</div>
                </div>
              </div>

              {/* Detail list */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium text-slate-600">이름</th>
                      <th className="text-left p-3 font-medium text-slate-600">결과</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((result, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-medium text-slate-900">{result.name}</td>
                        <td className="p-3">
                          {result.success && result.created && (
                            <span className="text-green-600">등록 완료</span>
                          )}
                          {result.success && result.overwritten && (
                            <span className="text-blue-600">덮어쓰기 완료</span>
                          )}
                          {result.skipped && (
                            <span className="text-slate-500">건너뜀</span>
                          )}
                          {!result.success && !result.skipped && (
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
                disabled={loading}
                className="flex-1 py-2.5 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] disabled:opacity-50"
              >
                {loading ? '처리 중...' : `${checkedData.length}명 등록하기`}
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

function StudentHistoryModal({ student, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const enrollments = await getStudentAllEnrollments(student.id);
        
        // 각 enrollment에 대해 강좌 정보 가져오기
        const enriched = await Promise.all(
          enrollments.map(async (enrollment) => {
            const course = await getCourse(enrollment.courseId);
            return { ...enrollment, course };
          })
        );
        
        setHistory(enriched);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [student.id]);

  const handleExportExcel = () => {
    const columns = [
      { key: 'date', header: '날짜' },
      { key: 'courseName', header: '강좌명' },
      { key: 'status', header: '상태' },
      { key: 'reason', header: '사유' },
    ];
    
    const data = history.map(h => ({
      date: formatDateTime(h.enrolledAt),
      courseName: h.course?.title || h.courseId,
      status: STATUS_CONFIG[h.status]?.label || h.status,
      reason: h.rejectionReason || '-'
    }));
    
    exportToExcel(data, columns, `${student.name}_신청이력`);
  };

  const getStatusInfo = (enrollment) => {
    const config = STATUS_CONFIG[enrollment.status];
    return {
      label: config?.label || enrollment.status,
      color: config?.color || 'bg-slate-100 text-slate-800',
      badgeColor: config?.badgeColor || 'bg-slate-500'
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <History className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{student.name} 신청 이력</h2>
              <p className="text-sm text-slate-500">수강신청 변경 내역</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={history.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              엑셀
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
              <p className="text-slate-500">이력 로딩 중...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              신청 이력이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => {
                const statusInfo = getStatusInfo(item);
                return (
                  <div key={item.id} className="relative pl-6 pb-4 border-l-2 border-slate-200 last:border-l-0 last:pb-0">
                    <div className={`absolute left-[-5px] top-0 w-2 h-2 rounded-full ${statusInfo.badgeColor}`} />
                    <div className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-medium text-slate-900">
                            {item.course?.title || item.courseId}
                          </span>
                          <span className={`ml-2 inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {formatDateTime(item.enrolledAt)}
                        </span>
                      </div>
                      {item.course && (
                        <div className="text-sm text-slate-500 mb-2">
                          {item.course.instructor} | {item.course.room}
                        </div>
                      )}
                      {item.rejectionReason && (
                        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-2">
                          반려 사유: {item.rejectionReason}
                        </div>
                      )}
                      <div className="flex gap-4 text-xs text-slate-400 mt-2">
                        {item.approvedAt && (
                          <span>승인: {formatDateTime(item.approvedAt)}</span>
                        )}
                        {item.rejectedAt && (
                          <span>반려: {formatDateTime(item.rejectedAt)}</span>
                        )}
                        {item.cancelledAt && (
                          <span>취소: {formatDateTime(item.cancelledAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
