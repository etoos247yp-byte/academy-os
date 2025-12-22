import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Lock, ArrowRight, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) {
      setError('아이디를 입력해주세요.');
      return;
    }
    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Convert plain text ID to email format for Firebase
      const emailForAuth = email.includes('@') ? email : `${email}@academy.local`;
      await loginAdmin(emailForAuth, password);
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError(err.message || '로그인에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <BookOpen className="text-white w-7 h-7" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            ACADEMY<span className="text-[#00b6b2]">.OS</span>
          </h2>
          <p className="mt-2 text-slate-500">관리자 로그인</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  아이디
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="text"
                    required
                    className="block w-full rounded-xl border-gray-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-[#00b6b2] focus:bg-white focus:ring-2 focus:ring-[#00b6b2]/20 transition-all outline-none"
                    placeholder="admin"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="block w-full rounded-xl border-gray-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-[#00b6b2] focus:bg-white focus:ring-2 focus:ring-[#00b6b2]/20 transition-all outline-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-slate-900 py-3.5 px-4 text-sm font-bold text-white hover:bg-[#00b6b2] focus:outline-none focus:ring-2 focus:ring-[#00b6b2] focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-[#00b6b2]/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '관리자 로그인'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        </div>
        
        <div className="text-center">
          <Link 
            to="/"
            className="text-sm text-slate-400 hover:text-[#00b6b2] transition-colors"
          >
            ← 학생 로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
