import { useState, useEffect } from 'react';
import { UserPlus, Shield, Trash2, X } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

export default function AdminSettings() {
  const { admin, inviteAdmin, logoutAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

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

  useEffect(() => {
    loadAdmins();
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
