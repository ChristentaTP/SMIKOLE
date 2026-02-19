/**
 * Auth Context
 * Menyimpan state autentikasi dan user data secara global
 */

import { createContext, useContext, useState, useEffect } from "react"
import { onAuthChange, getUserProfile } from "../services/authService"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)        // Firebase Auth user
  const [userData, setUserData] = useState(null) // Firestore user profile
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        // Fetch user profile from Firestore
        const profile = await getUserProfile(firebaseUser.uid)
        setUserData(profile || {
          nama: firebaseUser.displayName || firebaseUser.email,
          email: firebaseUser.email,
          role: "pembudidaya",
        })
      } else {
        setUserData(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  /**
   * Refresh user profile data from Firestore
   * Call this after updating user profile to sync state
   */
  const refreshUserData = async () => {
    if (user) {
      const profile = await getUserProfile(user.uid)
      setUserData(profile || {
        nama: user.displayName || user.email,
        email: user.email,
        role: "pembudidaya",
      })
    }
  }

  const value = {
    user,       // Firebase Auth user (uid, email, etc)
    userData,   // Firestore profile (nama, role, etc)
    loading,
    isLoggedIn: !!user,
    refreshUserData,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook untuk akses auth di semua komponen
 * @returns {{ user, userData, loading, isLoggedIn }}
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
