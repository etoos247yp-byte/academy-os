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
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Create a new class (반)
 */
export const createClass = async (classData, adminUid) => {
  const docRef = await addDoc(collection(db, 'classes'), {
    name: classData.name,
    description: classData.description || '',
    capacity: classData.capacity || 30,
    studentCount: 0,
    seasonId: classData.seasonId || null,
    isActive: true,
    createdAt: serverTimestamp(),
    createdBy: adminUid,
  });
  
  return docRef.id;
};

/**
 * Get all classes
 */
export const getAllClasses = async () => {
  const classesQuery = query(
    collection(db, 'classes'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(classesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get active classes
 */
export const getActiveClasses = async () => {
  const classesQuery = query(
    collection(db, 'classes'),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(classesQuery);
  const classes = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Sort in memory
  return classes.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });
};

/**
 * Get classes by season
 */
export const getClassesBySeason = async (seasonId) => {
  const classesQuery = query(
    collection(db, 'classes'),
    where('seasonId', '==', seasonId),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(classesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get a single class
 */
export const getClass = async (classId) => {
  const classDoc = await getDoc(doc(db, 'classes', classId));
  if (!classDoc.exists()) {
    return null;
  }
  return { id: classId, ...classDoc.data() };
};

/**
 * Update a class
 */
export const updateClass = async (classId, updates) => {
  await updateDoc(doc(db, 'classes', classId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Toggle class active status
 */
export const toggleClassActive = async (classId, isActive) => {
  await updateDoc(doc(db, 'classes', classId), {
    isActive,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a class
 */
export const deleteClass = async (classId) => {
  await deleteDoc(doc(db, 'classes', classId));
};

/**
 * Update student count for a class
 */
export const updateClassStudentCount = async (classId, increment) => {
  const classDoc = await getDoc(doc(db, 'classes', classId));
  if (!classDoc.exists()) {
    throw new Error('반을 찾을 수 없습니다.');
  }
  
  const currentCount = classDoc.data().studentCount || 0;
  const newCount = Math.max(0, currentCount + increment);
  
  await updateDoc(doc(db, 'classes', classId), {
    studentCount: newCount,
    updatedAt: serverTimestamp(),
  });
  
  return newCount;
};

/**
 * Get students by class name
 */
export const getStudentsByClass = async (className) => {
  const studentsQuery = query(
    collection(db, 'students'),
    where('class', '==', className)
  );
  
  const snapshot = await getDocs(studentsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Assign a student to a class
 */
export const assignStudentToClass = async (studentId, className) => {
  await updateDoc(doc(db, 'students', studentId), {
    class: className,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Batch assign students to a class
 */
export const batchAssignStudentsToClass = async (studentIds, className) => {
  const promises = studentIds.map(id => 
    updateDoc(doc(db, 'students', id), {
      class: className,
      updatedAt: serverTimestamp(),
    })
  );
  await Promise.all(promises);
};

/**
 * Remove student from class (set to empty)
 */
export const removeStudentFromClass = async (studentId) => {
  await updateDoc(doc(db, 'students', studentId), {
    class: '',
    updatedAt: serverTimestamp(),
  });
};

/**
 * Batch remove students from class
 */
export const batchRemoveStudentsFromClass = async (studentIds) => {
  const promises = studentIds.map(id => 
    updateDoc(doc(db, 'students', id), {
      class: '',
      updatedAt: serverTimestamp(),
    })
  );
  await Promise.all(promises);
};

/**
 * Auto-assign students to classes based on criteria
 * @param {string} method - 'category' | 'alphabetical' | 'balance'
 * @param {Array} students - Array of student objects
 * @param {Array} classes - Array of class objects
 * @param {Object} options - Additional options (e.g., enrollments for category-based)
 */
export const autoAssignStudents = async (method, students, classes, options = {}) => {
  const results = [];
  const classNames = classes.map(c => c.name);
  
  if (classNames.length === 0) {
    throw new Error('배정할 반이 없습니다.');
  }
  
  switch (method) {
    case 'alphabetical': {
      // Sort students alphabetically by name and distribute evenly
      const sortedStudents = [...students].sort((a, b) => 
        a.name.localeCompare(b.name, 'ko')
      );
      const studentsPerClass = Math.ceil(sortedStudents.length / classNames.length);
      
      for (let i = 0; i < sortedStudents.length; i++) {
        const classIndex = Math.floor(i / studentsPerClass);
        const className = classNames[Math.min(classIndex, classNames.length - 1)];
        results.push({
          studentId: sortedStudents[i].id,
          studentName: sortedStudents[i].name,
          className,
        });
      }
      break;
    }
    
    case 'balance': {
      // Distribute students evenly to balance class sizes
      const classStudentCounts = {};
      classNames.forEach(name => { classStudentCounts[name] = 0; });
      
      for (const student of students) {
        // Find class with minimum students
        let minClass = classNames[0];
        let minCount = classStudentCounts[classNames[0]];
        
        for (const className of classNames) {
          if (classStudentCounts[className] < minCount) {
            minClass = className;
            minCount = classStudentCounts[className];
          }
        }
        
        classStudentCounts[minClass]++;
        results.push({
          studentId: student.id,
          studentName: student.name,
          className: minClass,
        });
      }
      break;
    }
    
    case 'category': {
      // Assign by primary enrolled category
      const { enrollmentsByStudent = {} } = options;
      
      for (const student of students) {
        const studentEnrollments = enrollmentsByStudent[student.id] || [];
        
        // Count categories
        const categoryCounts = {};
        for (const enrollment of studentEnrollments) {
          const category = enrollment.course?.category || '기타';
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
        
        // Find primary category
        let primaryCategory = '기타';
        let maxCount = 0;
        for (const [category, count] of Object.entries(categoryCounts)) {
          if (count > maxCount) {
            primaryCategory = category;
            maxCount = count;
          }
        }
        
        // Find matching class or use first available
        let matchingClass = classNames.find(name => 
          name.includes(primaryCategory) || primaryCategory.includes(name.replace(/반$/, ''))
        );
        
        if (!matchingClass) {
          // Fallback to balanced distribution if no match
          const classStudentCounts = {};
          results.forEach(r => {
            classStudentCounts[r.className] = (classStudentCounts[r.className] || 0) + 1;
          });
          
          let minClass = classNames[0];
          let minCount = classStudentCounts[classNames[0]] || 0;
          
          for (const className of classNames) {
            const count = classStudentCounts[className] || 0;
            if (count < minCount) {
              minClass = className;
              minCount = count;
            }
          }
          matchingClass = minClass;
        }
        
        results.push({
          studentId: student.id,
          studentName: student.name,
          className: matchingClass,
          primaryCategory,
        });
      }
      break;
    }
    
    default:
      throw new Error('알 수 없는 배정 방식입니다.');
  }
  
  return results;
};

/**
 * Execute auto-assignment (apply the results)
 */
export const executeAutoAssignment = async (assignments) => {
  const promises = assignments.map(a => 
    updateDoc(doc(db, 'students', a.studentId), {
      class: a.className,
      updatedAt: serverTimestamp(),
    })
  );
  await Promise.all(promises);
  return assignments.length;
};

/**
 * Recalculate student counts for all classes
 */
export const recalculateClassCounts = async () => {
  // Get all students
  const studentsSnapshot = await getDocs(collection(db, 'students'));
  const students = studentsSnapshot.docs.map(doc => doc.data());
  
  // Count students per class
  const classCounts = {};
  students.forEach(student => {
    if (student.class) {
      classCounts[student.class] = (classCounts[student.class] || 0) + 1;
    }
  });
  
  // Get all classes
  const classesSnapshot = await getDocs(collection(db, 'classes'));
  
  // Update each class with correct count
  const updates = classesSnapshot.docs.map(classDoc => {
    const className = classDoc.data().name;
    const count = classCounts[className] || 0;
    return updateDoc(doc(db, 'classes', classDoc.id), {
      studentCount: count,
      updatedAt: serverTimestamp(),
    });
  });
  
  await Promise.all(updates);
  return classCounts;
};
