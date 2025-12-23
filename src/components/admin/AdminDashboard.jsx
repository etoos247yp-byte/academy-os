import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Clock, CheckCircle, Calendar, ArrowRight, BarChart3, TrendingDown, User, X } from 'lucide-react';
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

const INSTRUCTOR_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

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

// Helper function to aggregate instructor data
const aggregateInstructorData = (courses) => {
  const instructorMap = {};
  
  courses.forEach(course => {
    const instructor = course.instructor || '미지정';
    if (!instructorMap[instructor]) {
      instructorMap[instructor] = {
        name: instructor,
        courseCount: 0,
        totalEnrolled: 0,
        totalCapacity: 0,
        courses: [],
      };
    }
    instructorMap[instructor].courseCount++;
    instructorMap[instructor].totalEnrolled += course.enrolled || 0;
    instructorMap[instructor].totalCapacity += course.capacity || 0;
    instructorMap[instructor].courses.push(course);
  });
  
  return Object.values(instructorMap)
    .sort((a, b) => b.totalEnrolled - a.totalEnrolled)
    .map((data, index) => ({
      ...data,
      fill: INSTRUCTOR_COLORS[index % INSTRUCTOR_COLORS.length],
    }));
};

// Helper function to calculate cancellation rate
const calculateCancellationStats = (enrollments, seasons) => {
  // 현재 활성 시즌 찾기
  const activeSeason = seasons.find(s => s.isActive);
  const changePeriodDays = activeSeason?.changePeriodDays || 7;
  
  // 지난 30일간의 데이터만 분석
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentEnrollments = enrollments.filter(e => {
    const enrolledAt = e.enrolledAt?.toDate?.() || 
      (e.enrolledAt?.seconds ? new Date(e.enrolledAt.seconds * 1000) : null);
    if (!enrolledAt) return false;
    return enrolledAt >= thirtyDaysAgo;
  });
  
  const totalEnrollments = recentEnrollments.filter(e => 
    e.status === 'approved' || e.status === 'cancelled'
  ).length;
  
  const cancelledWithinPeriod = recentEnrollments.filter(e => {
    if (e.status !== 'cancelled') return false;
    
    const enrolledAt = e.enrolledAt?.toDate?.() || 
      (e.enrolledAt?.seconds ? new Date(e.enrolledAt.seconds * 1000) : null);
    const cancelledAt = e.cancelledAt?.toDate?.() || 
      (e.cancelledAt?.seconds ? new Date(e.cancelledAt.seconds * 1000) : null);
    
    if (!enrolledAt || !cancelledAt) return false;
    
    const daysDiff = (cancelledAt - enrolledAt) / (1000 * 60 * 60 * 24);
    return daysDiff <= changePeriodDays;
  }).length;
  
  return {
    total: totalEnrollments,
    cancelled: cancelledWithinPeriod,
    rate: totalEnrollments > 0 ? ((cancelledWithinPeriod / totalEnrollments) * 100).toFixed(1) : '0',
    periodDays: changePeriodDays,
  };
};

// Helper function to calculate enrollment stats
const calculateEnrollmentStats = (courses) => {
  const activeCourses = courses.filter(c => c.isActive);
  const totalEnrolled = activeCourses.reduce((sum, c) => sum + (c.enrolled || 0), 0);
  const totalCapacity = activeCourses.reduce((sum, c) => sum + (c.capacity || 0), 0);
  const avgEnrolled = activeCourses.length > 0 
    ? (totalEnrolled / activeCourses.length).toFixed(1) 
    : '0';
  
  return {
    totalEnrolled,
    totalCapacity,
    avgEnrolled,
    courseCount: activeCourses.length,
    fillRate: totalCapacity > 0 ? ((totalEnrolled / totalCapacity) * 100).toFixed(1) : '0',
  };
};

