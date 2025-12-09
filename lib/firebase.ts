import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database, ref, set, get, onValue, off, Query, DataSnapshot } from 'firebase/database';
import { Patient, ClinicSettings } from '../types';

// Firebase 설정 타입
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

// Firebase 초기화
let app: FirebaseApp | null = null;
let database: Database | null = null;

export const initializeFirebase = (config: FirebaseConfig): void => {
  if (app) {
    console.warn('Firebase is already initialized');
    return;
  }

  app = initializeApp(config);
  database = getDatabase(app);
};

/**
 * Firebase 초기화 여부 확인
 */
export const isFirebaseInitialized = (): boolean => {
  return database !== null;
};

export const getFirebaseDatabase = (): Database => {
  if (!database) {
    throw new Error('Firebase is not initialized. Call initializeFirebase first.');
  }
  return database;
};

// 데이터베이스 경로 상수
export const DB_PATHS = {
  PATIENTS: 'clinic-waiting-system/patients',
  SETTINGS: 'clinic-waiting-system/settings',
  ROOM_NAMES: 'clinic-waiting-system/settings/roomNames',
  DOCTOR_NAMES: 'clinic-waiting-system/settings/doctorNames',
  SHOW_DOCTOR_NAMES: 'clinic-waiting-system/settings/showDoctorNames',
  NOTICES: 'clinic-waiting-system/settings/notices',
  CUSTOM_STATUSES: 'clinic-waiting-system/settings/customStatuses',
} as const;

// ==================== Patients 관련 함수 ====================

/**
 * 모든 환자 데이터 가져오기
 */
export const getAllPatients = async (): Promise<Patient[]> => {
  const db = getFirebaseDatabase();
  const patientsRef = ref(db, DB_PATHS.PATIENTS);
  const snapshot = await get(patientsRef);
  
  if (!snapshot.exists()) {
    return [];
  }
  
  const patientsData = snapshot.val();
  return Object.values(patientsData) as Patient[];
};

/**
 * 특정 진료실의 환자 목록 가져오기
 */
export const getPatientsByRoom = async (roomId: string): Promise<Patient[]> => {
  const allPatients = await getAllPatients();
  return allPatients
    .filter(p => p.roomId === roomId)
    .sort((a, b) => {
      // order 필드가 있으면 사용, 없으면 registeredAt 사용
      const orderA = (a as any).order ?? a.registeredAt;
      const orderB = (b as any).order ?? b.registeredAt;
      return orderA - orderB;
    });
};

/**
 * 환자 추가
 */
export const addPatient = async (patient: Patient & { order?: number }): Promise<void> => {
  const db = getFirebaseDatabase();
  const patientRef = ref(db, `${DB_PATHS.PATIENTS}/${patient.id}`);
  
  const patientData = {
    ...patient,
    order: patient.order ?? patient.registeredAt, // order가 없으면 registeredAt 사용
  };
  
  await set(patientRef, patientData);
};

/**
 * 환자 업데이트
 */
export const updatePatient = async (patientId: string, updates: Partial<Patient & { order?: number }>): Promise<void> => {
  const db = getFirebaseDatabase();
  const patientRef = ref(db, `${DB_PATHS.PATIENTS}/${patientId}`);
  
  const snapshot = await get(patientRef);
  if (!snapshot.exists()) {
    throw new Error(`Patient with id ${patientId} not found`);
  }
  
  const currentData = snapshot.val();
  await set(patientRef, {
    ...currentData,
    ...updates,
  });
};

/**
 * 환자 삭제
 */
export const deletePatient = async (patientId: string): Promise<void> => {
  const db = getFirebaseDatabase();
  const patientRef = ref(db, `${DB_PATHS.PATIENTS}/${patientId}`);
  await set(patientRef, null);
};

/**
 * 환자 순서 업데이트 (드래그 앤 드롭)
 */
export const updatePatientOrder = async (patientId: string, newOrder: number): Promise<void> => {
  await updatePatient(patientId, { order: newOrder });
};

/**
 * 환자 목록 실시간 구독
 */
export const subscribeToPatients = (
  callback: (patients: Patient[]) => void
): (() => void) => {
  const db = getFirebaseDatabase();
  const patientsRef = ref(db, DB_PATHS.PATIENTS);
  
  const unsubscribe = onValue(patientsRef, (snapshot: DataSnapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const patientsData = snapshot.val();
    const patients = Object.values(patientsData) as Patient[];
    callback(patients);
  });
  
  // 구독 해제 함수 반환
  return () => {
    off(patientsRef);
  };
};

/**
 * 특정 진료실 환자 목록 실시간 구독
 */
export const subscribeToPatientsByRoom = (
  roomId: string,
  callback: (patients: Patient[]) => void
): (() => void) => {
  return subscribeToPatients((allPatients) => {
    const roomPatients = allPatients
      .filter(p => p.roomId === roomId)
      .sort((a, b) => {
        const orderA = (a as any).order ?? a.registeredAt;
        const orderB = (b as any).order ?? b.registeredAt;
        return orderA - orderB;
      });
    callback(roomPatients);
  });
};

// ==================== Settings 관련 함수 ====================

