import { useState, useEffect } from 'react';
import { Plus, Calendar, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import { getAllSeasons, createSeason, updateSeason, toggleSeasonActive, deleteSeason } from '../../lib/seasonService';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import LoadingSpinner from '../common/LoadingSpinner';

export default function SeasonManagement() {
  const { admin } = useAuth();
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadSeasons = async () => {
    try {
      const data = await getAllSeasons();
      setSeasons(data);
    } catch (error) {
      console.error('Failed to load seasons:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeasons();
  }, []);

  const handleToggle = async (seasonId, isActive) => {
    try {
      await toggleSeasonActive(seasonId, !isActive);
      setSeasons(seasons.map(s => 
        s.id === seasonId ? { ...s, isActive: !isActive } : s
      ));
    } catch (error) {
      console.error('Toggle failed:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (seasonId, seasonName) => {
    if (!confirm(`"${seasonName}" 학기를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteSeason(seasonId);
      setSeasons(seasons.filter(s => s.id !== seasonId));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="학기 목록 로딩 중..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-[#00b6b2]" />
          학기 관리
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] transition-colors"
        >
          <Plus className="w-4 h-4" />
          학기 추가
        </button>
      </div>

      {/* Seasons List */}
      <div className="space-y-4">
        {seasons.map((season) => (
          <div
            key={season.id}
            className={`bg-white rounded-2xl border p-6 transition-all ${
              season.isActive ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900">{season.name}</h3>
                  {season.isActive && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      활성
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {formatDate(season.startDate)} ~ {formatDate(season.endDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(season.id, season.isActive)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                    season.isActive
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {season.isActive ? (
                    <>
                      <ToggleRight className="w-4 h-4" />
                      활성
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4" />
                      비활성
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(season.id, season.name)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {seasons.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">등록된 학기가 없습니다.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-[#00b6b2] font-medium hover:underline"
            >
              첫 학기 추가하기
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddSeasonModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadSeasons();
          }}
          adminUid={admin.uid}
        />
      )}
    </div>
  );
}

function AddSeasonModal({ onClose, onSuccess, adminUid }) {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('학기명을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await createSeason({
        name: formData.name,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        isActive: formData.isActive,
      }, adminUid);
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
          <h2 className="text-xl font-bold text-slate-900">학기 추가</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">학기명</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              placeholder="2025 봄학기"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">시작일</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">종료일</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-[#00b6b2] focus:ring-[#00b6b2]"
            />
            <label htmlFor="isActive" className="text-sm text-slate-700">
              활성화 (학생에게 표시)
            </label>
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
              {loading ? '추가 중...' : '추가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
