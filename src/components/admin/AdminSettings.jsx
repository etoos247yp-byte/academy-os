import { useState, useEffect } from 'react';
import { UserPlus, Shield, Trash2, X, Database, AlertTriangle, Calendar } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getAllSeasons } from '../../lib/seasonService';
import LoadingSpinner from '../common/LoadingSpinner';

export default function AdminSettings() {
  const { admin, inviteAdmin, logoutAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [collectionCounts, setCollectionCounts] = useState({});
  const [deleteModal, setDeleteModal] = useState(null);

  const loadAdmins = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'admins'));
      const adminList = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      }));
      setAdmins(adminList);
    } catch (error) {
      console.error('Failed to load admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeasons = async () => {
    try {
      const data = await getAllSeasons();
      setSeasons(data.filter(s => !s.isArchived));
    } catch (error) {
      console.error('Failed to load seasons:', error);
    }
  };

  const loadCollectionCounts = async () => {
    const collections = ['enrollments', 'courses', 'students', 'notifications', 'attendance', 'classes'];
    const counts = {};
    
    for (const col of collections) {
      try {
        const snapshot = await getDocs(collection(db, col));
        counts[col] = snapshot.size;
      } catch (error) {
        counts[col] = 0;
      }
    }
    
    setCollectionCounts(counts);
  };

  useEffect(() => {
    loadAdmins();
    loadSeasons();
    loadCollectionCounts();
  }, []);

  const handleDelete = async (uid, name) => {
    if (uid === admin.uid) {
      alert('자기 자신은 삭제할 수 없습니다.');
      return;
    }

    if (!confirm(`"${name}" 관리자를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'admins', uid));
      setAdmins(admins.filter(a => a.uid !== uid));
      // Note: This only removes from Firestore. The Firebase Auth user remains.
      // For complete deletion, you'd need Firebase Admin SDK or Cloud Functions.
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="설정 로딩 중..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#00b6b2]" />
          관리자 설정
        </h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          관리자 추가
        </button>
      </div>

      {/* Admin List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-slate-500 text-sm">
            <tr>
              <th className="text-left p-4 font-medium">이름</th>
              <th className="text-left p-4 font-medium">아이디</th>
              <th className="text-left p-4 font-medium">권한</th>
              <th className="text-right p-4 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {admins.map((adminUser) => (
              <tr key={adminUser.uid} className="hover:bg-slate-50/50">
                <td className="p-4 font-medium text-slate-900">
                  {adminUser.name}
                  {adminUser.uid === admin.uid && (
                    <span className="ml-2 text-xs text-slate-400">(나)</span>
                  )}
                </td>
                <td className="p-4 text-slate-600">
                  {adminUser.email?.replace('@academy.local', '')}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    adminUser.role === 'superadmin' 
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {adminUser.role === 'superadmin' ? '최고 관리자' : '관리자'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end">
                    {adminUser.uid !== admin.uid && adminUser.role !== 'superadmin' && (
                      <button
                        onClick={() => handleDelete(adminUser.uid, adminUser.name)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>참고:</strong> 관리자 추가 시 새 계정이 생성되며, 현재 세션에서 로그아웃됩니다. 
          다시 로그인해주세요.
        </p>
      </div>

      {/* 데이터 관리 섹션 */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <Database className="w-6 h-6 text-red-500" />
          데이터 관리
        </h2>

        {/* 학기별 데이터 삭제 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            학기별 데이터 삭제
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            선택한 학기의 강좌 및 수강신청 데이터만 삭제합니다. 학기 정보는 유지됩니다.
          </p>
          <SeasonDataDelete 
            seasons={seasons} 
            onDelete={() => loadCollectionCounts()}
          />
        </div>

        {/* 개별 컬렉션 삭제 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h3 className="font-bold text-slate-900 mb-4">개별 데이터 초기화</h3>
          <div className="space-y-3">
            <CollectionDeleteRow 
              label="수강신청" 
              collection="enrollments" 
              count={collectionCounts.enrollments || 0}
              icon="📋"
              onDelete={() => setDeleteModal({ collection: 'enrollments', label: '수강신청' })}
            />
            <CollectionDeleteRow 
              label="강좌" 
              collection="courses" 
              count={collectionCounts.courses || 0}
              icon="📚"
              onDelete={() => setDeleteModal({ collection: 'courses', label: '강좌' })}
            />
            <CollectionDeleteRow 
              label="학생" 
              collection="students" 
              count={collectionCounts.students || 0}
              icon="👥"
              onDelete={() => setDeleteModal({ collection: 'students', label: '학생' })}
            />
            <CollectionDeleteRow 
              label="알림" 
              collection="notifications" 
              count={collectionCounts.notifications || 0}
              icon="🔔"
              onDelete={() => setDeleteModal({ collection: 'notifications', label: '알림' })}
            />
            <CollectionDeleteRow 
              label="출석" 
              collection="attendance" 
              count={collectionCounts.attendance || 0}
              icon="✅"
              onDelete={() => setDeleteModal({ collection: 'attendance', label: '출석' })}
            />
            <CollectionDeleteRow 
              label="반" 
              collection="classes" 
              count={collectionCounts.classes || 0}
              icon="🏫"
              onDelete={() => setDeleteModal({ collection: 'classes', label: '반' })}
            />
          </div>
        </div>

        {/* 전체 초기화 */}
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
          <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            전체 데이터 초기화
          </h3>
          <p className="text-sm text-red-600 mb-4">
            모든 데이터(학생, 강좌, 수강신청, 알림, 출석, 반)를 삭제합니다. 
            학기 정보와 관리자 정보는 유지됩니다.
          </p>
          <button
            onClick={() => setDeleteModal({ collection: 'all', label: '전체 데이터' })}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            전체 초기화 실행
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteConfirmModal
          collection={deleteModal.collection}
          label={deleteModal.label}
          count={deleteModal.collection === 'all' 
            ? Object.values(collectionCounts).reduce((a, b) => a + b, 0)
            : collectionCounts[deleteModal.collection] || 0
          }
          onClose={() => setDeleteModal(null)}
          onSuccess={() => {
            setDeleteModal(null);
            loadCollectionCounts();
          }}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteAdminModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={async () => {
            setShowInviteModal(false);
            // After creating a new admin, we need to re-login
            alert('관리자가 추가되었습니다. 다시 로그인해주세요.');
            await logoutAdmin();
          }}
          inviteAdmin={inviteAdmin}
        />
      )}
    </div>
  );
}

function CollectionDeleteRow({ label, collection, count, icon, onDelete }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <span className="font-medium text-slate-700">{label}</span>
          <span className="text-sm text-slate-400 ml-2">({collection})</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">{count}건</span>
        <button
          onClick={onDelete}
          disabled={count === 0}
          className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          초기화
        </button>
      </div>
    </div>
  );
}

function SeasonDataDelete({ seasons, onDelete }) {
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  const handleDelete = async () => {
    if (!selectedSeasonId || confirmText !== '삭제합니다') return;

    setLoading(true);
    try {
      // 해당 학기의 수강신청 삭제
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('seasonId', '==', selectedSeasonId)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      
      // 해당 학기의 강좌 삭제
      const coursesQuery = query(
        collection(db, 'courses'),
        where('seasonId', '==', selectedSeasonId)
      );
      const coursesSnapshot = await getDocs(coursesQuery);

      // Batch 삭제
      const batchSize = 450;
      const allDocs = [...enrollmentsSnapshot.docs, ...coursesSnapshot.docs];
      
      for (let i = 0; i < allDocs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = allDocs.slice(i, i + batchSize);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      alert(`${selectedSeason.name} 학기의 데이터가 삭제되었습니다.\n- 수강신청: ${enrollmentsSnapshot.size}건\n- 강좌: ${coursesSnapshot.size}건`);
      setSelectedSeasonId('');
      setConfirmText('');
      onDelete();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <select
          value={selectedSeasonId}
          onChange={(e) => {
            setSelectedSeasonId(e.target.value);
            setConfirmText('');
          }}
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">학기 선택</option>
          {seasons.map(season => (
            <option key={season.id} value={season.id}>{season.name}</option>
          ))}
        </select>
      </div>

      {selectedSeasonId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800 mb-3">
            <strong>{selectedSeason?.name}</strong> 학기의 강좌 및 수강신청 데이터를 삭제합니다.
            <br />확인을 위해 아래에 "삭제합니다"를 입력해주세요.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="삭제합니다"
            className="w-full px-4 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
          />
          <button
            onClick={handleDelete}
            disabled={loading || confirmText !== '삭제합니다'}
            className="w-full py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '삭제 중...' : '선택 학기 데이터 삭제'}
          </button>
        </div>
      )}
    </div>
  );
}

function DeleteConfirmModal({ collection, label, count, onClose, onSuccess }) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const deleteCollectionData = async (collectionName) => {
    const { collection: firestoreCollection } = await import('firebase/firestore');
    const snapshot = await getDocs(firestoreCollection(db, collectionName));
    const batchSize = 450;
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = snapshot.docs.slice(i, i + batchSize);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    
    return snapshot.size;
  };

  const handleDelete = async () => {
    if (confirmText !== '삭제합니다') return;

    setLoading(true);
    try {
      if (collection === 'all') {
        // 전체 삭제
        const collections = ['enrollments', 'courses', 'students', 'notifications', 'attendance', 'classes'];
        let totalDeleted = 0;
        
        for (const col of collections) {
          const deleted = await deleteCollectionData(col);
          totalDeleted += deleted;
        }
        
        alert(`전체 데이터 ${totalDeleted}건이 삭제되었습니다.`);
      } else {
        // 개별 컬렉션 삭제
        const deleted = await deleteCollectionData(collection);
        alert(`${label} 데이터 ${deleted}건이 삭제되었습니다.`);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">데이터 삭제 확인</h2>
            <p className="text-sm text-slate-500">{label} ({count}건)</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-800">
            <strong>경고:</strong> 이 작업은 되돌릴 수 없습니다.
            <br />"{label}" 데이터 {count}건이 영구적으로 삭제됩니다.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            확인을 위해 "삭제합니다"를 입력해주세요.
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="삭제합니다"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || confirmText !== '삭제합니다'}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '삭제 중...' : '삭제 실행'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteAdminModal({ onClose, onSuccess, inviteAdmin }) {
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    name: '',
    role: 'admin',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.id.length < 3) {
      setError('아이디는 3자 이상이어야 합니다.');
      return;
    }
    if (formData.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (!formData.name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const email = `${formData.id}@academy.local`;
      await inviteAdmin(email, formData.password, formData.name, formData.role);
      onSuccess();
    } catch (err) {
      console.error('Invite error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 아이디입니다.');
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">관리자 추가</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">아이디</label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              placeholder="newadmin"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
              placeholder="••••••••"
              required
            />
          </div>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">권한</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
            >
              <option value="admin">관리자</option>
              <option value="superadmin">최고 관리자</option>
            </select>
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