/**
 * 설정 데이터 가져오기
 */
export const getSettings = async (): Promise<ClinicSettings> => {
  const db = getFirebaseDatabase();
  const settingsRef = ref(db, DB_PATHS.SETTINGS);
  const snapshot = await get(settingsRef);
  
  if (!snapshot.exists()) {
    throw new Error('Settings not found');
  }
  
  const settingsData = snapshot.val();
  
  // notices를 배열로 변환 (객체 형태일 경우)
  let notices: string[] = [];
  if (settingsData.notices) {
    if (Array.isArray(settingsData.notices)) {
      notices = settingsData.notices;
    } else {
      notices = Object.values(settingsData.notices) as string[];
    }
  }
  
  return {
    roomNames: settingsData.roomNames || {},
    doctorNames: settingsData.doctorNames || {},
    showDoctorNames: settingsData.showDoctorNames ?? true,
    notices: notices,
    customStatuses: settingsData.customStatuses ? Object.values(settingsData.customStatuses) : [],
  } as ClinicSettings;
};

/**
 * 설정 업데이트
 */
export const updateSettings = async (settings: ClinicSettings): Promise<void> => {
  const db = getFirebaseDatabase();
  const settingsRef = ref(db, DB_PATHS.SETTINGS);
  
  // notices를 객체 형태로 변환 (Firebase Realtime Database는 배열을 객체로 저장)
  const noticesObj: Record<number, string> = {};
  settings.notices.forEach((notice, index) => {
    noticesObj[index] = notice;
  });
  
  // customStatuses를 객체 형태로 변환
  const customStatusesObj: Record<string, any> = {};
  settings.customStatuses.forEach((status) => {
    customStatusesObj[status.id] = status;
  });
  
  await set(settingsRef, {
    roomNames: settings.roomNames,
    doctorNames: settings.doctorNames,
    showDoctorNames: settings.showDoctorNames,
    notices: noticesObj,
    customStatuses: customStatusesObj,
  });
};

/**
 * 설정 실시간 구독
 */
export const subscribeToSettings = (
  callback: (settings: ClinicSettings) => void
): (() => void) => {
  const db = getFirebaseDatabase();
  const settingsRef = ref(db, DB_PATHS.SETTINGS);
  
  const unsubscribe = onValue(settingsRef, (snapshot: DataSnapshot) => {
    if (!snapshot.exists()) {
      return;
    }
    
    const settingsData = snapshot.val();
    
    // notices를 배열로 변환
    let notices: string[] = [];
    if (settingsData.notices) {
      if (Array.isArray(settingsData.notices)) {
        notices = settingsData.notices;
      } else {
        notices = Object.values(settingsData.notices) as string[];
      }
    }
    
    // customStatuses를 배열로 변환
    let customStatuses: any[] = [];
    if (settingsData.customStatuses) {
      if (Array.isArray(settingsData.customStatuses)) {
        customStatuses = settingsData.customStatuses;
      } else {
        customStatuses = Object.values(settingsData.customStatuses);
      }
    }
    
    const settings: ClinicSettings = {
      roomNames: settingsData.roomNames || {},
      doctorNames: settingsData.doctorNames || {},
      showDoctorNames: settingsData.showDoctorNames ?? true,
      notices: notices,
      customStatuses: customStatuses,
    };
    
    callback(settings);
  });
  
  return () => {
    off(settingsRef);
  };
};

// ==================== 유틸리티 함수 ====================

/**
 * LocalStorage에서 Firebase로 데이터 마이그레이션
 */
export const migrateFromLocalStorage = async (): Promise<void> => {
  const db = getFirebaseDatabase();
  
  // Patients 마이그레이션
  const savedPatients = localStorage.getItem('ent_patients');
  if (savedPatients) {
    try {
      const patients: Patient[] = JSON.parse(savedPatients);
      const patientsRef = ref(db, DB_PATHS.PATIENTS);
      
      // 기존 데이터 확인
      const snapshot = await get(patientsRef);
      if (!snapshot.exists()) {
        // Firebase에 데이터가 없으면 LocalStorage 데이터로 초기화
        const patientsObj: Record<string, Patient & { order?: number }> = {};
        patients.forEach((patient, index) => {
          patientsObj[patient.id] = {
            ...patient,
            order: patient.registeredAt + index, // 순서 보장
          };
        });
        await set(patientsRef, patientsObj);
        console.log('Patients migrated from LocalStorage to Firebase');
      }
    } catch (error) {
      console.error('Error migrating patients:', error);
    }
  }
  
  // Settings 마이그레이션
  const savedSettings = localStorage.getItem('ent_settings');
  if (savedSettings) {
    try {
      const settings: ClinicSettings = JSON.parse(savedSettings);
      const settingsRef = ref(db, DB_PATHS.SETTINGS);
      
      // 기존 데이터 확인
      const snapshot = await get(settingsRef);
      if (!snapshot.exists()) {
        // Firebase에 데이터가 없으면 LocalStorage 데이터로 초기화
        await updateSettings(settings);
        console.log('Settings migrated from LocalStorage to Firebase');
      }
    } catch (error) {
      console.error('Error migrating settings:', error);
    }
  }
};

