import { PERIODS, CATEGORY_COLORS } from '../constants';

/**
 * Generate student ID from name and last 4 digits of phone
 */
export const generateStudentId = (name, phone) => {
  return `${name.trim()}_${phone}`;
};

/**
 * Format schedule string from day, start period, and end period
 */
export const formatSchedule = (day, startP, endP) => {
  const startInfo = PERIODS.find(p => p.id === startP);
  const endInfo = PERIODS.find(p => p.id === endP);
  if (!startInfo || !endInfo) return `${day} (시간 미정)`;
  return `${day} ${startInfo.time} (${startP}교시) ~ ${endP}교시`;
};

/**
 * Get color classes for a category
 */
export const getCategoryColor = (category) => {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['기타'];
};

/**
 * Check if two courses have time conflicts
 */
export const hasTimeConflict = (course1, course2) => {
  // Parse days
  const days1 = course1.day.split('/');
  const days2 = course2.day.split('/');
  
  // Check if any days overlap
  const daysOverlap = days1.some(d => days2.includes(d));
  if (!daysOverlap) return false;
  
  // Check if periods overlap
  const periodsOverlap = 
    course1.startPeriod <= course2.endPeriod && 
    course1.endPeriod >= course2.startPeriod;
  
  return periodsOverlap;
};

/**
 * Check if a new course conflicts with any enrolled courses
 */
export const checkConflicts = (newCourse, enrolledCourses) => {
  const conflicts = [];
  
  for (const enrolled of enrolledCourses) {
    if (hasTimeConflict(newCourse, enrolled)) {
      conflicts.push(enrolled);
    }
  }
  
  return conflicts;
};

/**
 * Check if current date is within change period
 */
export const isWithinChangePeriod = (student) => {
  if (!student.changeStartDate || !student.changeEndDate) {
    return false;
  }
  
  const now = new Date();
  const start = student.changeStartDate.toDate ? student.changeStartDate.toDate() : new Date(student.changeStartDate);
  const end = student.changeEndDate.toDate ? student.changeEndDate.toDate() : new Date(student.changeEndDate);
  
  return now >= start && now <= end;
};

/**
 * Format date for display
 */
export const formatDate = (date) => {
  if (!date) return '-';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Format datetime for display
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format currency (Korean Won)
 */
export const formatCurrency = (amount) => {
  return amount.toLocaleString('ko-KR') + '원';
};

/**
 * Calculate total course fee
 */
export const calculateTotalFee = (courses, pricePerCourse = 350000) => {
  return courses.length * pricePerCourse;
};
