import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Briefcase } from 'lucide-react';
import { getAllCourses, createCourse, updateCourse, deleteCourse } from '../../lib/courseService';
import { getAllSeasons } from '../../lib/seasonService';
import { useAuth } from '../../contexts/AuthContext';
import { formatSchedule } from '../../lib/utils';
import { CATEGORIES, LEVELS, DAYS, PERIODS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';

export default function CourseManagement() {
  const { admin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

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
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] transition-colors"
        >
          <Plus className="w-4 h-4" />
          강좌 개설
        </button>
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
                  <span className={`text-sm font-medium ${
                    course.enrolled >= course.capacity ? 'text-red-500' : 'text-slate-600'
                  }`}>
                    {course.enrolled}/{course.capacity}명
                  </span>
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
