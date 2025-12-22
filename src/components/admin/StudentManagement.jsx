import { useState, useEffect } from 'react';
import { Plus, Search, ToggleLeft, ToggleRight, Calendar, Trash2, Edit2, X, Check } from 'lucide-react';
import { 
  getAllStudents, 
  createStudent, 
  updateStudent, 
  deleteStudent,
  setEnrollmentStatus,
  setChangePeriod,
  batchSetEnrollmentStatus
} from '../../lib/studentService';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import LoadingSpinner from '../common/LoadingSpinner';

export default function StudentManagement() {
  const { admin } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showChangePeriodModal, setShowChangePeriodModal] = useState(null);

  const loadStudents = async () => {
    try {
      const data = await getAllStudents();
      setStudents(data);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.phone.includes(searchQuery)
  );

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
    const selectedIds = filteredStudents.map(s => s.id);
    if (selectedIds.length === 0) return;
    
    if (!confirm(`${filteredStudents.length}명의 학생 수강신청을 ${isOpen ? '열겠' : '닫겠'}습니까?`)) {
      return;
    }

    try {
      await batchSetEnrollmentStatus(selectedIds, isOpen);
      loadStudents();
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
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="학생 목록 로딩 중..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">학생 관리</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] transition-colors"
        >
          <Plus className="w-4 h-4" />
          학생 등록
        </button>
      </div>

      {/* Search and Batch Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
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
        <div className="flex gap-2">
          <button
            onClick={() => handleBatchToggle(true)}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition-colors"
          >
            전체 열기
          </button>
          <button
            onClick={() => handleBatchToggle(false)}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors"
          >
            전체 닫기
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-slate-500 text-sm">
            <tr>
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
              <tr key={student.id} className="hover:bg-slate-50/50">
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
                      onClick={() => handleDelete(student.id, student.name)}
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
        
        {filteredStudents.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            {searchQuery ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadStudents();
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
            loadStudents();
          }}
        />
      )}
    </div>
  );
}

function AddStudentModal({ onClose, onSuccess, adminUid }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    birthDate: '',
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">생년월일</label>
            <input
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
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
              {loading ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </form>
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
