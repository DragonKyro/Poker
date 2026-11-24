// Cloud progress: Google sign-in and one Firestore document per user,
// `pokerTrainer/{uid}`, so progress follows you between phone and computer.
// Firebase is loaded lazily (only once you sign in, or on start-up if you
// were signed in before).
//
// Offline first: progress is always saved locally (progressStore). This
// device's record is pushed — replacing only its own `devices.<id>` entry —
// a moment after each change, on sign-in, on reconnect and when the page is
// hidden. Pulls fold the other devices' records in.

import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { useProgress, type DeviceProgress } from '@/store/progressStore';
import { FIREBASE_CONFIG, LS, PROGRESS_COLLECTION } from './firebaseConfig';

export type CloudStatus = 'off' | 'loading' | 'signedOut' | 'signedIn';

interface CloudState {
  status: CloudStatus;
  user: { name: string; email: string; photo: string | null } | null;
  /** Local changes not yet in the cloud. */
  dirty: boolean;
  syncing: boolean;
  online: boolean;
  error: string | null;
}

const SIGNED_IN_KEY = `${LS}.signedIn`;
const DIRTY_KEY = `${LS}.dirty`;

const readFlag = (k: string) => {
  try {
    return localStorage.getItem(k) === '1';
  } catch {
    return false;
  }
};
const writeFlag = (k: string, on: boolean) => {
  try {
    if (on) localStorage.setItem(k, '1');
    else localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
};

export const useCloud = create<CloudState>(() => ({
  status: 'off',
  user: null,
  dirty: readFlag(DIRTY_KEY),
  syncing: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  error: null,
}));

type Fb = {
  auth: import('firebase/auth').Auth;
  db: import('firebase/firestore').Firestore;
  authMod: typeof import('firebase/auth');
  fsMod: typeof import('firebase/firestore');
};

let fb: Promise<Fb> | null = null;
let uid: string | null = null;

function loadFirebase(): Promise<Fb> {
  if (!fb) {
    fb = (async () => {
      const [{ initializeApp, getApps }, authMod, fsMod] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
      const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
      const auth = authMod.getAuth(app);
      const db = fsMod.getFirestore(app);
      authMod.onAuthStateChanged(auth, (user) => void onUser(user));
      return { auth, db, authMod, fsMod };
    })();
    fb.catch(() => {
      fb = null;
    });
  }
  return fb;
}

async function onUser(user: User | null): Promise<void> {
  uid = user?.uid ?? null;
  if (!user) {
    useCloud.setState({ status: 'signedOut', user: null });
    writeFlag(SIGNED_IN_KEY, false);
    return;
  }
  writeFlag(SIGNED_IN_KEY, true);
  useCloud.setState({ status: 'signedIn', user: { name: user.displayName ?? 'Signed in', email: user.email ?? '', photo: user.photoURL }, error: null });
  await sync(true);
}

/** Pull (when `pull`) and push this device's record. */
async function sync(pull: boolean): Promise<void> {
  if (!uid || !navigator.onLine || useCloud.getState().syncing) return;
  useCloud.setState({ syncing: true });
  try {
    const { db, fsMod } = await loadFirebase();
    const ref = fsMod.doc(db, PROGRESS_COLLECTION, uid);
    if (pull) {
      const snap = await fsMod.getDoc(ref);
      const devices = (snap.data()?.devices ?? {}) as Record<string, DeviceProgress>;
      useProgress.getState().absorb(devices);
    }
    const { deviceId, mine } = useProgress.getState();
    if (mine.at > 0 && (pull || useCloud.getState().dirty)) {
      await fsMod.setDoc(ref, { devices: { [deviceId]: mine }, updated: fsMod.serverTimestamp() }, { mergeFields: [`devices.${deviceId}`, 'updated'] });
    }
    writeFlag(DIRTY_KEY, false);
    useCloud.setState({ dirty: false, error: null });
  } catch (e) {
    useCloud.setState({ error: (e as Error).message });
  } finally {
    useCloud.setState({ syncing: false });
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
function schedulePush(): void {
  writeFlag(DIRTY_KEY, true);
  useCloud.setState({ dirty: true });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void sync(false), 2500);
}

/** Start-up: hook progress changes, restore a previous sign-in, sync on reconnect. */
export function initCloud(): void {
  useProgress.setState({ onChange: schedulePush });
  window.addEventListener('online', () => {
    useCloud.setState({ online: true });
    void sync(true);
  });
  window.addEventListener('offline', () => useCloud.setState({ online: false }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && useCloud.getState().dirty) void sync(false);
  });
  if (readFlag(SIGNED_IN_KEY)) {
    useCloud.setState({ status: 'loading' });
    loadFirebase().catch(() => useCloud.setState({ status: 'signedOut' }));
  } else {
    useCloud.setState({ status: 'signedOut' });
  }
}

export async function signIn(): Promise<void> {
  useCloud.setState({ status: 'loading', error: null });
  try {
    const { auth, authMod } = await loadFirebase();
    await authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider());
  } catch (e) {
    const code = (e as { code?: string }).code ?? '';
    useCloud.setState({ status: uid ? 'signedIn' : 'signedOut', error: code === 'auth/popup-closed-by-user' ? null : friendly(code, (e as Error).message) });
  }
}

export async function signOut(): Promise<void> {
  const { auth, authMod } = await loadFirebase();
  await authMod.signOut(auth);
}

function friendly(code: string, message: string): string {
  if (code === 'auth/network-request-failed') return 'You seem to be offline — sign in once you are connected.';
  if (code === 'auth/unauthorized-domain') return 'This site is not yet authorised for sign-in in the Firebase console.';
  if (code === 'auth/operation-not-allowed') return 'Google sign-in is not enabled for this Firebase project yet.';
  if (code === 'auth/popup-blocked') return 'The sign-in window was blocked — allow pop-ups and try again.';
  return message;
}
