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
 * Create a new season
 */
export const createSeason = async (seasonData, adminUid) => {
  const docRef = await addDoc(collection(db, 'seasons'), {
    name: seasonData.name,
    startDate: seasonData.startDate,
    endDate: seasonData.endDate,
    isActive: seasonData.isActive ?? true,
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
