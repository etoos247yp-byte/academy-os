import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Clock, CheckCircle, Calendar, ArrowRight } from 'lucide-react';
import { getAllStudents } from '../../lib/studentService';
import { getAllCourses } from '../../lib/courseService';
import { subscribeToPendingEnrollments, getAllEnrollments } from '../../lib/enrollmentService';
import { getAllSeasons } from '../../lib/seasonService';
import { ENROLLMENT_STATUS } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    pendingRequests: 0,
    approvedEnrollments: 0,
    activeSeasons: 0,
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [students, courses, seasons, allEnrollments] = await Promise.all([
          getAllStudents(),
          getAllCourses(),
          getAllSeasons(),
          getAllEnrollments(),
        ]);

        const approved = allEnrollments.filter(e => e.status === ENROLLMENT_STATUS.APPROVED);
        const activeSeasons = seasons.filter(s => s.isActive);

        setStats({
          totalStudents: students.length,
          totalCourses: courses.length,
          pendingRequests: 0, // Will be updated by subscription
          approvedEnrollments: approved.length,
          activeSeasons: activeSeasons.length,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    // Subscribe to pending enrollments
    const unsubscribe = subscribeToPendingEnrollments((pending) => {
      setPendingRequests(pending);
      setStats(prev => ({ ...prev, pendingRequests: pending.length }));
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner message="대시보드 로딩 중..." />;
  }

  const statCards = [
    { 
      label: '신청 대기', 
      value: stats.pendingRequests, 
      icon: Clock, 
      color: 'text-yellow-600 bg-yellow-100',
      onClick: () => navigate('/admin/requests'),
      highlight: stats.pendingRequests > 0,
    },
    { 
      label: '등록 학생', 
      value: stats.totalStudents, 
      icon: Users, 
      color: 'text-blue-600 bg-blue-100',
      onClick: () => navigate('/admin/students'),
    },
    { 
      label: '개설 강좌', 
      value: stats.totalCourses, 
      icon: BookOpen, 
      color: 'text-purple-600 bg-purple-100',
      onClick: () => navigate('/admin/courses'),
    },
    { 
      label: '수강 확정', 
      value: stats.approvedEnrollments, 
      icon: CheckCircle, 
      color: 'text-green-600 bg-green-100',
    },
    { 
      label: '활성 학기', 
      value: stats.activeSeasons, 
      icon: Calendar, 
      color: 'text-slate-600 bg-slate-100',
      onClick: () => navigate('/admin/seasons'),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">대시보드</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            onClick={stat.onClick}
            className={`bg-white rounded-2xl border p-6 transition-all ${
              stat.onClick ? 'cursor-pointer hover:shadow-lg hover:border-[#00b6b2]/30' : ''
            } ${stat.highlight ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}
          >
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Pending Requests Preview */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-yellow-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              승인 대기 중인 신청 ({pendingRequests.length}건)
            </h2>
            <button
              onClick={() => navigate('/admin/requests')}
              className="text-sm text-[#00b6b2] hover:text-[#009da0] font-medium flex items-center gap-1"
            >
              전체 보기 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {pendingRequests.slice(0, 5).map((request) => (
              <div 
                key={request.id}
                className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl"
              >
                <div>
                  <span className="font-medium text-slate-900">{request.studentId}</span>
                  <span className="text-slate-400 mx-2">→</span>
                  <span className="text-slate-600">{request.courseId}</span>
                </div>
                <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                  대기 중
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction
          title="학생 등록"
          description="새 학생을 추가하고 수강신청을 열어줍니다."
          onClick={() => navigate('/admin/students')}
        />
        <QuickAction
          title="강좌 개설"
          description="새 강좌를 등록합니다."
          onClick={() => navigate('/admin/courses')}
        />
        <QuickAction
          title="학기 관리"
          description="학기를 생성하고 관리합니다."
          onClick={() => navigate('/admin/seasons')}
        />
      </div>
    </div>
  );
}

function QuickAction({ title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-[#00b6b2]/30 transition-all group"
    >
      <h3 className="font-bold text-slate-900 group-hover:text-[#00b6b2] transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#00b6b2] mt-4 group-hover:translate-x-1 transition-all" />
    </button>
  );
}
