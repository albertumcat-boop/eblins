import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup,
  signOut, createUserWithEmailAndPassword, updateProfile, type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/services/firebase'
import type { AppUser } from '@/types'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null; appUser: AppUser | null; loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string, displayName: string, role: string, schoolId: string) => Promise<void>
  logout: () => Promise<void>
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
        const snap = await getDoc(doc(db, 'users', fbUser.uid))
        if (snap.exists()) setAppUser({ id: fbUser.uid, ...snap.data() } as AppUser)
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
    await setDoc(doc(db, 'users', user.uid), { email, displayName, role, schoolId, createdAt: serverTimestamp() })
  }

  const logout = async () => { await signOut(auth); setAppUser(null) }

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading, signIn, signInWithGoogle, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
