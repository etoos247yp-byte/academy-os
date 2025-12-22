import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { generateStudentId } from './utils';

/**
 * Create a new student
 */
export const createStudent = async (studentData, adminUid) => {
  const studentId = generateStudentId(studentData.name, studentData.phone);
  
  // Check if student already exists
  const existingDoc = await getDoc(doc(db, 'students', studentId));
  if (existingDoc.exists()) {
    throw new Error('이미 등록된 학생입니다.');
  }
  
  await setDoc(doc(db, 'students', studentId), {
    name: studentData.name,
    phone: studentData.phone,
    birthDate: studentData.birthDate,
    enrollmentOpen: true, // Default to open
    changeStartDate: null,
    changeEndDate: null,
    createdAt: serverTimestamp(),
    createdBy: adminUid,
  });
  
  return studentId;
};

/**
 * Get all students
 */
export const getAllStudents = async () => {
  const studentsQuery = query(
    collection(db, 'students'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(studentsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get a single student by ID
 */
export const getStudent = async (studentId) => {
  const studentDoc = await getDoc(doc(db, 'students', studentId));
  if (!studentDoc.exists()) {
    return null;
  }
  return { id: studentId, ...studentDoc.data() };
};

/**
 * Update student information
 */
export const updateStudent = async (studentId, updates) => {
  await updateDoc(doc(db, 'students', studentId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Set enrollment status for a student
 */
export const setEnrollmentStatus = async (studentId, isOpen) => {
  await updateDoc(doc(db, 'students', studentId), {
    enrollmentOpen: isOpen,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Set change period for a student
 */
export const setChangePeriod = async (studentId, startDate, endDate) => {
  await updateDoc(doc(db, 'students', studentId), {
    changeStartDate: startDate,
    changeEndDate: endDate,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Batch update enrollment status for all students
 */
export const batchSetEnrollmentStatus = async (studentIds, isOpen) => {
  const promises = studentIds.map(id => 
    updateDoc(doc(db, 'students', id), {
      enrollmentOpen: isOpen,
      updatedAt: serverTimestamp(),
    })
  );
  await Promise.all(promises);
};

/**
 * Delete a student
 */
export const deleteStudent = async (studentId) => {
  // Also delete all enrollments for this student
  const enrollmentsQuery = query(
    collection(db, 'enrollments'),
    where('studentId', '==', studentId)
  );
  
  const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
  const deletePromises = enrollmentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
  
  await Promise.all([
    ...deletePromises,
    deleteDoc(doc(db, 'students', studentId))
  ]);
};
