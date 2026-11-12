
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from './firebase.config';

// Inicializa Firebase una sola vez y reutiliza la aplicación existente.
export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);
