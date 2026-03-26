import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: 'AIzaSyAAfXxMzOytq5F5odVkOIEe2BiaZZkiqk8',
  authDomain: 'puzzle-shelf.firebaseapp.com',
  projectId: 'puzzle-shelf',
  storageBucket: 'puzzle-shelf.firebasestorage.app',
  messagingSenderId: '406486731055',
  appId: '1:406486731055:web:b34094e248d27ef2b1b9da',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)
