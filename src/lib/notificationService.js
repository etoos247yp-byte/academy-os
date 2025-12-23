import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Notification Types
 */
export const NOTIFICATION_TYPES = {
  APPROVAL: 'approval',
  REJECTION: 'rejection',
  INFO: 'info',
};

/**
 * Create a new notification
 * @param {string} studentId - Student ID
 * @param {string} type - Notification type ('approval' | 'rejection' | 'info')
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} courseInfo - Optional course info { courseId, courseName }
 * @returns {Promise<string>} - Created notification ID
 */
export const createNotification = async (studentId, type, title, message, courseInfo = null) => {
  const notificationData = {
    studentId,
    type,
    title,
    message,
    read: false,
    createdAt: serverTimestamp(),
  };

  // Add optional course info if provided
  if (courseInfo) {
    notificationData.courseId = courseInfo.courseId || null;
    notificationData.courseName = courseInfo.courseName || null;
  }

  const docRef = await addDoc(collection(db, 'notifications'), notificationData);
  return docRef.id;
};

/**
 * Get all notifications for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} - Array of notifications
 */
export const getStudentNotifications = async (studentId) => {
  const notificationsQuery = query(
    collection(db, 'notifications'),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(notificationsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
  }));
};

/**
 * Mark a single notification as read
 * @param {string} notificationId - Notification ID
 */
export const markAsRead = async (notificationId) => {
  const notificationRef = doc(db, 'notifications', notificationId);
  await updateDoc(notificationRef, {
    read: true,
  });
};

/**
 * Mark all notifications as read for a student
 * @param {string} studentId - Student ID
 */
export const markAllAsRead = async (studentId) => {
  const notificationsQuery = query(
    collection(db, 'notifications'),
    where('studentId', '==', studentId),
    where('read', '==', false)
  );

  const snapshot = await getDocs(notificationsQuery);
  
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { read: true });
  });

  await batch.commit();
};

/**
 * Get unread notification count for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<number>} - Count of unread notifications
 */
export const getUnreadCount = async (studentId) => {
  const unreadQuery = query(
    collection(db, 'notifications'),
    where('studentId', '==', studentId),
    where('read', '==', false)
  );

  const snapshot = await getDocs(unreadQuery);
  return snapshot.size;
};

/**
 * Subscribe to notifications (real-time listener)
 * @param {string} studentId - Student ID
 * @param {Function} callback - Callback function receiving notifications array
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToNotifications = (studentId, callback) => {
  const notificationsQuery = query(
    collection(db, 'notifications'),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(notificationsQuery, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    }));
    callback(notifications);
  });
};

/**
 * Subscribe to unread count only (for badge)
 * @param {string} studentId - Student ID
 * @param {Function} callback - Callback function receiving unread count
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToUnreadCount = (studentId, callback) => {
  const unreadQuery = query(
    collection(db, 'notifications'),
    where('studentId', '==', studentId),
    where('read', '==', false)
  );

  return onSnapshot(unreadQuery, (snapshot) => {
    callback(snapshot.size);
  });
};

/**
 * Create enrollment approval notification
 * @param {string} studentId - Student ID
 * @param {string} courseName - Course name
 * @param {string} courseId - Course ID
 */
export const createApprovalNotification = async (studentId, courseName, courseId) => {
  return createNotification(
    studentId,
    NOTIFICATION_TYPES.APPROVAL,
    '수강 신청 승인',
    `"${courseName}" 수강 신청이 승인되었습니다.`,
    { courseId, courseName }
  );
};

/**
 * Create enrollment rejection notification
 * @param {string} studentId - Student ID
 * @param {string} courseName - Course name
 * @param {string} courseId - Course ID
 * @param {string} reason - Rejection reason
 */
export const createRejectionNotification = async (studentId, courseName, courseId, reason) => {
  return createNotification(
    studentId,
    NOTIFICATION_TYPES.REJECTION,
    '수강 신청 반려',
    `"${courseName}" 수강 신청이 반려되었습니다. 사유: ${reason}`,
    { courseId, courseName }
  );
};
