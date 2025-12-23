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
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Attendance Schema:
 * {
 *   id,
 *   courseId,
 *   studentId,
 *   date: string (YYYY-MM-DD format),
 *   status: 'present' | 'absent' | 'late' | 'excused',
 *   note: string (optional),
 *   checkedBy: string (admin uid),
 *   checkedAt: timestamp
 * }
 */

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
};

export const ATTENDANCE_STATUS_CONFIG = {
  present: { label: '출석', color: 'bg-green-100 text-green-800', badgeColor: 'bg-green-500' },
  absent: { label: '결석', color: 'bg-red-100 text-red-800', badgeColor: 'bg-red-500' },
  late: { label: '지각', color: 'bg-yellow-100 text-yellow-800', badgeColor: 'bg-yellow-500' },
  excused: { label: '사유', color: 'bg-blue-100 text-blue-800', badgeColor: 'bg-blue-500' },
};

/**
 * Check attendance for a single student
 */
export const checkAttendance = async (courseId, studentId, date, status, note = '', adminUid) => {
  // Check if attendance record already exists
  const existingQuery = query(
    collection(db, 'attendance'),
    where('courseId', '==', courseId),
    where('studentId', '==', studentId),
    where('date', '==', date)
  );
  
  const existingDocs = await getDocs(existingQuery);
  
  if (!existingDocs.empty) {
    // Update existing record
    const docRef = existingDocs.docs[0].ref;
    await updateDoc(docRef, {
      status,
      note,
      checkedBy: adminUid,
      checkedAt: serverTimestamp(),
    });
    return { id: existingDocs.docs[0].id, updated: true };
  }
  
  // Create new record
  const docRef = await addDoc(collection(db, 'attendance'), {
    courseId,
    studentId,
    date,
    status,
    note,
    checkedBy: adminUid,
    checkedAt: serverTimestamp(),
  });
  
  return { id: docRef.id, created: true };
};

/**
 * Bulk check attendance for multiple students
 * @param {string} courseId - Course ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array} attendanceList - Array of { studentId, status, note }
 * @param {string} adminUid - Admin UID who is checking attendance
 */
export const bulkCheckAttendance = async (courseId, date, attendanceList, adminUid) => {
  const results = [];
  const batch = writeBatch(db);
  
  // First, get existing attendance records for this course and date
  const existingQuery = query(
    collection(db, 'attendance'),
    where('courseId', '==', courseId),
    where('date', '==', date)
  );
  
  const existingDocs = await getDocs(existingQuery);
  const existingMap = {};
  existingDocs.docs.forEach(doc => {
    existingMap[doc.data().studentId] = doc;
  });
  
  for (const item of attendanceList) {
    const { studentId, status, note = '' } = item;
    
    if (existingMap[studentId]) {
      // Update existing
      batch.update(existingMap[studentId].ref, {
        status,
        note,
        checkedBy: adminUid,
        checkedAt: serverTimestamp(),
      });
      results.push({ studentId, id: existingMap[studentId].id, updated: true });
    } else {
      // Create new
      const newDocRef = doc(collection(db, 'attendance'));
      batch.set(newDocRef, {
        courseId,
        studentId,
        date,
        status,
        note,
        checkedBy: adminUid,
        checkedAt: serverTimestamp(),
      });
      results.push({ studentId, id: newDocRef.id, created: true });
    }
  }
  
  await batch.commit();
  return results;
};

/**
 * Get attendance records for a specific course and date
 */
export const getAttendanceByDate = async (courseId, date) => {
  const attendanceQuery = query(
    collection(db, 'attendance'),
    where('courseId', '==', courseId),
    where('date', '==', date)
  );
  
  const snapshot = await getDocs(attendanceQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get all attendance records for a student in a specific course
 */
export const getStudentAttendance = async (studentId, courseId = null) => {
  let attendanceQuery;
  
  if (courseId) {
    attendanceQuery = query(
      collection(db, 'attendance'),
      where('studentId', '==', studentId),
      where('courseId', '==', courseId),
      orderBy('date', 'desc')
    );
  } else {
    attendanceQuery = query(
      collection(db, 'attendance'),
      where('studentId', '==', studentId),
      orderBy('date', 'desc')
    );
  }
  
  const snapshot = await getDocs(attendanceQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get attendance statistics for a course
 * @returns {{ present: number, absent: number, late: number, excused: number, rate: number }}
 */
export const getAttendanceStats = async (courseId) => {
  const attendanceQuery = query(
    collection(db, 'attendance'),
    where('courseId', '==', courseId)
  );
  
  const snapshot = await getDocs(attendanceQuery);
  const records = snapshot.docs.map(doc => doc.data());
  
  const stats = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total: records.length,
    rate: 0,
  };
  
  records.forEach(record => {
    if (stats[record.status] !== undefined) {
      stats[record.status]++;
    }
  });
  
  // Calculate attendance rate (present + late + excused / total)
  if (stats.total > 0) {
    stats.rate = Math.round(((stats.present + stats.late + stats.excused) / stats.total) * 100);
  }
  
  return stats;
};

/**
 * Get attendance statistics for a student in a specific course
 */
export const getStudentAttendanceStats = async (studentId, courseId) => {
  const attendanceQuery = query(
    collection(db, 'attendance'),
    where('studentId', '==', studentId),
    where('courseId', '==', courseId)
  );
  
  const snapshot = await getDocs(attendanceQuery);
  const records = snapshot.docs.map(doc => doc.data());
  
  const stats = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total: records.length,
    rate: 0,
  };
  
  records.forEach(record => {
    if (stats[record.status] !== undefined) {
      stats[record.status]++;
    }
  });
  
  if (stats.total > 0) {
    stats.rate = Math.round(((stats.present + stats.late + stats.excused) / stats.total) * 100);
  }
  
  return stats;
};

/**
 * Get all attendance records for a course (for export)
 */
export const getCourseAttendanceRecords = async (courseId) => {
  const attendanceQuery = query(
    collection(db, 'attendance'),
    where('courseId', '==', courseId),
    orderBy('date', 'asc')
  );
  
  const snapshot = await getDocs(attendanceQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get unique dates that have attendance records for a course
 */
export const getAttendanceDates = async (courseId) => {
  const records = await getCourseAttendanceRecords(courseId);
  const dates = [...new Set(records.map(r => r.date))];
  return dates.sort();
};
