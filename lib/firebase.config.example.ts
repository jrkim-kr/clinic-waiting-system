/**
 * Firebase 설정 파일
 * 
 * 사용 방법:
 * 1. 이 파일을 복사하여 firebase.config.ts로 이름 변경
 * 2. Firebase 콘솔에서 프로젝트 설정 정보를 가져와서 아래 값들을 채워넣으세요
 * 3. firebase.config.ts는 .gitignore에 추가하여 버전 관리에서 제외하세요
 * 
 * Firebase Console에서 설정 가져오기:
 * 1. Firebase Console (https://console.firebase.google.com/) 접속
 * 2. 프로젝트 선택: clinic-waiting-system
 * 3. 프로젝트 설정 (톱니바퀴 아이콘) > 일반 탭
 * 4. "내 앱" 섹션에서 웹 앱 선택 또는 새로 추가
 * 5. "Firebase SDK 구성" 섹션의 설정 정보 복사
 */

import { initializeFirebase } from './firebase';

// Firebase 프로젝트 설정
// Firebase Console > Project Settings > Your apps > Firebase SDK configuration에서 가져올 수 있습니다
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Firebase Console에서 가져오기
  authDomain: "clinic-waiting-system.firebaseapp.com", // 예시 (실제 값으로 변경 필요)
  databaseURL: "https://clinic-waiting-system-default-rtdb.asia-southeast1.firebasedatabase.app/", // ✅ 이미 설정됨
  projectId: "clinic-waiting-system", // 예시 (실제 값으로 변경 필요)
  storageBucket: "clinic-waiting-system.appspot.com", // 예시 (실제 값으로 변경 필요)
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Firebase Console에서 가져오기
  appId: "YOUR_APP_ID" // Firebase Console에서 가져오기
};

// Firebase 초기화
export const initFirebase = () => {
  initializeFirebase(firebaseConfig);
};

// 사용 예시:
// index.tsx 또는 App.tsx에서:
// import { initFirebase } from './lib/firebase.config';
// initFirebase();

