/**
 * Firebase 설정 파일
 *
 * Firebase 설정은 관리자 화면의 설정에서 입력받아 로컬스토리지에 저장됩니다.
 * 이 파일은 로컬스토리지에서 설정을 읽어와 Firebase를 초기화합니다.
 *
 * Vercel 배포 시 환경 변수도 지원합니다:
 * - VITE_FIREBASE_API_KEY
 * - VITE_FIREBASE_AUTH_DOMAIN
 * - VITE_FIREBASE_DATABASE_URL
 * - VITE_FIREBASE_PROJECT_ID
 * - VITE_FIREBASE_STORAGE_BUCKET
 * - VITE_FIREBASE_MESSAGING_SENDER_ID
 * - VITE_FIREBASE_APP_ID
 */

import { initializeFirebase } from "./firebase";
import { FirebaseConfig } from "../types";

const FIREBASE_CONFIG_STORAGE_KEY = "clinic-waiting-system-firebase-config";

/**
 * 로컬스토리지에서 Firebase 설정 가져오기
 */
export const getFirebaseConfigFromStorage = (): FirebaseConfig | null => {
  try {
    const stored = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load Firebase config from localStorage:", error);
  }
  return null;
};

/**
 * 로컬스토리지에 Firebase 설정 저장하기
 */
export const saveFirebaseConfigToStorage = (config: FirebaseConfig): void => {
  try {
    localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error("Failed to save Firebase config to localStorage:", error);
  }
};

/**
 * 로컬스토리지에서 Firebase 설정 삭제하기 (초기화)
 */
export const clearFirebaseConfigFromStorage = (): void => {
  try {
    localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear Firebase config from localStorage:", error);
  }
};

/**
 * Firebase 설정 가져오기 (환경 변수 > 로컬스토리지 순서)
 */
const getFirebaseConfig = (): FirebaseConfig | null => {
  // 1. 환경 변수 우선 (Vercel 배포 시)
  const env = (import.meta as any).env;
  if (env?.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
      databaseURL: env.VITE_FIREBASE_DATABASE_URL || "",
      projectId: env.VITE_FIREBASE_PROJECT_ID || "",
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: env.VITE_FIREBASE_APP_ID || "",
    };
  }

  // 2. 로컬스토리지에서 읽기
  return getFirebaseConfigFromStorage();
};

/**
 * Firebase 초기화
 * 설정이 없으면 초기화하지 않음 (관리자 화면에서 설정 필요)
 */
export const initFirebase = (): boolean => {
  const config = getFirebaseConfig();

  if (!config || !config.apiKey || !config.databaseURL) {
    console.warn(
      "Firebase config not found. Please configure Firebase in the admin settings."
    );
    return false;
  }

  try {
    initializeFirebase(config);
    return true;
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    return false;
  }
};
