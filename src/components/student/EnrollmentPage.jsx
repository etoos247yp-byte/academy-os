import { useState, useEffect, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { useStudent } from '../../contexts/StudentContext';
import { subscribeToCourses } from '../../lib/courseService';
import { submitEnrollmentRequest } from '../../lib/enrollmentService';
import { getActiveSeasons } from '../../lib/seasonService';
import { checkConflicts } from '../../lib/utils';
import { CATEGORIES } from '../../constants';
import CourseCard from './CourseCard';
import CartSidebar from './CartSidebar';
import LoadingSpinner from '../common/LoadingSpinner';
import AlertModal from '../common/AlertModal';

export default function EnrollmentPage() {
  const { student, enrollments } = useStudent();
  const [courses, setCourses] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart state
  const [cart, setCart] = useState([]);

  // Alert modal state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    details: [],
    type: 'info',
  });

  const showAlert = (title, message, details = [], type = 'info') => {
    setAlertModal({ isOpen: true, title, message, details, type });
  };

  const closeAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Load seasons on mount
  useEffect(() => {
    const loadSeasons = async () => {
      try {
        console.log('Loading active seasons...');
        const activeSeasons = await getActiveSeasons();
        console.log('Active seasons loaded:', activeSeasons);
        setSeasons(activeSeasons);
        if (activeSeasons.length > 0) {
          setSelectedSeason(activeSeasons[0].id);
          console.log('Selected season:', activeSeasons[0].id);
        } else {
          console.log('No active seasons found');
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load seasons:', error);
        setLoading(false);
      }
    };
    loadSeasons();
  }, []);

  // Subscribe to courses when season changes
  useEffect(() => {
    if (!selectedSeason) {
      console.log('No season selected, skipping course load');
      setLoading(false);
      return;
    }

    console.log('Subscribing to courses for season:', selectedSeason);
    setLoading(true);
    const unsubscribe = subscribeToCourses(selectedSeason, (coursesData) => {
      console.log('Courses received:', coursesData);
      setCourses(coursesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedSeason]);

  // Create a map of enrolled course IDs to their status
  const enrollmentStatusMap = useMemo(() => {
    const map = {};
    enrollments.forEach(enrollment => {
      map[enrollment.courseId] = enrollment.status;
    });
    return map;
  }, [enrollments]);

  // Get enrolled courses for conflict checking
  const enrolledCourses = useMemo(() => {
    return courses.filter(course => enrollmentStatusMap[course.id]);
  }, [courses, enrollmentStatusMap]);

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesCategory = selectedCategory === '전체' || course.category === selectedCategory;
      const matchesSearch = 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        course.instructor.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [courses, selectedCategory, searchQuery]);

  const addToCart = (course) => {
    // Check if already in cart
    if (cart.some(c => c.id === course.id)) {
      showAlert('알림', '이미 장바구니에 담긴 강좌입니다.', [], 'info');
      return;
    }

    // Check if already enrolled
    if (enrollmentStatusMap[course.id]) {
      showAlert('알림', '이미 신청한 강좌입니다.', [], 'info');
      return;
    }

    // Check for time conflicts with enrolled courses
    const enrolledConflicts = checkConflicts(course, enrolledCourses);
    if (enrolledConflicts.length > 0) {
      showAlert(
        '동일 시간 중복',
        '이미 신청한 강좌와 시간이 중복됩니다:',
        enrolledConflicts.map(c => c.title),
        'warning'
      );
      return;
    }

    // Check for time conflicts with cart
    const cartConflicts = checkConflicts(course, cart);
    if (cartConflicts.length > 0) {
      showAlert(
        '동일 시간 중복',
        '장바구니에 담긴 강좌와 시간이 중복됩니다:',
        cartConflicts.map(c => c.title),
        'warning'
      );
      return;
    }

    setCart([...cart, course]);
  };

  const removeFromCart = (courseId) => {
    setCart(cart.filter(c => c.id !== courseId));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    
    setSubmitting(true);
    try {
      const courseIds = cart.map(c => c.id);
      const results = await submitEnrollmentRequest(student.id, courseIds, selectedSeason);
      
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        showAlert(
          '신청 실패',
          '일부 강좌 신청에 실패했습니다:',
          failures.map(f => f.error),
          'error'
        );
      } else {
        showAlert(
          '신청 완료',
          '수강 신청이 완료되었습니다. 관리자 승인 후 수강 확정됩니다.',
          [],
          'success'
        );
      }
      
      // Clear cart
      setCart([]);
    } catch (error) {
      console.error('Submit error:', error);
      showAlert('오류', '신청 처리 중 오류가 발생했습니다.', [], 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && courses.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <LoadingSpinner message="강좌 목록을 불러오는 중..." />
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
          원하는 강좌를 <span className="text-[#00b6b2]">탐색</span>하세요
        </h1>
        <p className="text-lg text-slate-500">
          성적 향상을 위한 최고의 강사진과 커리큘럼이 준비되어 있습니다.<br/>
          원하는 과목, 시간대를 선택하여 나만의 시간표를 완성하세요.
        </p>
      </div>

      {/* Season Selector */}
      {seasons.length > 1 && (
        <div className="mb-6 flex justify-center">
          <select
            value={selectedSeason || ''}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00b6b2]"
          >
            {seasons.map(season => (
              <option key={season.id} value={season.id}>{season.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 sticky top-20 z-40 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="강좌명, 강사명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b6b2] focus:border-transparent text-sm transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Course List */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              개설 강좌 
              <span className="text-slate-400 font-normal ml-2">{filteredCourses.length}건</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCourses.map(course => (
              <CourseCard 
                key={course.id} 
                course={course} 
                onAdd={addToCart} 
                isInCart={cart.some(c => c.id === course.id)}
                enrollmentStatus={enrollmentStatusMap[course.id]}
              />
            ))}
            
            {filteredCourses.length === 0 && (
              <div className="col-span-full py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400">
                  {courses.length === 0 
                    ? '개설된 강좌가 없습니다.' 
                    : '검색 조건에 맞는 강좌가 없습니다.'}
                </p>
                {courses.length > 0 && (
                  <button 
                    onClick={() => { setSelectedCategory('전체'); setSearchQuery(''); }}
                    className="mt-4 text-[#00b6b2] font-medium hover:underline"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Cart & Schedule */}
        <div className="lg:col-span-1">
          <CartSidebar 
            cart={cart} 
            enrolledCourses={enrolledCourses}
            onRemove={removeFromCart}
            onSubmit={handleSubmit}
            studentName={student?.name}
            loading={submitting}
          />
        </div>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        details={alertModal.details}
        type={alertModal.type}
      />
    </main>
  );
}
