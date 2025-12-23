import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { getCategoryColor } from './utils';

/**
 * Normalize course data to always have schedules array
 * Provides backward compatibility for old schema (day, startPeriod, endPeriod)
 */
export const normalizeCourseSchedules = (course) => {
  if (!course) return course;
  
  // If already has schedules array, return as-is
  if (course.schedules && Array.isArray(course.schedules) && course.schedules.length > 0) {
    return course;
  }
  
  // Convert old schema to schedules array
  if (course.day) {
    const days = course.day.split('/');
    const schedules = days.map(day => ({
      day: day.trim(),
      startPeriod: parseInt(course.startPeriod) || 1,
      endPeriod: parseInt(course.endPeriod) || 2,
    }));
    
    return {
      ...course,
      schedules,
    };
  }
  
  // No schedule data at all - return with empty schedules
  return {
    ...course,
    schedules: [],
  };
};

/**
 * Convert schedules array to legacy format for display/compatibility
 * Returns a combined day string (e.g., "월/수") and period info from first schedule
 */
export const schedulesToLegacyFormat = (schedules) => {
  if (!schedules || schedules.length === 0) {
    return { day: '', startPeriod: 1, endPeriod: 2 };
  }
  
  // Get unique days from all schedules
  const days = [...new Set(schedules.map(s => s.day))];
  const dayOrder = ['월', '화', '수', '목', '금', '토', '일'];
  days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
  
  // For startPeriod and endPeriod, use the first schedule (for backward compat)
  return {
    day: days.join('/'),
    startPeriod: schedules[0].startPeriod,
    endPeriod: schedules[0].endPeriod,
  };
};

/**
 * Create a new course
 */
export const createCourse = async (courseData, adminUid) => {
  const colorConfig = getCategoryColor(courseData.category);
  
  // Build schedules array from courseData
  const schedules = courseData.schedules || [];
  
  // Also store legacy fields for backward compatibility
  const legacyFormat = schedulesToLegacyFormat(schedules);
  
  const docRef = await addDoc(collection(db, 'courses'), {
    title: courseData.title,
    instructor: courseData.instructor,
    category: courseData.category,
    level: courseData.level,
    // Store both new and legacy format
    schedules: schedules,
    day: legacyFormat.day,
    startPeriod: legacyFormat.startPeriod,
    endPeriod: legacyFormat.endPeriod,
    room: courseData.room,
    capacity: courseData.capacity,
    enrolled: 0,
    description: courseData.description || '',
    seasonId: courseData.seasonId,
    isActive: true,
    color: `${colorConfig.bg} ${colorConfig.text}`,
    createdAt: serverTimestamp(),
    createdBy: adminUid,
  });
  
  return docRef.id;
};

/**
 * Get all courses (with schedule normalization)
 */
