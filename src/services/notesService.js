// Notes service functions for Firestore operations
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../config/firebase";

// Get all approved notes for regular users
export const getAllNotes = async () => {
  try {
    const notesRef = collection(db, "notes");
    const q = query(
      notesRef,
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);

    const notes = [];
    querySnapshot.forEach((doc) => {
      notes.push({ id: doc.id, ...doc.data() });
    });

    return { notes, error: null };
  } catch (error) {
    console.error("Error getting notes:", error);
    return { notes: [], error: error.message };
  }
};

// Get notes by filters
export const getNotesByFilter = async (filters = {}) => {
  try {
    const notesRef = collection(db, "notes");
    let q = query(notesRef);

    // Always filter by status if provided
    if (filters.status) {
      q = query(q, where("status", "==", filters.status.trim()));
    } else {
      q = query(q, where("status", "==", "approved"));
    }

    // Apply filters safely
    if (filters.year) {
      q = query(q, where("year", "==", filters.year.trim()));
    }
    if (filters.branch) {
      q = query(q, where("branch", "==", filters.branch.trim()));
    }
    if (filters.semester) {
      q = query(q, where("semester", "==", filters.semester.trim()));
    }

    // Order results
    q = query(q, orderBy("createdAt", "desc"));

    const querySnapshot = await getDocs(q);
    const notes = [];
    querySnapshot.forEach((doc) => {
      notes.push({ id: doc.id, ...doc.data() });
    });

    return { notes, error: null };
  } catch (error) {
    console.error("Error getting filtered notes:", error);
    return { notes: [], error: error.message };
  }
};

// Get user's uploaded notes
export const getUserUploadedNotes = async (userId) => {
  try {
    const notesRef = collection(db, "notes");
    const q = query(
      notesRef,
      where("uploadedBy", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    const notes = [];
    querySnapshot.forEach((doc) => {
      notes.push({ id: doc.id, ...doc.data() });
    });

    return { notes, error: null };
  } catch (error) {
    console.error("Error getting user uploaded notes:", error);
    return { notes: [], error: error.message };
  }
};

// Create a new note (for users)
export const createNote = async (noteData, userId) => {
  try {
    const notesRef = collection(db, "notes");
    const docRef = await addDoc(notesRef, {
      ...noteData,
      uploadedBy: userId,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { noteId: docRef.id, error: null };
  } catch (error) {
    console.error("Error creating note:", error);
    return { noteId: null, error: error.message };
  }
};

// Update user eligibility
export const updateUserEligibility = async (userId, isEligible) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      isEligible: isEligible,
      updatedAt: new Date(),
    });
    return { error: null };
  } catch (error) {
    console.error("Error updating user eligibility:", error);
    return { error: error.message };
  }
};
export const getUserAccessedNotes = async (userId) => {
  try {
    const notesRef = collection(db, "notes");
    const q = query(
      notesRef,
      where("accessedBy", "array-contains", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    const notes = [];
    querySnapshot.forEach((doc) => {
      notes.push({ id: doc.id, ...doc.data() });
    });

    return { notes, error: null };
  } catch (error) {
    console.error("Error getting accessed notes:", error);
    return { notes: [], error: error.message };
  }
};

export const moveToPendingNotes = async (userId, notes) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      pendingNotes: arrayUnion(...notes),
    });
    return { error: null };
  } catch (error) {
    console.error("Error adding to pendingNotes:", error);
    return { error: error.message };
  }
};

// Admin approves a note for a user
export const approveNoteForUser = async (userId, note) => {
  try {
    const userRef = doc(db, "users", userId);
    const uploaderRef = doc(db, "users", note.uploadedBy);

    await updateDoc(userRef, {
      pendingNotes: arrayRemove(note),
      approvedNotes: arrayUnion(note),
    });

    await updateDoc(uploaderRef, {
      earnings: increment(5),
    });

    return { error: null };
  } catch (error) {
    console.error("Error approving note:", error);
    return { error: error.message };
  }
};

// ============================
// REALTIME LISTENERS
// ============================

// Listen to user's approved & pending notes
export const listenToUserNotes = (userId, callback) => {
  const userRef = doc(db, "users", userId);
  return onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        approvedNotes: data.approvedNotes || [],
        pendingNotes: data.pendingNotes || [],
      });
    }
  });
};

// ============================
// PROFILE
// ============================

export const getUserProfileData = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return { error: "User not found" };

    const data = snap.data();
    return {
      approvedNotes: data.approvedNotes || [],
      earnings: data.earnings || 0,
      error: null,
    };
  } catch (error) {
    console.error("Error getting profile data:", error);
    return { approvedNotes: [], earnings: 0, error: error.message };
  }
};