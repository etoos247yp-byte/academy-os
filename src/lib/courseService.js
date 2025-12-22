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
 * Create a new course
 */
export const createCourse = async (courseData, adminUid) => {
  const colorConfig = getCategoryColor(courseData.category);
  
  const docRef = await addDoc(collection(db, 'courses'), {
    title: courseData.title,
    instructor: courseData.instructor,
    category: courseData.category,
    level: courseData.level,
    day: courseData.day, // e.g., "월/수"
    startPeriod: courseData.startPeriod,
    endPeriod: courseData.endPeriod,
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
 * Get all courses
 */
export const getAllCourses = async () => {
  const coursesQuery = query(
    collection(db, 'courses'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(coursesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get courses by season
 */
export const getCoursesBySeason = async (seasonId) => {
  const coursesQuery = query(
    collection(db, 'courses'),
    where('seasonId', '==', seasonId),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(coursesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get active courses for student view
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
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Subscribe to courses (real-time updates)
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
    let courses = snapshot.docs.map(doc => ({
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
 * Get a single course
 */
export const getCourse = async (courseId) => {
  const courseDoc = await getDoc(doc(db, 'courses', courseId));
  if (!courseDoc.exists()) {
    return null;
  }
  return { id: courseId, ...courseDoc.data() };
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
