import { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, Users, 
  RefreshCw, CheckCircle, AlertTriangle 
} from 'lucide-react';
import {
  getAllClasses,
  createClass,
  updateClass,
  deleteClass,
  getStudentsByClass,
  recalculateClassCounts
} from '../../lib/classService';
import { getAllStudents } from '../../lib/studentService';
import { getActiveSeasons } from '../../lib/seasonService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ClassManagement() {
  const { admin } = useAuth();
  const [classes, setClasses] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [showStudentsModal, setShowStudentsModal] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  const loadData = async () => {
    try {
      const [classesData, seasonsData] = await Promise.all([
        getAllClasses(),
        getActiveSeasons()
      ]);
      setClasses(classesData);
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

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cls.description && cls.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDelete = async (classId, className) => {
    if (!confirm(`"${className}" 반을 삭제하시겠습니까?\n해당 반에 배정된 학생들의 반 정보가 초기화됩니다.`)) {
      return;
    }

    try {
      // Get students in this class and clear their class field
      const students = await getStudentsByClass(className);
      if (students.length > 0) {
        const clearPromises = students.map(s => 
          import('../../lib/classService').then(m => m.removeStudentFromClass(s.id))
        );
        await Promise.all(clearPromises);
      }
      
      await deleteClass(classId);
      setClasses(classes.filter(c => c.id !== classId));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await recalculateClassCounts();
      await loadData();
      alert('학생 수가 재계산되었습니다.');
    } catch (error) {
      console.error('Recalculate failed:', error);
      alert('재계산에 실패했습니다.');
    } finally {
      setRecalculating(false);
    }
  };

  const getSeasonName = (seasonId) => {
    const season = seasons.find(s => s.id === seasonId);
    return season ? season.name : '-';
  };

  if (loading) {
    return <LoadingSpinner message="반 목록 로딩 중..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">반 관리</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            학생 수 재계산
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] transition-colors"
          >
            <Plus className="w-4 h-4" />
            반 등록
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="반 이름 또는 설명으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
        />
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map((cls) => (
          <div
            key={cls.id}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{cls.name}</h3>
                {cls.seasonId && (
                  <span className="text-xs text-slate-500">{getSeasonName(cls.seasonId)}</span>
                )}
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                cls.isActive 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {cls.isActive ? '활성' : '비활성'}
              </div>
            </div>

            {cls.description && (
              <p className="text-sm text-slate-600 mb-4">{cls.description}</p>
            )}

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-4 h-4" />
                <span className="text-sm">
                  {cls.studentCount || 0} / {cls.capacity}명
                </span>
              </div>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-[#00b6b2] h-2 rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(100, ((cls.studentCount || 0) / cls.capacity) * 100)}%` 
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowStudentsModal(cls)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                <Users className="w-4 h-4" />
                학생 보기
              </button>
              <button
                onClick={() => setEditingClass(cls)}
                className="p-2 text-slate-400 hover:text-[#00b6b2] hover:bg-slate-100 rounded-lg transition-colors"
                title="수정"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(cls.id, cls.name)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredClasses.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-slate-400">
          {searchQuery ? '검색 결과가 없습니다.' : '등록된 반이 없습니다.'}
        </div>
      )}

      {/* Add Class Modal */}
      {showAddModal && (
        <ClassFormModal
          seasons={seasons}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
          adminUid={admin.uid}
        />
      )}

      {/* Edit Class Modal */}
      {editingClass && (
        <ClassFormModal
          classData={editingClass}
          seasons={seasons}
          onClose={() => setEditingClass(null)}
          onSuccess={() => {
            setEditingClass(null);
            loadData();
          }}
          adminUid={admin.uid}
        />
      )}

      {/* Students in Class Modal */}
      {showStudentsModal && (
        <ClassStudentsModal
          classData={showStudentsModal}
          onClose={() => setShowStudentsModal(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}

function ClassFormModal({ classData, seasons, onClose, onSuccess, adminUid }) {
  const isEditing = !!classData;
  const [formData, setFormData] = useState({
    name: classData?.name || '',
    description: classData?.description || '',
    capacity: classData?.capacity || 30,
    seasonId: classData?.seasonId || '',
    isActive: classData?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.name.trim().length < 1) {
      setError('반 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await updateClass(classData.id, formData);
      } else {
        await createClass(formData, adminUid);
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
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? '반 정보 수정' : '반 등록'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">반 이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              placeholder="A반"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">설명 (선택)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              placeholder="수학 집중반"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">정원</label>
              <input
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 30 })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">시즌 (선택)</label>
              <select
                value={formData.seasonId}
                onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              >
                <option value="">시즌 없음</option>
                {seasons.map(season => (
                  <option key={season.id} value={season.id}>{season.name}</option>
                ))}
              </select>
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-[#00b6b2] rounded focus:ring-[#00b6b2]"
              />
              <label htmlFor="isActive" className="text-sm text-slate-700">활성화</label>
            </div>
          )}

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

function ClassStudentsModal({ classData, onClose, onUpdate }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const data = await getStudentsByClass(classData.name);
        setStudents(data);
      } catch (error) {
        console.error('Failed to load students:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [classData.name]);

  const handleRemoveStudent = async (studentId, studentName) => {
    if (!confirm(`"${studentName}" 학생을 이 반에서 제외하시겠습니까?`)) {
      return;
    }

    try {
      const { removeStudentFromClass } = await import('../../lib/classService');
      await removeStudentFromClass(studentId);
      setStudents(students.filter(s => s.id !== studentId));
      onUpdate();
    } catch (error) {
      console.error('Remove failed:', error);
      alert('제외에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00b6b2]/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-[#00b6b2]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{classData.name} 학생 목록</h2>
              <p className="text-sm text-slate-500">{students.length}명</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-[#00b6b2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-500">학생 목록 로딩 중...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              이 반에 배정된 학생이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div>
                    <span className="font-medium text-slate-900">{student.name}</span>
                    <span className="text-sm text-slate-500 ml-2">{student.phone}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveStudent(student.id, student.name)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="반에서 제외"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
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
