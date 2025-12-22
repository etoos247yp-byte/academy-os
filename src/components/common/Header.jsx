import { BookOpen, LogOut, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function StudentHeader({ student, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentView = location.pathname.includes('schedule') ? 'schedule' : 'courses';

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/student/courses')}
          >
            <div className="w-8 h-8 bg-[#00b6b2] rounded-lg flex items-center justify-center">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ACADEMY<span className="text-[#00b6b2]">.OS</span>
            </span>
          </div>
          
          <nav className="hidden md:flex space-x-1">
            <button 
              onClick={() => navigate('/student/courses')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                currentView === 'courses' 
                  ? 'bg-slate-100 text-[#00b6b2]' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              전체 강좌
            </button>
            <button 
              onClick={() => navigate('/student/schedule')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                currentView === 'schedule' 
                  ? 'bg-slate-100 text-[#00b6b2]' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              내 시간표
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-700">{student?.name}</div>
                <div className="text-xs text-slate-500">학생</div>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-full transition-all"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function AdminHeader({ admin, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('students')) return 'students';
    if (path.includes('courses')) return 'courses';
    if (path.includes('seasons')) return 'seasons';
    if (path.includes('requests')) return 'requests';
    if (path.includes('enrollments')) return 'enrollments';
    if (path.includes('settings')) return 'settings';
    return 'dashboard';
  };
  
  const activeTab = getActiveTab();

  const navItems = [
    { id: 'dashboard', label: '대시보드', path: '/admin/dashboard' },
    { id: 'requests', label: '신청 관리', path: '/admin/requests' },
    { id: 'students', label: '학생 관리', path: '/admin/students' },
    { id: 'courses', label: '강좌 관리', path: '/admin/courses' },
    { id: 'seasons', label: '학기 관리', path: '/admin/seasons' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/admin/dashboard')}
          >
            <div className="w-8 h-8 bg-[#00b6b2] rounded-lg flex items-center justify-center">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ACADEMY<span className="text-[#00b6b2]">.OS</span>
              <span className="ml-2 text-xs bg-slate-800 text-white px-2 py-0.5 rounded uppercase tracking-wider">Admin</span>
            </span>
          </div>
          
          <nav className="hidden lg:flex space-x-1">
            {navItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === item.id 
                    ? 'bg-slate-100 text-[#00b6b2]' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {admin?.role === 'superadmin' && (
              <button 
                onClick={() => navigate('/admin/settings')}
                className={`p-2 rounded-lg transition-all ${
                  activeTab === 'settings'
                    ? 'bg-slate-100 text-[#00b6b2]'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
                title="설정"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-700">{admin?.name}</div>
                <div className="text-xs text-slate-500">
                  {admin?.role === 'superadmin' ? '최고 관리자' : '관리자'}
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-full transition-all"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
