// The "Poker" web app in the shared Firebase project github-games-e7c7d.
// Public by design: a web app's config only identifies the project; access is
// decided by the Firestore rules (firestore.rules).

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAmAirzwcz926PyKh-bfUUIn7OSkcve6tI',
  authDomain: 'github-games-e7c7d.firebaseapp.com',
  projectId: 'github-games-e7c7d',
  storageBucket: 'github-games-e7c7d.firebasestorage.app',
  messagingSenderId: '879254296864',
  appId: '1:879254296864:web:391aab53e0120ddc8f1f45',
};

/**
 * Firestore collection, prefixed so it can't collide with the project's other
 * apps: one document per signed-in user, `pokerTrainer/{uid}`.
 */
export const PROGRESS_COLLECTION = 'pokerTrainer';

/** localStorage keys share the same prefix. */
export const LS = 'pokerTrainer';
