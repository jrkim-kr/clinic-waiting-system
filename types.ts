export enum PatientStatus {
  WAITING = 'WAITING',           // 대기
  EXAMINING = 'EXAMINING',       // 진료 중
  EXAM_WAIT = 'EXAM_WAIT',       // 검사 후 대기
  COMPLETED = 'COMPLETED'        // 완료 (View에서 사라짐)
}

export enum RoomId {
  ROOM_1 = 'ROOM_1',
  ROOM_2 = 'ROOM_2'
}

export interface Patient {
  id: string;
  name: string;
  birthDate?: string;
  status: PatientStatus;
  roomId: RoomId;
  registeredAt: number; // 접수 일시 (timestamp)
  order?: number; // 드래그 앤 드롭 순서 관리용 (Firebase Realtime Database에서 사용)
  completedAt?: number; // 진료 완료 일시 (timestamp, 상태가 완료일 때 기록)
}

export interface CustomStatus {
  id: string;
  label: string;
  color: string; // Tailwind color class (e.g., 'blue', 'amber', 'green')
  bgColor: string; // Tailwind background color class
  textColor: string; // Tailwind text color class
  borderColor?: string; // Optional border color
  icon?: string; // Optional icon name
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface ClinicSettings {
  roomNames: { [key in RoomId]: string };
  doctorNames: { [key in RoomId]: string };
  showDoctorNames: boolean;
  showBanner: boolean; // 배너 광고 영역 표시 여부
  notices: string[];
  customStatuses: CustomStatus[]; // Custom statuses for patients
  bannerImages?: string[]; // 배너 이미지 URL 배열
}
