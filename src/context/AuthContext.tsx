import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup,
  signOut, createUserWithEmailAndPassword, updateProfile, sendEmailVerification,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/services/firebase'
import type { AppUser } from '@/types'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null; appUser: AppUser | null; loading: boolean
  emailVerified: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string, displayName: string, role: string, schoolId: string) => Promise<void>
  logout: () => Promise<void>
  refreshAppUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        try {
          const snap = await getDoc(doc(db, 'users', fbUser.uid))
          if (snap.exists()) setAppUser({ id: fbUser.uid, ...snap.data() } as AppUser)
          else setAppUser(null)
        } catch (err) {
          console.error('Error fetching user profile:', err)
          setAppUser(null)
        }
      } else { setAppUser(null) }
      setLoading(false)
    })
  }, [])

  const signIn = async (email: string, password: string) =>
    void await signInWithEmailAndPassword(auth, email, password)

  const signInWithGoogle = async () => {
    const { user } = await signInWithPopup(auth, googleProvider)
    const ref = doc(db, 'users', user.uid)
    if (!(await getDoc(ref)).exists()) {
      await setDoc(ref, {
        email: user.email, displayName: user.displayName, photoURL: user.photoURL,
        role: 'representative', schoolId: 'pending', createdAt: serverTimestamp(),
      })
    }
  }

  const signUp = async (email: string, password: string, displayName: string, role: string, schoolId: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName })
    // Representatives start as pending_approval until admin verifies them
    const status = role === 'representative' ? 'pending_approval' : 'approved'
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
    <AuthContext.Provider value={{ firebaseUser, appUser, loading, emailVerified, signIn, signInWithGoogle, signUp, logout, refreshAppUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
