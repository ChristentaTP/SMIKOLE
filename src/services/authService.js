/**
 * Authentication Service
 * Login, logout, dan auth state listener menggunakan Firebase Auth
 */

import { auth, db } from "./firebase"
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"

/**
 * Update user profile data in Firestore
 * @param {string} uid - User UID
 * @param {object} data - Fields to update (e.g. { nama: "New Name" })
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (uid, data) => {
  const docRef = doc(db, "users", uid)
  await updateDoc(docRef, data)
}

/**
 * Login dengan email dan password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} User credential
 */
export const loginUser = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

/**
 * Logout user
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  await signOut(auth)
}

/**
 * Subscribe to auth state changes
 * @param {function} callback - Called with user object or null
 * @returns {function} Unsubscribe function
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback)
}

/**
 * Get user profile data from Firestore
 * @param {string} uid - User UID
 * @returns {Promise<object|null>} User profile data
 */
export const getUserProfile = async (uid) => {
  try {
    const docRef = doc(db, "users", uid)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() }
    }
    return null
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}
