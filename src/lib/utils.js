import { PERIODS, CATEGORY_COLORS, DAYS } from '../constants';

/**
 * Generate student ID from name and last 4 digits of phone
 */
export const generateStudentId = (name, phone) => {
  return `${name.trim()}_${phone}`;
};

/**
 * Format schedule string from day, start period, and end period (legacy format)
 */
export const formatSchedule = (day, startP, endP) => {
  const startInfo = PERIODS.find(p => p.id === startP);
  const endInfo = PERIODS.find(p => p.id === endP);
  if (!startInfo || !endInfo) return `${day} (시간 미정)`;
  return `${day} ${startInfo.time} (${startP}교시) ~ ${endP}교시`;
};

/**
 * Format multi-schedule array to display string
 * e.g., [{ day: '화', startPeriod: 1, endPeriod: 2 }, { day: '수', startPeriod: 3, endPeriod: 4 }]
 * => "화 1~2교시, 수 3~4교시"
 */
export const formatSchedules = (schedules) => {
  if (!schedules || schedules.length === 0) {
    return '시간 미정';
  }
  
  // Sort schedules by day order, then by startPeriod
  const dayOrder = DAYS;
  const sorted = [...schedules].sort((a, b) => {
    const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.startPeriod - b.startPeriod;
  });
  
  return sorted.map(s => {
    const startInfo = PERIODS.find(p => p.id === s.startPeriod);
    if (s.startPeriod === s.endPeriod) {
      return `${s.day} ${s.startPeriod}교시`;
    }
    return `${s.day} ${s.startPeriod}~${s.endPeriod}교시`;
  }).join(', ');
};

/**
 * Format multi-schedule with time info
 */
export const formatSchedulesWithTime = (schedules) => {
  if (!schedules || schedules.length === 0) {
    return '시간 미정';
  }
  
  const dayOrder = DAYS;
  const sorted = [...schedules].sort((a, b) => {
    const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.startPeriod - b.startPeriod;
  });
  
  return sorted.map(s => {
    const startInfo = PERIODS.find(p => p.id === s.startPeriod);
    const time = startInfo ? startInfo.time : '';
    return `${s.day} ${time} (${s.startPeriod}~${s.endPeriod}교시)`;
  }).join(' / ');
};

/**
 * Get color classes for a category
 */
export const getCategoryColor = (category) => {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['기타'];
};

/**
 * Check if two schedule slots have time conflicts
 */
const scheduleSlotsConflict = (slot1, slot2) => {
  // Different days = no conflict
  if (slot1.day !== slot2.day) return false;
  
  // Check period overlap
  return slot1.startPeriod <= slot2.endPeriod && slot1.endPeriod >= slot2.startPeriod;
};

/**
 * Check if two courses have time conflicts (multi-schedule aware)
 * Compares ALL schedule slots of both courses
 */
export const hasTimeConflict = (course1, course2) => {
  // Get schedules arrays (supports both old and new format)
  const schedules1 = course1.schedules || [];
  const schedules2 = course2.schedules || [];
  
  // If either course has no schedules, fallback to legacy format
  const slots1 = schedules1.length > 0 ? schedules1 : getLegacyScheduleSlots(course1);
  const slots2 = schedules2.length > 0 ? schedules2 : getLegacyScheduleSlots(course2);
  
  // Check ALL combinations of slots
  for (const slot1 of slots1) {
    for (const slot2 of slots2) {
      if (scheduleSlotsConflict(slot1, slot2)) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Convert legacy course format (day, startPeriod, endPeriod) to schedule slots
 */
const getLegacyScheduleSlots = (course) => {
  if (!course.day) return [];
  
  const days = course.day.split('/');
  return days.map(day => ({
    day: day.trim(),
    startPeriod: parseInt(course.startPeriod) || 1,
    endPeriod: parseInt(course.endPeriod) || 2,
  }));
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
 * Get detailed conflict information between two courses
 * Returns array of conflicting slot pairs
 */
export const getDetailedConflicts = (course1, course2) => {
  const schedules1 = course1.schedules || getLegacyScheduleSlots(course1);
  const schedules2 = course2.schedules || getLegacyScheduleSlots(course2);
  
  const conflicts = [];
  
  for (const slot1 of schedules1) {
    for (const slot2 of schedules2) {
      if (scheduleSlotsConflict(slot1, slot2)) {
        conflicts.push({
          slot1,
          slot2,
          day: slot1.day,
          overlapStart: Math.max(slot1.startPeriod, slot2.startPeriod),
          overlapEnd: Math.min(slot1.endPeriod, slot2.endPeriod),
        });
      }
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

/**
 * Format relative time (e.g., "3분 전", "1시간 전", "어제")
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const d = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
  const now = new Date();
  const diffMs = now - d;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return '방금 전';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else if (diffDays === 1) {
    return '어제';
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return d.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  }
};
