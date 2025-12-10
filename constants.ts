import { Patient, PatientStatus, RoomId, ClinicSettings, CustomStatus } from './types';

export const CLINIC_NAME = "조은이비인후과의원";

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: '1',
    name: '김철수',
    status: PatientStatus.EXAMINING,
    roomId: RoomId.ROOM_1,
    registeredAt: Date.now() - 100000,
  },
  {
    id: '2',
    name: '이영희',
    status: PatientStatus.WAITING,
    roomId: RoomId.ROOM_1,
    registeredAt: Date.now() - 50000,
  },
  {
    id: '3',
    name: '박지민',
    status: PatientStatus.EXAMINING,
    roomId: RoomId.ROOM_2,
    registeredAt: Date.now() - 90000,
  },
  {
    id: '4',
    name: '최민수',
    status: PatientStatus.EXAM_WAIT,
    roomId: RoomId.ROOM_2,
    registeredAt: Date.now() - 120000,
  }
];

export const INITIAL_CUSTOM_STATUSES: CustomStatus[] = [
  {
    id: PatientStatus.WAITING,
    label: '대기',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-slate-500',
  },
  {
    id: PatientStatus.EXAMINING,
    label: '진료 중',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-[#3182F6]',
    borderColor: 'border-[#3182F6]',
    icon: 'stethoscope',
  },
  {
    id: PatientStatus.EXAM_WAIT,
    label: '검사 후 대기',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  {
    id: PatientStatus.COMPLETED,
    label: '완료',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
];

export const INITIAL_SETTINGS: ClinicSettings = {
  roomNames: {
    [RoomId.ROOM_1]: '1진료실',
    [RoomId.ROOM_2]: '2진료실',
  },
  doctorNames: {
    [RoomId.ROOM_1]: '김원장',
    [RoomId.ROOM_2]: '이원장',
  },
  showDoctorNames: true,
  showBanner: true,
  notices: [
    "진료 순서가 되시면 성함을 확인하시고 진료실 앞에서 대기해주세요.",
    "점심시간은 오후 1시부터 2시까지입니다.",
    "주차권이 필요하신 분은 수납 시 말씀해주세요."
  ],
  customStatuses: INITIAL_CUSTOM_STATUSES,
};

export const STATUS_LABELS: Record<PatientStatus, string> = {
  [PatientStatus.WAITING]: '대기',
  [PatientStatus.EXAMINING]: '진료 중',
  [PatientStatus.EXAM_WAIT]: '검사 후 대기',
  [PatientStatus.COMPLETED]: '완료',
};
