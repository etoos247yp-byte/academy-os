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
 * Check if a student already exists
 */
export const checkStudentExists = async (name, phone) => {
  const studentId = generateStudentId(name, phone);
  const studentDoc = await getDoc(doc(db, 'students', studentId));
  return studentDoc.exists() ? { id: studentId, ...studentDoc.data() } : null;
};

/**
 * Batch create students from Excel upload
 * @param {Array} studentsData - Array of {name, phone, birthDate}
 * @param {string} adminUid - Admin user ID
 * @param {string} duplicateAction - 'skip' | 'overwrite' | object with individual choices
 * @returns {Array} Results with success/failure status for each student
 */
export const batchCreateStudents = async (studentsData, adminUid, duplicateAction = 'skip') => {
  const results = [];
  
  for (const studentData of studentsData) {
    try {
      const studentId = generateStudentId(studentData.name, studentData.phone);
      const existingDoc = await getDoc(doc(db, 'students', studentId));
      
      if (existingDoc.exists()) {
        // Handle duplicate based on action
        let action = duplicateAction;
        if (typeof duplicateAction === 'object') {
          action = duplicateAction[studentId] || 'skip';
        }
        
        if (action === 'skip') {
          results.push({
            ...studentData,
            studentId,
            success: false,
            skipped: true,
            error: '이미 존재하는 학생 (건너뜀)'
          });
          continue;
        } else if (action === 'overwrite') {
          await updateDoc(doc(db, 'students', studentId), {
            name: studentData.name,
            phone: studentData.phone,
            birthDate: studentData.birthDate || '',
            class: studentData.class || '',
            updatedAt: serverTimestamp(),
          });
          results.push({
            ...studentData,
            studentId,
            success: true,
            overwritten: true
          });
          continue;
        }
      }
      
      // Create new student
      await setDoc(doc(db, 'students', studentId), {
        name: studentData.name,
        phone: studentData.phone,
        birthDate: studentData.birthDate || '',
        class: studentData.class || '',
        enrollmentOpen: true,
        changeStartDate: null,
        changeEndDate: null,
        createdAt: serverTimestamp(),
        createdBy: adminUid,
      });
      
      results.push({
        ...studentData,
        studentId,
        success: true,
        created: true
      });
    } catch (error) {
      results.push({
        ...studentData,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};

/**
 * Check duplicates for batch upload preview
 */
export const checkBatchDuplicates = async (studentsData) => {
  const results = [];
  
  for (const studentData of studentsData) {
    const studentId = generateStudentId(studentData.name, studentData.phone);
    const existingDoc = await getDoc(doc(db, 'students', studentId));
    
    results.push({
      ...studentData,
      studentId,
      isDuplicate: existingDoc.exists(),
      existingData: existingDoc.exists() ? existingDoc.data() : null
    });
  }
  
  return results;
};

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
    birthDate: studentData.birthDate || '',
    class: studentData.class || '', // 반 필드 추가
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
 * Batch set change period for multiple students
 */
export const batchSetChangePeriod = async (studentIds, startDate, endDate) => {
  const promises = studentIds.map(id => 
    updateDoc(doc(db, 'students', id), {
      changeStartDate: startDate,
      changeEndDate: endDate,
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
