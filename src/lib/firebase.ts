/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  type AuthError,
} from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  host: 'firestore.googleapis.com',
  ssl: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Unable to enable persistent auth session:', error);
});

function shouldUseRedirectFallback(error: unknown) {
  const code = (error as Partial<AuthError>)?.code;
  return [
    'auth/cancelled-popup-request',
    'auth/operation-not-supported-in-this-environment',
    'auth/popup-blocked',
    'auth/popup-closed-by-user',
    'auth/web-storage-unsupported',
  ].includes(code || '');
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    if (shouldUseRedirectFallback(error)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

export async function completeRedirectSignIn() {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error('Error completing Google redirect sign-in:', error);
    throw error;
  }
}

// Connectivity test as required by instructions
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connectivity-check'));
    console.log("Firestore connection test: OK");
  } catch (error: any) {
    // If we get a permission-denied error, it actually means we successfully
    // reached the Firestore backend, so it's a "success" for connectivity.
    if (error.code === 'permission-denied') {
      console.log("Firestore connection test: OK (Backend reached)");
      return;
    }
    
    if (error.message?.includes('the client is offline') || error.code === 'unavailable') {
      console.error("Firestore connectivity check failed: The client appears to be offline. Please check your network and Firebase configuration.");
    } else {
      console.error("Firestore connectivity check failed:", error.message, error.code);
    }
  }
}

testConnection();

// Error handler as required by instructions
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
