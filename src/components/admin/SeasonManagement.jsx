import { useState, useEffect } from 'react';
import { Plus, Calendar, ToggleLeft, ToggleRight, Trash2, X, Archive, ArchiveRestore, Eye, AlertTriangle, BarChart3 } from 'lucide-react';
import { getAllSeasons, createSeason, updateSeason, toggleSeasonActive, deleteSeason, archiveSeason, unarchiveSeason, getSeasonStats } from '../../lib/seasonService';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatDateTime } from '../../lib/utils';
import LoadingSpinner from '../common/LoadingSpinner';

export default function SeasonManagement() {
  const { admin } = useAuth();
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [archiveModal, setArchiveModal] = useState(null);
  const [statsModal, setStatsModal] = useState(null);
  const [processing, setProcessing] = useState({});

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

  const handleArchive = async (seasonId) => {
    setProcessing(prev => ({ ...prev, [seasonId]: true }));
    try {
      await archiveSeason(seasonId, admin.uid);
      await loadSeasons();
      setArchiveModal(null);
    } catch (error) {
      console.error('Archive failed:', error);
      alert('아카이브에 실패했습니다.');
    } finally {
      setProcessing(prev => ({ ...prev, [seasonId]: false }));
    }
  };

  const handleUnarchive = async (seasonId) => {
    setProcessing(prev => ({ ...prev, [seasonId]: true }));
    try {
      await unarchiveSeason(seasonId);
      await loadSeasons();
    } catch (error) {
      console.error('Unarchive failed:', error);
      alert('아카이브 해제에 실패했습니다.');
    } finally {
      setProcessing(prev => ({ ...prev, [seasonId]: false }));
    }
  };

  const handleViewStats = async (season) => {
    if (season.stats) {
      setStatsModal(season);
    } else {
      // Fetch fresh stats
      setProcessing(prev => ({ ...prev, [season.id]: true }));
      try {
        const stats = await getSeasonStats(season.id);
        setStatsModal({ ...season, stats });
      } catch (error) {
        console.error('Failed to get stats:', error);
        alert('통계 조회에 실패했습니다.');
      } finally {
        setProcessing(prev => ({ ...prev, [season.id]: false }));
      }
    }
  };

  // Separate active seasons and archived seasons
  const activeSeasons = seasons.filter(s => !s.isArchived);
  const archivedSeasons = seasons.filter(s => s.isArchived);

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

      {/* Active Seasons List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          현재 학기 목록
        </h2>
        {activeSeasons.map((season) => (
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
                  onClick={() => handleViewStats(season)}
                  disabled={processing[season.id]}
                  className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title="통계 보기"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
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
                {/* Archive button - only show for inactive seasons */}
                {!season.isActive && (
                  <button
                    onClick={() => setArchiveModal(season)}
                    disabled={processing[season.id]}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-xl font-medium hover:bg-amber-200 transition-colors disabled:opacity-50"
                    title="아카이브"
                  >
                    <Archive className="w-4 h-4" />
                    아카이브
                  </button>
                )}
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

        {activeSeasons.length === 0 && (
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

      {/* Archived Seasons Section */}
      {archivedSeasons.length > 0 && (
        <div className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-slate-500 flex items-center gap-2">
            <Archive className="w-5 h-5" />
            아카이브된 학기
          </h2>
          {archivedSeasons.map((season) => (
            <div
              key={season.id}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-6 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-600">{season.name}</h3>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-medium rounded-full">
                      아카이브됨
                    </span>
                    {season.dataDeleted && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                        데이터 삭제됨
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {formatDate(season.startDate)} ~ {formatDate(season.endDate)}
                  </p>
                  {season.archivedAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      아카이브 일시: {formatDateTime(season.archivedAt)}
                    </p>
                  )}
                  {/* Show stats if available */}
                  {season.stats && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>강좌: {season.stats.totalCourses}개</span>
                      <span>수강생: {season.stats.totalStudents}명</span>
                      <span>승인된 수강: {season.stats.approvedEnrollments}건</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* View in Archive Viewer */}
                  {!season.dataDeleted && (
                    <a
                      href={`/admin/archive?seasonId=${season.id}`}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      보기
                    </a>
                  )}
                  <button
                    onClick={() => handleUnarchive(season.id)}
                    disabled={processing[season.id]}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <ArchiveRestore className="w-4 h-4" />
                    복원
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Archive Confirmation Modal */}
      {archiveModal && (
        <ArchiveConfirmModal
          season={archiveModal}
          onClose={() => setArchiveModal(null)}
          onConfirm={() => handleArchive(archiveModal.id)}
          loading={processing[archiveModal.id]}
        />
      )}

      {/* Stats Modal */}
      {statsModal && (
        <SeasonStatsModal
          season={statsModal}
          onClose={() => setStatsModal(null)}
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

function ArchiveConfirmModal({ season, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">학기 아카이브</h2>
            <p className="text-sm text-slate-500">"{season.name}"</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-medium text-amber-800 mb-2">아카이브 시 주의사항</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• 해당 학기의 모든 데이터가 읽기 전용이 됩니다.</li>
              <li>• 강좌 및 수강신청을 수정할 수 없습니다.</li>
              <li>• 학기 통계가 저장됩니다.</li>
              <li>• 나중에 복원할 수 있습니다.</li>
            </ul>
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
            disabled={loading}
            className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              '처리 중...'
            ) : (
              <>
                <Archive className="w-4 h-4" />
                아카이브
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SeasonStatsModal({ season, onClose }) {
  const stats = season.stats;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">학기 통계</h2>
              <p className="text-sm text-slate-500">{season.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {stats ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{stats.totalCourses}</div>
              <div className="text-sm text-slate-500">총 강좌 수</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{stats.totalStudents}</div>
              <div className="text-sm text-slate-500">수강 학생 수</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{stats.totalEnrollments}</div>
              <div className="text-sm text-slate-500">총 수강신청</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.approvedEnrollments}</div>
              <div className="text-sm text-green-600">승인된 수강</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            통계 정보가 없습니다.
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