export const getAllCourses = async () => {
  const coursesQuery = query(
    collection(db, 'courses'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(coursesQuery);
  return snapshot.docs.map(doc => normalizeCourseSchedules({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get courses by season (with schedule normalization)
 */
export const getCoursesBySeason = async (seasonId) => {
  const coursesQuery = query(
    collection(db, 'courses'),
    where('seasonId', '==', seasonId),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(coursesQuery);
  return snapshot.docs.map(doc => normalizeCourseSchedules({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get active courses for student view (with schedule normalization)
 */
export const getActiveCourses = async (seasonId) => {
  let coursesQuery;
  
  if (seasonId) {
    coursesQuery = query(
      collection(db, 'courses'),
      where('seasonId', '==', seasonId),
      where('isActive', '==', true)
    );
  } else {
    coursesQuery = query(
      collection(db, 'courses'),
      where('isActive', '==', true)
    );
  }
  
  const snapshot = await getDocs(coursesQuery);
  return snapshot.docs.map(doc => normalizeCourseSchedules({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Subscribe to courses (real-time updates with schedule normalization)
 */
export const subscribeToCourses = (seasonId, callback) => {
  let coursesQuery;
  
  if (seasonId) {
    // Use only seasonId filter, filter isActive in memory to avoid composite index
    coursesQuery = query(
      collection(db, 'courses'),
      where('seasonId', '==', seasonId)
    );
  } else {
    coursesQuery = query(
      collection(db, 'courses'),
      where('isActive', '==', true)
    );
  }
  
  return onSnapshot(coursesQuery, (snapshot) => {
    let courses = snapshot.docs.map(doc => normalizeCourseSchedules({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter isActive in memory if we queried by seasonId
    if (seasonId) {
      courses = courses.filter(c => c.isActive === true);
    }
    
    callback(courses);
  }, (error) => {
    console.error('subscribeToCourses error:', error);
    callback([]);
  });
};

/**
 * Get a single course (with schedule normalization)
 */
export const getCourse = async (courseId) => {
  const courseDoc = await getDoc(doc(db, 'courses', courseId));
  if (!courseDoc.exists()) {
    return null;
  }
  return normalizeCourseSchedules({ id: courseId, ...courseDoc.data() });
};

/**
 * Update a course
 */
export const updateCourse = async (courseId, updates) => {
  // If category is being updated, update color as well
  if (updates.category) {
    const colorConfig = getCategoryColor(updates.category);
    updates.color = `${colorConfig.bg} ${colorConfig.text}`;
  }
  
  // If schedules are being updated, also update legacy fields
  if (updates.schedules) {
    const legacyFormat = schedulesToLegacyFormat(updates.schedules);
    updates.day = legacyFormat.day;
    updates.startPeriod = legacyFormat.startPeriod;
    updates.endPeriod = legacyFormat.endPeriod;
  }
  
  await updateDoc(doc(db, 'courses', courseId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Toggle course active status
 */
export const toggleCourseActive = async (courseId, isActive) => {
  await updateDoc(doc(db, 'courses', courseId), {
    isActive,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a course
 */
export const deleteCourse = async (courseId) => {
  // Note: Consider checking for existing enrollments before deletion
  await deleteDoc(doc(db, 'courses', courseId));
};

/**
 * Update enrolled count (used internally by enrollment service)
 */
export const updateEnrolledCount = async (courseId, increment) => {
  const courseDoc = await getDoc(doc(db, 'courses', courseId));
  if (!courseDoc.exists()) {
    throw new Error('강좌를 찾을 수 없습니다.');
  }
  
  const currentEnrolled = courseDoc.data().enrolled || 0;
  const newEnrolled = Math.max(0, currentEnrolled + increment);
  
  await updateDoc(doc(db, 'courses', courseId), {
    enrolled: newEnrolled,
    updatedAt: serverTimestamp(),
  });
  
  return newEnrolled;
};

/**
 * Batch create courses from Excel upload
 * @param {Array} coursesData - Array of course data
 * @param {string} adminUid - Admin user ID
 * @param {string} seasonId - Season ID to assign courses to
 * @returns {Array} Results with success/failure status for each course
 */
export const batchCreateCourses = async (coursesData, adminUid, seasonId) => {
  const results = [];
  
  for (const courseData of coursesData) {
    try {
      // Validate required fields
      if (!courseData.title || !courseData.instructor) {
        throw new Error('필수 항목 누락 (강좌명, 강사)');
      }
      
      // Schedules should already be normalized by excelUtils
      if (!courseData.schedules || courseData.schedules.length === 0) {
        throw new Error('시간표 정보가 없습니다.');
      }
      
      const colorConfig = getCategoryColor(courseData.category || '수학');
      const legacyFormat = schedulesToLegacyFormat(courseData.schedules);
      
      const docRef = await addDoc(collection(db, 'courses'), {
        title: courseData.title,
        instructor: courseData.instructor,
        category: courseData.category || '수학',
        level: courseData.level || '중급',
        schedules: courseData.schedules,
        day: legacyFormat.day,
        startPeriod: legacyFormat.startPeriod,
        endPeriod: legacyFormat.endPeriod,
        room: courseData.room || '',
        capacity: parseInt(courseData.capacity) || 20,
        enrolled: 0,
        description: courseData.description || '',
        seasonId: seasonId,
        isActive: true,
        color: `${colorConfig.bg} ${colorConfig.text}`,
        createdAt: serverTimestamp(),
        createdBy: adminUid,
      });
      
      results.push({
        ...courseData,
        success: true,
        courseId: docRef.id
      });
    } catch (error) {
      results.push({
        ...courseData,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};
