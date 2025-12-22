import { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateStudentId } from '../lib/utils';

const StudentContext = createContext(null);

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};

export const StudentProvider = ({ children }) => {
  const [student, setStudent] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const savedStudentId = sessionStorage.getItem('studentId');
    if (savedStudentId) {
      loadStudent(savedStudentId);
    } else {
      setLoading(false);
    }
  }, []);

  // Subscribe to enrollments when student is logged in
  useEffect(() => {
    if (!student) {
      setEnrollments([]);
      return;
    }

    const enrollmentsQuery = query(
      collection(db, 'enrollments'),
      where('studentId', '==', student.id),
      where('status', 'in', ['pending', 'approved'])
    );

    const unsubscribe = onSnapshot(enrollmentsQuery, (snapshot) => {
      const enrollmentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEnrollments(enrollmentData);
    });

    return () => unsubscribe();
  }, [student]);

  const loadStudent = async (studentId) => {
    try {
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      if (studentDoc.exists()) {
        const studentData = { id: studentId, ...studentDoc.data() };
        setStudent(studentData);
        sessionStorage.setItem('studentId', studentId);
        return studentData;
      }
      return null;
    } catch (error) {
      console.error('Load student error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loginStudent = async (name, phone) => {
    setLoading(true);
    try {
      const studentId = generateStudentId(name, phone);
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      
      if (!studentDoc.exists()) {
        throw new Error('등록되지 않은 학생입니다. 관리자에게 문의하세요.');
      }
      
      const studentData = { id: studentId, ...studentDoc.data() };
      
      if (!studentData.enrollmentOpen) {
        throw new Error('수강신청이 마감되었습니다. 관리자에게 문의하세요.');
      }
      
      setStudent(studentData);
      sessionStorage.setItem('studentId', studentId);
      
      return studentData;
    } catch (error) {
      console.error('Student login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logoutStudent = () => {
    setStudent(null);
    setEnrollments([]);
    sessionStorage.removeItem('studentId');
  };

  const refreshStudent = async () => {
    if (student) {
      await loadStudent(student.id);
    }
  };

  const value = {
    student,
    enrollments,
    loading,
    loginStudent,
    logoutStudent,
    refreshStudent,
    isLoggedIn: !!student,
  };

  return (
    <StudentContext.Provider value={value}>
      {children}
    </StudentContext.Provider>
  );
};
