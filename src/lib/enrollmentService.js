import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { ENROLLMENT_STATUS } from '../constants';

/**
 * Submit enrollment request (batch - multiple courses at once)
 */
export const submitEnrollmentRequest = async (studentId, courseIds, seasonId) => {
  const results = [];
  
  for (const courseId of courseIds) {
    try {
      const result = await runTransaction(db, async (transaction) => {
        // Get course document
        const courseRef = doc(db, 'courses', courseId);
        const courseDoc = await transaction.get(courseRef);
        
        if (!courseDoc.exists()) {
          throw new Error('강좌를 찾을 수 없습니다.');
        }
        
        const courseData = courseDoc.data();
        
        // Check capacity (pending + approved count toward capacity)
        if (courseData.enrolled >= courseData.capacity) {
          throw new Error(`${courseData.title}: 수강 인원이 마감되었습니다.`);
        }
        
        // Check for existing enrollment
        const existingQuery = query(
          collection(db, 'enrollments'),
          where('studentId', '==', studentId),
          where('courseId', '==', courseId),
          where('status', 'in', ['pending', 'approved'])
        );
        const existingDocs = await getDocs(existingQuery);
        
        if (!existingDocs.empty) {
          throw new Error(`${courseData.title}: 이미 신청한 강좌입니다.`);
        }
        
        // Create enrollment
        const enrollmentRef = doc(collection(db, 'enrollments'));
        transaction.set(enrollmentRef, {
          courseId,
          studentId,
          seasonId,
          status: ENROLLMENT_STATUS.PENDING,
          enrolledAt: serverTimestamp(),
          approvedAt: null,
          approvedBy: null,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null,
        });
        
        // Increment enrolled count
        transaction.update(courseRef, {
          enrolled: courseData.enrolled + 1,
        });
        
        return { courseId, success: true, enrollmentId: enrollmentRef.id };
      });
      
      results.push(result);
    } catch (error) {
      results.push({ courseId, success: false, error: error.message });
    }
  }
  
  return results;
};

/**
 * Get all enrollments for a student
 */
