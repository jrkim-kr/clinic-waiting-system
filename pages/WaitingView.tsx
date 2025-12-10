import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Patient, RoomId, ClinicSettings } from "../types";
import { INITIAL_PATIENTS, INITIAL_SETTINGS } from "../constants";
import { Header } from "../components/Header";
import { PatientCard } from "../components/PatientCard";
import { NoticeBanner } from "../components/NoticeBanner";
import { BannerSlider } from "../components/BannerSlider";
import { RefreshCw, Image as ImageIcon } from "lucide-react";
import {
  subscribeToPatients,
  subscribeToSettings,
  getAllPatients,
  getSettings,
  isFirebaseInitialized,
} from "../lib/firebase";

// --- Components ---
// Note: ConfirmModal, Toast, NoticeBanner, PatientCard are imported from components
// WaitingView는 대기 화면이므로 관리자 전용 모달들(FirebaseConfigModal, SettingsModal 등)은 필요 없음

// --- Main App ---

const WaitingView: React.FC = () => {
  const navigate = useNavigate();
  const isAdmin = false; // 대기 화면이므로 항상 false

  // --- State Architecture ---
  // livePatients, liveSettings: Source of Truth (Synced with Firebase, used for Public View)

  const [livePatients, setLivePatients] = useState<Patient[]>([]);
  const [liveSettings, setLiveSettings] =
    useState<ClinicSettings>(INITIAL_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // --- Synchronization Logic ---

  // Firebase 실시간 구독 설정
  useEffect(() => {
    // Firebase가 초기화되지 않았으면 구독하지 않음
    if (!isFirebaseInitialized()) {
      setIsLoading(false);
      return;
    }

    // 환자 목록 실시간 구독
    const unsubscribePatients = subscribeToPatients((patients) => {
      // order 필드가 없으면 registeredAt을 order로 사용
      const patientsWithOrder = patients.map((p) => ({
        ...p,
        order: p.order ?? p.registeredAt,
      }));
      setLivePatients(patientsWithOrder);
      setIsLoading(false);
    });

    // 설정 실시간 구독
    const unsubscribeSettings = subscribeToSettings((settings) => {
      setLiveSettings(settings);
    });

    // 초기 데이터 로드 (Firebase에 데이터가 없을 경우)
    const loadInitialData = async () => {
      try {
        const patients = await getAllPatients();
        if (patients.length === 0) {
          // Firebase에 데이터가 없으면 초기 데이터 설정
          setLivePatients(INITIAL_PATIENTS);
        }

        const settings = await getSettings().catch(() => INITIAL_SETTINGS);
        if (!settings || Object.keys(settings).length === 0) {
          setLiveSettings(INITIAL_SETTINGS);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        // 에러 발생 시 초기값 사용
        setLivePatients(INITIAL_PATIENTS);
        setLiveSettings(INITIAL_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();

    return () => {
      unsubscribePatients();
      unsubscribeSettings();
    };
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // --- Render Helpers ---

  // 완료된 환자인지 확인하는 헬퍼 함수
  const isCompletedPatient = (patient: Patient): boolean => {
    const customStatus = liveSettings.customStatuses.find(
      (s) => s.id === patient.status
    );
    return customStatus?.label === "완료" || false;
  };

  const handleToggleView = () => {
    navigate("/admin");
  };

  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .catch((e) => console.error(e));
    } else {
      document.exitFullscreen();
    }
  };

  const renderRoomColumn = (roomId: RoomId) => {
    // 공개 화면에서는 완료된 환자 제외
    const roomPatients = livePatients
      .filter((p) => {
        if (p.roomId !== roomId) return false;
        // 완료된 환자는 대기 목록에서 제외
        return !isCompletedPatient(p);
      })
      .sort((a, b) => {
        // order 필드가 있으면 사용, 없으면 registeredAt 사용
        const orderA = a.order ?? a.registeredAt;
        const orderB = b.order ?? b.registeredAt;
        return orderA - orderB;
      });

    return (
      <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-white/50 rounded-[16px] sm:rounded-[24px] border border-white shadow-sm backdrop-blur-sm">
        {/* Room Header */}
        <div className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 bg-white/80">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[16px] flex items-center justify-center font-bold text-xl sm:text-2xl shadow-sm bg-[#3182F6] text-white flex-shrink-0">
              {roomId === RoomId.ROOM_1 ? "1" : "2"}
            </div>
            <div className="min-w-0 flex-1 sm:flex-none">
              <h2 className="text-lg sm:text-2xl font-bold text-slate-800 flex items-center gap-2 truncate sm:truncate-none">
                {liveSettings.roomNames[roomId]}
              </h2>
              {liveSettings.showDoctorNames && (
                <p className="text-sm sm:text-lg font-medium text-slate-500 mt-1 flex items-center gap-2 truncate sm:truncate-none">
                  {liveSettings.doctorNames[roomId]} 진료
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Patient List */}
        <div className="flex-1 min-h-0 overflow-hidden px-1 sm:px-2 py-3 sm:py-4 patient-list-container w-full">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 py-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4 animate-spin">
                <RefreshCw size={20} className="sm:w-6 sm:h-6" />
              </div>
              <p className="font-medium text-sm sm:text-base">
                데이터를 불러오는 중...
              </p>
            </div>
          ) : roomPatients.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 py-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <RefreshCw size={20} className="sm:w-6 sm:h-6" />
              </div>
              <p className="font-medium text-sm sm:text-base">
                대기 중인 환자가 없습니다.
              </p>
            </div>
          ) : (
            // 공개 화면: 상위 3개 고정, 4번째부터 순환 애니메이션
            <div className="h-full flex flex-col overflow-hidden px-2">
              {/* 상위 3개 고정 */}
              <div className="flex-shrink-0">
                {roomPatients.slice(0, 3).map((patient, index) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    rank={index + 1}
                    isAdmin={isAdmin}
                    customStatuses={liveSettings.customStatuses || []}
                  />
                ))}
              </div>
              {/* 4번째부터 순환 애니메이션 */}
              {roomPatients.length > 3 && (
                <div className="flex-1 min-h-0 overflow-hidden relative">
                  <div className="animate-scroll-up patient-list-wrapper">
                    {/* 원본 목록 (4번째부터) */}
                    {roomPatients.slice(3).map((patient, index) => (
                      <PatientCard
                        key={`${patient.id}-1`}
                        patient={patient}
                        rank={index + 4}
                        isAdmin={isAdmin}
                        customStatuses={liveSettings.customStatuses || []}
                      />
                    ))}
                    {/* 복제 목록 (순환 효과) */}
                    {roomPatients.slice(3).map((patient, index) => (
                      <PatientCard
                        key={`${patient.id}-2`}
                        patient={patient}
                        rank={index + 4}
                        isAdmin={isAdmin}
                        customStatuses={liveSettings.customStatuses || []}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F2F4F6] text-slate-900 font-sans flex flex-col selection:bg-blue-100">
      <Header
        isAdmin={isAdmin}
        onToggleView={handleToggleView}
        onFullScreen={handleFullScreen}
      />

      <NoticeBanner notices={liveSettings.notices} />

      <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-y-auto flex flex-col max-w-[1920px] mx-auto w-full min-w-0">
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 flex-shrink-0 mb-4 md:mb-6 min-w-0 w-full">
          {renderRoomColumn(RoomId.ROOM_1)}

          {/* 배너 슬라이드 영역 - 두 대기실 사이 (설정에서 표시 옵션이 켜져 있을 때만 표시) */}
          {liveSettings.showBanner && (
            <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-white/50 rounded-[16px] sm:rounded-[24px] border border-white shadow-sm backdrop-blur-sm">
              <div className="flex-1 min-h-0 overflow-hidden px-1 sm:px-2 py-3 sm:py-4">
                {liveSettings.bannerImages &&
                liveSettings.bannerImages.length > 0 ? (
                  <BannerSlider
                    images={liveSettings.bannerImages}
                    autoSlideInterval={3000}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-start text-slate-400 opacity-60 py-8">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                      <ImageIcon size={24} className="sm:w-8 sm:h-8" />
                    </div>
                    <p className="font-medium text-sm sm:text-base">
                      배너 이미지가 없습니다
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {renderRoomColumn(RoomId.ROOM_2)}
        </div>
      </main>
    </div>
  );
};

export default WaitingView;
