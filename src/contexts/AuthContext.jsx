import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch admin data from Firestore
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists()) {
          setAdmin({ uid: user.uid, email: user.email, ...adminDoc.data() });
        } else {
          // User exists in auth but not in admins collection
          setAdmin(null);
          await signOut(auth);
        }
      } else {
        setAdmin(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAdmin = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const adminDoc = await getDoc(doc(db, 'admins', userCredential.user.uid));
      
      if (!adminDoc.exists()) {
        await signOut(auth);
        throw new Error('관리자 권한이 없습니다.');
      }
      
      return { uid: userCredential.user.uid, ...adminDoc.data() };
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  };

  const logoutAdmin = async () => {
    await signOut(auth);
    setAdmin(null);
  };

  const inviteAdmin = async (email, password, name, role = 'admin') => {
    if (!admin || admin.role !== 'superadmin') {
      throw new Error('권한이 없습니다.');
    }
    
    try {
      // Note: This creates the user in the current session's context
      // For production, you might want to use Firebase Admin SDK or Cloud Functions
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, 'admins', userCredential.user.uid), {
        email,
        name,
        role,
        createdAt: serverTimestamp(),
        invitedBy: admin.uid,
      });
      
      // Sign out the newly created user and sign back in as current admin
      // This is a workaround for client-side user creation
      await signOut(auth);
      
      return { success: true, message: '관리자가 추가되었습니다.' };
    } catch (error) {
      console.error('Invite admin error:', error);
      throw error;
    }
  };

  const value = {
    admin,
    loading,
    loginAdmin,
    logoutAdmin,
    inviteAdmin,
    isAuthenticated: !!admin,
    isSuperAdmin: admin?.role === 'superadmin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
