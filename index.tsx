import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initFirebase } from "./lib/firebase.config";
import { migrateFromLocalStorage } from "./lib/firebase";

// Firebase 초기화 (설정이 있으면 초기화)
// 설정이 없으면 관리자 화면에서 설정할 수 있습니다
const firebaseInitialized = initFirebase();

// LocalStorage에서 Firebase로 데이터 마이그레이션 (선택사항)
// Firebase에 데이터가 없을 때만 LocalStorage 데이터를 복사합니다
// Firebase가 초기화된 경우에만 실행
if (firebaseInitialized) {
  migrateFromLocalStorage().catch((error) => {
    console.error("Firebase migration failed:", error);
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
