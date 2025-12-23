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
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Create a new season
 */
export const createSeason = async (seasonData, adminUid) => {
  const docRef = await addDoc(collection(db, 'seasons'), {
    name: seasonData.name,
    startDate: seasonData.startDate,
    endDate: seasonData.endDate,
    isActive: seasonData.isActive ?? true,
    isArchived: false,
    archivedAt: null,
    archivedBy: null,
    stats: null,
    createdAt: serverTimestamp(),
    createdBy: adminUid,
  });
  
  return docRef.id;
};

/**
 * Get all seasons
 */
export const getAllSeasons = async () => {
  const seasonsQuery = query(
    collection(db, 'seasons'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(seasonsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get active seasons
 */
export const getActiveSeasons = async () => {
  try {
    // Simple query without orderBy to avoid needing composite index
    const seasonsQuery = query(
      collection(db, 'seasons'),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(seasonsQuery);
    const seasons = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort in memory instead
    return seasons.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('getActiveSeasons error:', error);
    throw error;
  }
};

/**
 * Get a single season
 */
export const getSeason = async (seasonId) => {
  const seasonDoc = await getDoc(doc(db, 'seasons', seasonId));
  if (!seasonDoc.exists()) {
    return null;
  }
  return { id: seasonId, ...seasonDoc.data() };
};

/**
 * Update a season
 */
export const updateSeason = async (seasonId, updates) => {
  await updateDoc(doc(db, 'seasons', seasonId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Toggle season active status
 */
export const toggleSeasonActive = async (seasonId, isActive) => {
  await updateDoc(doc(db, 'seasons', seasonId), {
    isActive,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Delete a season (also updates related courses)
 */
export const deleteSeason = async (seasonId) => {
  // Note: In production, you might want to prevent deletion if courses exist
  // or cascade delete courses as well
  await deleteDoc(doc(db, 'seasons', seasonId));
};

/**
 * Get season statistics (courses, students, enrollments)
 */
export const getSeasonStats = async (seasonId) => {
  // Get courses for this season
  const coursesQuery = query(
    collection(db, 'courses'),
    where('seasonId', '==', seasonId)
  );
  const coursesSnapshot = await getDocs(coursesQuery);
  const totalCourses = coursesSnapshot.size;

  // Get enrollments for this season
  const enrollmentsQuery = query(
    collection(db, 'enrollments'),
    where('seasonId', '==', seasonId)
  );
  const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
  const enrollments = enrollmentsSnapshot.docs.map(doc => doc.data());
  
  const totalEnrollments = enrollments.length;
  const approvedEnrollments = enrollments.filter(e => e.status === 'approved').length;
  
  // Get unique students from enrollments
  const uniqueStudentIds = new Set(enrollments.map(e => e.studentId));
  const totalStudents = uniqueStudentIds.size;

  return {
    totalCourses,
    totalStudents,
    totalEnrollments,
    approvedEnrollments
  };
};

/**
 * Archive a season - mark as archived and save stats
 */
export const archiveSeason = async (seasonId, adminUid) => {
  // First, get the current stats
  const stats = await getSeasonStats(seasonId);
  
  // Update the season document
  await updateDoc(doc(db, 'seasons', seasonId), {
    isArchived: true,
    isActive: false, // Archived seasons should not be active
    archivedAt: serverTimestamp(),
    archivedBy: adminUid,
    stats: stats,
    updatedAt: serverTimestamp(),
  });

  return stats;
};

/**
 * Unarchive a season
 */
export const unarchiveSeason = async (seasonId) => {
  await updateDoc(doc(db, 'seasons', seasonId), {
    isArchived: false,
    archivedAt: null,
    archivedBy: null,
    // Keep the stats for reference
    updatedAt: serverTimestamp(),
  });
};

/**
 * Get all archived seasons
 */
export const getArchivedSeasons = async () => {
  const seasonsQuery = query(
    collection(db, 'seasons'),
    where('isArchived', '==', true)
  );
  
  const snapshot = await getDocs(seasonsQuery);
  const seasons = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Sort by archivedAt descending
  return seasons.sort((a, b) => {
    const aTime = a.archivedAt?.seconds || 0;
    const bTime = b.archivedAt?.seconds || 0;
    return bTime - aTime;
  });
};

/**
 * Get non-archived seasons
 */
export const getNonArchivedSeasons = async () => {
  // Query all seasons and filter in memory to avoid composite index
  const seasonsQuery = query(
    collection(db, 'seasons'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(seasonsQuery);
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .filter(season => !season.isArchived);
};

/**
 * Check if a season is archived
 */
export const isSeasonArchived = async (seasonId) => {
  const season = await getSeason(seasonId);
  return season?.isArchived === true;
};

/**
 * Delete archived season data (courses and enrollments)
 * Keeps the season record with stats as historical reference
 */
export const deleteArchivedSeasonData = async (seasonId) => {
  const season = await getSeason(seasonId);
  
  if (!season) {
    throw new Error('학기를 찾을 수 없습니다.');
  }
  
  if (!season.isArchived) {
    throw new Error('아카이브된 학기만 데이터를 삭제할 수 있습니다.');
  }

  const batch = writeBatch(db);
  
  // Get all courses for this season
  const coursesQuery = query(
    collection(db, 'courses'),
    where('seasonId', '==', seasonId)
  );
  const coursesSnapshot = await getDocs(coursesQuery);
  
  // Get all enrollments for this season
  const enrollmentsQuery = query(
    collection(db, 'enrollments'),
    where('seasonId', '==', seasonId)
  );
  const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
  
  // Add all deletions to batch (Firestore batch limit is 500)
  let deleteCount = 0;
  const BATCH_LIMIT = 450; // Leave some room
  
  // Delete enrollments
  for (const enrollmentDoc of enrollmentsSnapshot.docs) {
    if (deleteCount >= BATCH_LIMIT) {
      await batch.commit();
      deleteCount = 0;
    }
    batch.delete(enrollmentDoc.ref);
    deleteCount++;
  }
  
  // Delete courses
  for (const courseDoc of coursesSnapshot.docs) {
    if (deleteCount >= BATCH_LIMIT) {
      await batch.commit();
      deleteCount = 0;
    }
    batch.delete(courseDoc.ref);
    deleteCount++;
  }
  
  // Commit remaining deletes
  if (deleteCount > 0) {
    await batch.commit();
  }

  // Update season to mark data as deleted
  await updateDoc(doc(db, 'seasons', seasonId), {
    dataDeleted: true,
    dataDeletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    deletedCourses: coursesSnapshot.size,
    deletedEnrollments: enrollmentsSnapshot.size
  };
};

/**
 * Get archived season courses (read-only)
 */
export const getArchivedSeasonCourses = async (seasonId) => {
  const coursesQuery = query(
    collection(db, 'courses'),
    where('seasonId', '==', seasonId)
  );
  
  const snapshot = await getDocs(coursesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Get archived season enrollments with student info
 */
export const getArchivedSeasonEnrollments = async (seasonId) => {
  const enrollmentsQuery = query(
    collection(db, 'enrollments'),
    where('seasonId', '==', seasonId)
  );
  
  const snapshot = await getDocs(enrollmentsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