// Helper function to calculate courses per student
const calculateCoursesPerStudent = (students, enrollments) => {
  // 승인된 수강신청만 카운트
  const approvedEnrollments = enrollments.filter(e => e.status === 'approved');
  
  // 학생별 수강 강좌 수 집계
  const studentCourseCount = {};
  approvedEnrollments.forEach(e => {
    studentCourseCount[e.studentId] = (studentCourseCount[e.studentId] || 0) + 1;
  });
  
  // 반에 배정된 학생만 필터링 (미배정 제외)
  const assignedStudents = students.filter(s => s.class && s.class !== '미배정');
  
  // === 전체 통계 (반 배정된 학생만) ===
  const studentsWithCourses = assignedStudents.filter(s => studentCourseCount[s.id] > 0);
  const totalCoursesForActive = studentsWithCourses.reduce((sum, s) => 
    sum + (studentCourseCount[s.id] || 0), 0);
  const totalCoursesForAll = assignedStudents.reduce((sum, s) => 
    sum + (studentCourseCount[s.id] || 0), 0);
  
  const overall = {
    // 수강 학생 기준
    avgForActive: studentsWithCourses.length > 0 
      ? (totalCoursesForActive / studentsWithCourses.length).toFixed(1) 
      : '0',
    activeStudentCount: studentsWithCourses.length,
    // 전체 학생 기준
    avgForAll: assignedStudents.length > 0 
      ? (totalCoursesForAll / assignedStudents.length).toFixed(1) 
      : '0',
    totalStudentCount: assignedStudents.length,
    // 수강률
    participationRate: assignedStudents.length > 0
      ? ((studentsWithCourses.length / assignedStudents.length) * 100).toFixed(0)
      : '0',
  };
  
  // === 반별 통계 ===
  const classStats = {};
  assignedStudents.forEach(student => {
    const className = student.class;
    if (!classStats[className]) {
      classStats[className] = { 
        activeStudents: [], 
        allStudents: [],
      };
    }
    classStats[className].allStudents.push(student);
    if (studentCourseCount[student.id] > 0) {
      classStats[className].activeStudents.push(student);
    }
  });
  
  const byClass = Object.entries(classStats).map(([name, data]) => {
    const totalForActive = data.activeStudents.reduce((sum, s) => 
      sum + (studentCourseCount[s.id] || 0), 0);
    const totalForAll = data.allStudents.reduce((sum, s) => 
      sum + (studentCourseCount[s.id] || 0), 0);
    
    return {
      name,
      // 수강 학생 기준
      avgForActive: data.activeStudents.length > 0 
        ? (totalForActive / data.activeStudents.length).toFixed(1) 
        : '0',
      activeCount: data.activeStudents.length,
      // 전체 학생 기준  
      avgForAll: data.allStudents.length > 0 
        ? (totalForAll / data.allStudents.length).toFixed(1) 
        : '0',
      totalCount: data.allStudents.length,
    };
  }).sort((a, b) => a.name.localeCompare(b.name)); // 반 이름순 정렬
  
  return { overall, byClass };
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
    seasons: [],
  });
  const [selectedInstructor, setSelectedInstructor] = useState(null);

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
          seasons,
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

  const instructorData = useMemo(
    () => aggregateInstructorData(rawData.courses),
    [rawData.courses]
  );

  const cancellationStats = useMemo(
    () => calculateCancellationStats(rawData.enrollments, rawData.seasons),
    [rawData.enrollments, rawData.seasons]
  );

  const enrollmentStats = useMemo(
    () => calculateEnrollmentStats(rawData.courses),
    [rawData.courses]
  );

  const coursesPerStudent = useMemo(
    () => calculateCoursesPerStudent(rawData.students, rawData.enrollments),
    [rawData.students, rawData.enrollments]
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

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">총 수강 인원</div>
              <div className="text-2xl font-bold text-slate-900">{enrollmentStats.totalEnrolled}명</div>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            전체 정원 {enrollmentStats.totalCapacity}명 중 {enrollmentStats.fillRate}% 충원
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">평균 수강 인원</div>
              <div className="text-2xl font-bold text-slate-900">{enrollmentStats.avgEnrolled}명</div>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            강좌당 평균 ({enrollmentStats.courseCount}개 강좌 기준)
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">정정기간 내 취소율</div>
              <div className="text-2xl font-bold text-slate-900">{cancellationStats.rate}%</div>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            최근 30일 기준 ({cancellationStats.periodDays}일 이내 취소 {cancellationStats.cancelled}건)
          </div>
        </div>
      </div>

      {/* Courses Per Student Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-[#00b6b2]" />
          학생당 평균 수강
        </h3>
        
        {/* 전체 통계 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {coursesPerStudent.overall.avgForActive}개
            </div>
            <div className="text-sm text-blue-600">수강 학생 기준</div>
            <div className="text-xs text-blue-400 mt-1">
              ({coursesPerStudent.overall.activeStudentCount}명이 수강 중)
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-700">
              {coursesPerStudent.overall.avgForAll}개
            </div>
            <div className="text-sm text-slate-600">전체 학생 기준</div>
            <div className="text-xs text-slate-400 mt-1">
              (전체 {coursesPerStudent.overall.totalStudentCount}명)
            </div>
          </div>
        </div>
        
        {/* 수강률 */}
        <div className="bg-green-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700">수강률</span>
            <span className="font-bold text-green-700">
              {coursesPerStudent.overall.participationRate}%
              <span className="font-normal text-green-600 ml-1">
                ({coursesPerStudent.overall.totalStudentCount}명 중 {coursesPerStudent.overall.activeStudentCount}명 수강)
              </span>
            </span>
          </div>
          <div className="w-full bg-green-200 rounded-full h-2 mt-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${coursesPerStudent.overall.participationRate}%` }}
            />
          </div>
        </div>
        
        {/* 반별 현황 */}
        {coursesPerStudent.byClass.length > 0 && (
          <>
            <div className="text-sm font-medium text-slate-700 mb-2">반별 현황</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {coursesPerStudent.byClass.map(cls => (
                <div key={cls.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700 min-w-[60px]">{cls.name}</span>
                  <div className="flex gap-6 text-sm">
                    <div className="text-blue-600">
                      <span className="font-medium">{cls.avgForActive}개</span>
                      <span className="text-blue-400 ml-1">수강자 ({cls.activeCount}명)</span>
                    </div>
                    <div className="text-slate-500">
                      <span className="font-medium">{cls.avgForAll}개</span>
                      <span className="text-slate-400 ml-1">전체 ({cls.totalCount}명)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {coursesPerStudent.byClass.length === 0 && coursesPerStudent.overall.totalStudentCount === 0 && (
          <div className="text-center py-4 text-slate-400">
            반에 배정된 학생이 없습니다.
          </div>
        )}
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

          {/* Instructor Data Bar Chart */}
          {instructorData.length > 0 && (
            <ChartCard title="강사별 수강 현황">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={instructorData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-medium text-slate-900">{data.name}</p>
                            <p className="text-sm text-slate-600">강좌 수: {data.courseCount}개</p>
                            <p className="text-sm text-slate-600">수강 인원: {data.totalEnrolled}명</p>
                            <p className="text-sm text-slate-500">전체 정원: {data.totalCapacity}명</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="totalEnrolled" 
                    name="수강 인원" 
                    fill="#00b6b2" 
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => setSelectedInstructor(data)}
                    className="cursor-pointer"
                  >
                    {instructorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-400 text-center mt-2">
                막대를 클릭하면 해당 강사의 강좌 목록을 볼 수 있습니다.
              </p>
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

      {/* Instructor Courses Modal */}
      {selectedInstructor && (
        <InstructorCoursesModal
          instructor={selectedInstructor}
          onClose={() => setSelectedInstructor(null)}
        />
      )}
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

function InstructorCoursesModal({ instructor, onClose }) {
  const navigate = useNavigate();
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: instructor.fill + '20' }}>
              <User className="w-5 h-5" style={{ color: instructor.fill }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{instructor.name} 강사</h2>
              <p className="text-sm text-slate-500">
                {instructor.courseCount}개 강좌 | 수강생 {instructor.totalEnrolled}명
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {instructor.courses.map((course) => (
              <div
                key={course.id}
                className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">{course.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${CATEGORY_COLORS[course.category]?.bg || 'bg-slate-100'} ${CATEGORY_COLORS[course.category]?.text || 'text-slate-600'}`}>
                        {course.category}
                      </span>
                      <span>{course.day} {course.startPeriod}~{course.endPeriod}교시</span>
                      {course.room && <span>{course.room}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">
                      {course.enrolled}/{course.capacity}
                    </div>
                    <div className="text-xs text-slate-500">수강/정원</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(100, (course.enrolled / course.capacity) * 100)}%`,
                        backgroundColor: instructor.fill 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
          >
            닫기
          </button>
          <button
            onClick={() => {
              onClose();
              navigate('/admin/courses');
            }}
            className="flex-1 py-2.5 bg-[#00b6b2] text-white rounded-xl font-medium hover:bg-[#009da0]"
          >
            강좌 관리로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
