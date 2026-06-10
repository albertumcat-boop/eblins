import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import {
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup,
  signOut, createUserWithEmailAndPassword, updateProfile, sendEmailVerification,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/services/firebase'
import type { AppUser } from '@/types'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null; appUser: AppUser | null; loading: boolean
  emailVerified: boolean
  signIn: (email: string, password: string) => Promise<void>
  /** Returns isNewUser=true if Firestore profile didn't exist yet (caller must show onboarding modal) */
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>
  /** Called after Google sign-in when the user is new — saves their role and school code */
  completeGoogleProfile: (role: string, schoolId: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string, role: string, schoolId: string) => Promise<void>
  logout: () => Promise<void>
  refreshAppUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const profileUnsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser)

      // Cancel any previous profile listener
      if (profileUnsubRef.current) {
        profileUnsubRef.current()
        profileUnsubRef.current = null
      }

      if (fbUser) {
        // Real-time listener on the user's Firestore profile.
        // This means when an admin approves/rejects the account,
        // the user's app updates instantly without needing to re-login.
        const unsubProfile = onSnapshot(
          doc(db, 'users', fbUser.uid),
          (snap) => {
            if (snap.exists()) setAppUser({ id: fbUser.uid, ...snap.data() } as AppUser)
            else setAppUser(null)
            setLoading(false)
          },
          (err) => {
            console.error('Error listening to user profile:', err)
            setAppUser(null)
            setLoading(false)
          }
        )
        profileUnsubRef.current = unsubProfile
      } else {
        setAppUser(null)
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      if (profileUnsubRef.current) profileUnsubRef.current()
    }
  }, [])

  const signIn = async (email: string, password: string) =>
    void await signInWithEmailAndPassword(auth, email, password)

  const signInWithGoogle = async (): Promise<{ isNewUser: boolean }> => {
    const { user } = await signInWithPopup(auth, googleProvider)
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      // Existing user — profile already in Firestore, onSnapshot will pick it up
      return { isNewUser: false }
    }
    // New user — caller must show role/school modal before creating the profile
    return { isNewUser: true }
  }

  const completeGoogleProfile = async (role: string, schoolId: string) => {
    if (!firebaseUser) throw new Error('No Google user signed in')
    const status = (role === 'representative' || role === 'teacher') ? 'pending_approval' : 'approved'
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      email:       firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL:    firebaseUser.photoURL,
      role, schoolId, status,
      createdAt: serverTimestamp(),
    })
    // onSnapshot in useEffect will pick up the new document automatically
  }

  const signUp = async (email: string, password: string, displayName: string, role: string, schoolId: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName })
    // Representatives and teachers start as pending_approval until admin verifies them
    const status = (role === 'representative' || role === 'teacher') ? 'pending_approval' : 'approved'
    await setDoc(doc(db, 'users', user.uid), { email, displayName, role, schoolId, status, createdAt: serverTimestamp() })
    await sendEmailVerification(user)
  }

  const logout = async () => { await signOut(auth); setAppUser(null) }

  const refreshAppUser = async () => {
    if (!firebaseUser) return
    const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
    if (snap.exists()) setAppUser({ id: firebaseUser.uid, ...snap.data() } as AppUser)
  }

  const emailVerified = firebaseUser?.emailVerified ?? false

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading, emailVerified, signIn, signInWithGoogle, completeGoogleProfile, signUp, logout, refreshAppUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
