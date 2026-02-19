/**
 * Authentication Service
 * Login, logout, dan auth state listener menggunakan Firebase Auth
 */

import { auth, db } from "./firebase"
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  sendPasswordResetEmail
} from "firebase/auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email)
}
/**
 * Re-authenticate user before sensitive operations
 * @param {string} currentPassword - User's current password
 * @returns {Promise<void>}
 */
const reauthenticate = async (currentPassword) => {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error("User not logged in")
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
}

/**
 * Change user email (requires re-authentication)
 * @param {string} newEmail - New email address
 * @param {string} currentPassword - Current password for verification
 * @returns {Promise<void>}
 */
export const changeEmail = async (newEmail, currentPassword) => {
  await reauthenticate(currentPassword)
  const user = auth.currentUser
  // Sends verification link to new email. Email changes only after user clicks the link.
  await verifyBeforeUpdateEmail(user, newEmail)
}

/**
 * Change user password (requires re-authentication)
 * @param {string} currentPassword - Current password for verification
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
export const changePassword = async (currentPassword, newPassword) => {
  await reauthenticate(currentPassword)
  const user = auth.currentUser
  await firebaseUpdatePassword(user, newPassword)
}

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
