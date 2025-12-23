import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Clock, CheckCircle, Calendar, ArrowRight, BarChart3 } from 'lucide-react';
import { getAllStudents } from '../../lib/studentService';
import { getAllCourses } from '../../lib/courseService';
import { subscribeToPendingEnrollments, getAllEnrollments } from '../../lib/enrollmentService';
import { getAllSeasons } from '../../lib/seasonService';
import { ENROLLMENT_STATUS, CATEGORY_COLORS, STATUS_CONFIG } from '../../constants';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

// Chart color palette
const CHART_COLORS = {
  국어: '#ef4444',
  수학: '#3b82f6',
  영어: '#a855f7',
  과탐: '#22c55e',
  사탐: '#f59e0b',
  수리논술: '#06b6d4',
  인문논술: '#ec4899',
};

const STATUS_COLORS = {
  pending: '#eab308',
  approved: '#22c55e',
  rejected: '#ef4444',
  cancelled: '#6b7280',
};

// Helper function to aggregate enrollment data by course
const aggregateCourseEnrollments = (courses, enrollments) => {
  const courseMap = new Map(courses.map(c => [c.id, { ...c, enrollmentCount: 0 }]));
  
  enrollments.forEach(e => {
    if (courseMap.has(e.courseId) && (e.status === 'pending' || e.status === 'approved')) {
      courseMap.get(e.courseId).enrollmentCount++;
    }
  });
  
  return Array.from(courseMap.values())
    .filter(c => c.enrollmentCount > 0 || c.enrolled > 0)
    .sort((a, b) => b.enrolled - a.enrolled)
    .slice(0, 10)
    .map(c => ({
      name: c.title.length > 15 ? c.title.substring(0, 15) + '...' : c.title,
      fullName: c.title,
      enrolled: c.enrolled,
      capacity: c.capacity,
      category: c.category,
      fill: CHART_COLORS[c.category] || '#6b7280',
    }));
};

// Helper function to aggregate by category
const aggregateCategoryDistribution = (courses, enrollments) => {
  const categoryCount = {};
  
  enrollments.forEach(e => {
    if (e.status === 'pending' || e.status === 'approved') {
      const course = courses.find(c => c.id === e.courseId);
      if (course) {
        categoryCount[course.category] = (categoryCount[course.category] || 0) + 1;
      }
    }
  });
  
  return Object.entries(categoryCount).map(([name, value]) => ({
    name,
    value,
    fill: CHART_COLORS[name] || '#6b7280',
  }));
};

// Helper function for enrollment status distribution
const aggregateStatusDistribution = (enrollments) => {
  const statusCount = {
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  };
  
  enrollments.forEach(e => {
    if (statusCount.hasOwnProperty(e.status)) {
      statusCount[e.status]++;
    }
  });
  
  return Object.entries(statusCount)
    .filter(([_, value]) => value > 0)
    .map(([status, value]) => ({
      name: STATUS_CONFIG[status]?.label || status,
      value,
      fill: STATUS_COLORS[status],
    }));
};

// Helper function for daily enrollment trend
const aggregateDailyTrend = (enrollments, days = 14) => {
  const now = new Date();
  const trend = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const count = enrollments.filter(e => {
      const enrolledAt = e.enrolledAt?.toDate?.() || 
        (e.enrolledAt?.seconds ? new Date(e.enrolledAt.seconds * 1000) : null);
      if (!enrolledAt) return false;
      return enrolledAt >= date && enrolledAt < nextDate;
    }).length;
    
    trend.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      신청: count,
    });
  }
  
  return trend;
};

// Helper function to aggregate students by class
const aggregateClassDistribution = (students) => {
  const classCount = {};
  
  students.forEach(s => {
    const className = s.class || s.className || '미배정';
    classCount[className] = (classCount[className] || 0) + 1;
  });
  
  return Object.entries(classCount)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count], index) => ({
      name,
      학생수: count,
      fill: Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length],
    }));
};

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
  const [rawData, setRawData] = useState({
    students: [],
    courses: [],
    enrollments: [],
  });

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

        setRawData({
          students,
          courses,
          enrollments: allEnrollments,
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

  // Memoized chart data
  const courseEnrollmentData = useMemo(
    () => aggregateCourseEnrollments(rawData.courses, rawData.enrollments),
    [rawData.courses, rawData.enrollments]
  );

  const categoryDistributionData = useMemo(
    () => aggregateCategoryDistribution(rawData.courses, rawData.enrollments),
    [rawData.courses, rawData.enrollments]
  );

  const statusDistributionData = useMemo(
    () => aggregateStatusDistribution(rawData.enrollments),
    [rawData.enrollments]
  );

  const dailyTrendData = useMemo(
    () => aggregateDailyTrend(rawData.enrollments),
    [rawData.enrollments]
  );

  const classDistributionData = useMemo(
    () => aggregateClassDistribution(rawData.students),
    [rawData.students]
  );

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

      {/* Charts Section */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#00b6b2]" />
          통계 차트
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Course Enrollment Bar Chart */}
          {courseEnrollmentData.length > 0 && (
            <ChartCard title="강좌별 신청 현황 (Top 10)">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={courseEnrollmentData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-medium text-slate-900">{data.fullName}</p>
                            <p className="text-sm text-slate-600">
                              등록: {data.enrolled} / {data.capacity}명
                            </p>
                            <p className="text-sm text-slate-500">{data.category}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="enrolled" name="등록 인원" fill="#00b6b2" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="capacity" name="정원" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Category Distribution Pie Chart */}
          {categoryDistributionData.length > 0 && (
            <ChartCard title="과목별 신청 분포">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {categoryDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value}건`, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Daily Enrollment Trend Line Chart */}
          {dailyTrendData.length > 0 && (
            <ChartCard title="일별 신청 추이 (최근 14일)">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={dailyTrendData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="신청" 
                    stroke="#00b6b2" 
                    strokeWidth={2}
                    dot={{ fill: '#00b6b2', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Enrollment Status Pie Chart */}
          {statusDistributionData.length > 0 && (
            <ChartCard title="신청 상태 현황">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent, value }) => `${name} ${value}건`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value}건`, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Class Distribution Bar Chart */}
          {classDistributionData.length > 0 && (
            <ChartCard title="반별 학생 현황">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={classDistributionData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="학생수" 
                    fill="#00b6b2" 
                    radius={[4, 4, 0, 0]}
                  >
                    {classDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      </div>

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

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="font-bold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}