export const getStudentEnrollments = async (studentId) => {
  const enrollmentsQuery = query(
    collection(db, 'enrollments'),
    where('studentId', '==', studentId),
    orderBy('enrolledAt', 'desc')
  );
  
  const snapshot = await getDocs(enrollmentsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Subscribe to student enrollments (real-time)
 */
export const subscribeToStudentEnrollments = (studentId, callback) => {
  const enrollmentsQuery = query(
    collection(db, 'enrollments'),
    where('studentId', '==', studentId),
    where('status', 'in', ['pending', 'approved'])
  );
  
  return onSnapshot(enrollmentsQuery, (snapshot) => {
    const enrollments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(enrollments);
  });
};

/**
 * Get pending enrollment requests (for admin)
 */
export const getPendingEnrollments = async () => {
  const enrollmentsQuery = query(
    collection(db, 'enrollments'),
    where('status', '==', ENROLLMENT_STATUS.PENDING),
    orderBy('enrolledAt', 'asc')
  );
  
  const snapshot = await getDocs(enrollmentsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Subscribe to pending enrollments (for admin dashboard)
 */
export const subscribeToPendingEnrollments = (callback) => {
  const enrollmentsQuery = query(
    collection(db, 'enrollments'),
    where('status', '==', ENROLLMENT_STATUS.PENDING),
    orderBy('enrolledAt', 'asc')
  );
  
  return onSnapshot(enrollmentsQuery, (snapshot) => {
    const enrollments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(enrollments);
  });
};

/**
 * Get all enrollments (for admin)
 */
export const getAllEnrollments = async (filters = {}) => {
  let enrollmentsQuery = collection(db, 'enrollments');
  const constraints = [];
  
  if (filters.seasonId) {
    constraints.push(where('seasonId', '==', filters.seasonId));
  }
  if (filters.status) {
    constraints.push(where('status', '==', filters.status));
  }
  if (filters.courseId) {
    constraints.push(where('courseId', '==', filters.courseId));
  }
  
  constraints.push(orderBy('enrolledAt', 'desc'));
  
  enrollmentsQuery = query(enrollmentsQuery, ...constraints);
  
  const snapshot = await getDocs(enrollmentsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Approve an enrollment request
 */
export const approveEnrollment = async (enrollmentId, adminUid) => {
  const enrollmentRef = doc(db, 'enrollments', enrollmentId);
  
  await updateDoc(enrollmentRef, {
    status: ENROLLMENT_STATUS.APPROVED,
    approvedAt: serverTimestamp(),
    approvedBy: adminUid,
  });
};

/**
 * Reject an enrollment request
 */
export const rejectEnrollment = async (enrollmentId, adminUid, reason) => {
  await runTransaction(db, async (transaction) => {
    const enrollmentRef = doc(db, 'enrollments', enrollmentId);
    const enrollmentDoc = await transaction.get(enrollmentRef);
    
    if (!enrollmentDoc.exists()) {
      throw new Error('신청 내역을 찾을 수 없습니다.');
    }
    
    const enrollmentData = enrollmentDoc.data();
    
    // Decrement enrolled count
    const courseRef = doc(db, 'courses', enrollmentData.courseId);
    const courseDoc = await transaction.get(courseRef);
    
    if (courseDoc.exists()) {
      const currentEnrolled = courseDoc.data().enrolled || 0;
      transaction.update(courseRef, {
        enrolled: Math.max(0, currentEnrolled - 1),
      });
    }
    
    // Update enrollment status
    transaction.update(enrollmentRef, {
      status: ENROLLMENT_STATUS.REJECTED,
      rejectedAt: serverTimestamp(),
      rejectedBy: adminUid,
      rejectionReason: reason,
    });
  });
};

/**
 * Cancel an enrollment (by student, within change period)
 */
export const cancelEnrollment = async (enrollmentId) => {
  await runTransaction(db, async (transaction) => {
    const enrollmentRef = doc(db, 'enrollments', enrollmentId);
    const enrollmentDoc = await transaction.get(enrollmentRef);
    
    if (!enrollmentDoc.exists()) {
      throw new Error('신청 내역을 찾을 수 없습니다.');
    }
    
    const enrollmentData = enrollmentDoc.data();
    
    // Decrement enrolled count
    const courseRef = doc(db, 'courses', enrollmentData.courseId);
    const courseDoc = await transaction.get(courseRef);
    
    if (courseDoc.exists()) {
      const currentEnrolled = courseDoc.data().enrolled || 0;
      transaction.update(courseRef, {
        enrolled: Math.max(0, currentEnrolled - 1),
      });
    }
    
    // Update enrollment status
    transaction.update(enrollmentRef, {
      status: ENROLLMENT_STATUS.CANCELLED,
      cancelledAt: serverTimestamp(),
    });
  });
};

/**
 * Batch approve enrollments
 */
export const batchApproveEnrollments = async (enrollmentIds, adminUid) => {
  const promises = enrollmentIds.map(id => approveEnrollment(id, adminUid));
  await Promise.all(promises);
};

/**
 * Get enrollments by course (for admin to see who enrolled)
 */
export const getEnrollmentsByCourse = async (courseId) => {
  const enrollmentsQuery = query(
    collection(db, 'enrollments'),
    where('courseId', '==', courseId),
    where('status', 'in', ['pending', 'approved']),
    orderBy('enrolledAt', 'asc')
  );
  
  const snapshot = await getDocs(enrollmentsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get ALL enrollments for a student (including rejected, cancelled)
 * For viewing complete history
 */
export const getStudentAllEnrollments = async (studentId) => {
  const enrollmentsQuery = query(
    collection(db, 'enrollments'),
    where('studentId', '==', studentId),
    orderBy('enrolledAt', 'desc')
  );
  
  const snapshot = await getDocs(enrollmentsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
