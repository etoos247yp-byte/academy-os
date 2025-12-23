import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, Settings } from 'lucide-react';
import { useStudent } from '../contexts/StudentContext';

export default function StudentLogin() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { loginStudent } = useStudent();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (name.trim().length < 2) {
      setError('이름을 정확히 입력해주세요.');
      return;
    }
    if (phone.length !== 4) {
      setError('휴대폰 번호 뒷자리 4자리를 입력해주세요.');
      return;
    }
    
    setLoading(true);
    
    try {
      await loginStudent(name.trim(), phone);
      navigate('/student/courses');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="text-center">
          <img src="/logo.png" alt="ETOOS247.ICHEON" className="mx-auto w-24 h-24 object-contain mb-4" />
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            ETOOS247<span className="text-[#00b6b2]">.ICHEON</span>
          </h2>
          <p className="mt-2 text-slate-500">수강신청을 위해 학생 정보를 입력해주세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 relative z-10">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                학생 이름
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="block w-full rounded-xl border-gray-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-[#00b6b2] focus:bg-white focus:ring-2 focus:ring-[#00b6b2]/20 transition-all outline-none"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                보호자 연락처 뒷자리
              </label>
              <div className="relative">
                <input
                  id="phone"
                  name="phone"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  className="block w-full rounded-xl border-gray-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-[#00b6b2] focus:bg-white focus:ring-2 focus:ring-[#00b6b2]/20 transition-all outline-none tracking-widest"
                  placeholder="●●●●"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
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
            className="group relative flex w-full justify-center rounded-xl bg-slate-900 py-3.5 px-4 text-sm font-bold text-white hover:bg-[#00b6b2] focus:outline-none focus:ring-2 focus:ring-[#00b6b2] focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-[#00b6b2]/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '로그인 중...' : '수강신청 입장하기'}
            {!loading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>
        
        <div className="border-t border-slate-100 pt-6 mt-6 flex justify-center">
          <Link 
            to="/admin"
            className="text-xs text-slate-400 hover:text-[#00b6b2] flex items-center gap-1 transition-colors"
          >
            <Settings className="w-3 h-3" /> 관리자(선생님) 로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
