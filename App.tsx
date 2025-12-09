import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Patient, PatientStatus, RoomId, ClinicSettings, CustomStatus, FirebaseConfig } from './types';
import { INITIAL_PATIENTS, INITIAL_SETTINGS, STATUS_LABELS } from './constants';
import { Header } from './components/Header';
import { Button } from './components/Button';
import { 
  Plus, X, GripVertical, Stethoscope, 
  Activity, RefreshCw, Trash2, Megaphone, Edit3, Tag, CheckCircle2, Clock, Calendar, Database
} from 'lucide-react';
import { 
  subscribeToPatients, 
  subscribeToSettings,
  addPatient as addPatientToFirebase,
  updatePatient as updatePatientInFirebase,
  deletePatient as deletePatientFromFirebase,
  updateSettings as updateSettingsInFirebase,
  getAllPatients,
  getSettings,
  isFirebaseInitialized
} from './lib/firebase';
import { getFirebaseConfigFromStorage, saveFirebaseConfigToStorage, clearFirebaseConfigFromStorage, initFirebase } from './lib/firebase.config';

// --- Components ---

// 1. Confirm Modal
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'default';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  variant = 'default'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      button: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'text-red-600'
    },
    warning: {
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
      icon: 'text-amber-600'
    },
    default: {
      button: 'bg-[#3182F6] hover:bg-[#2563EB] text-white',
      icon: 'text-[#3182F6]'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[20px] sm:rounded-[24px] shadow-2xl p-6 sm:p-8 w-full max-w-sm my-4 animate-modal-slide-in">
        <div className="mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{message}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 sm:py-3 text-slate-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-[12px] transition-colors text-sm sm:text-base"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 sm:py-3 font-bold rounded-[12px] shadow-lg transition-all text-sm sm:text-base ${styles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Toast Notification
interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] animate-fade-in">
      <div className="bg-slate-900/95 backdrop-blur-sm text-white px-5 py-3.5 rounded-[16px] shadow-2xl flex items-center gap-3 min-w-[240px] max-w-[90vw] border border-slate-700/50">
        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 size={16} className="text-green-400" />
        </div>
        <span className="font-semibold text-sm text-white">{message}</span>
      </div>
    </div>
  );
};

// 2. Notice Banner (Marquee)
const NoticeBanner = ({ notices }: { notices: string[] }) => {
  const displayNotices = notices.length > 0 ? notices : ["진료 순서가 되시면 성함을 확인하시고 진료실 앞에서 대기해주세요."];
  
  // Repeat content 4 times to create a seamless loop effect
  const content = [...displayNotices, ...displayNotices, ...displayNotices, ...displayNotices];

  return (
    <div className="bg-[#3182F6] text-white py-2 sm:py-3 overflow-hidden flex items-center relative z-40 border-b border-blue-600">
      <div className="animate-marquee whitespace-nowrap pl-2 sm:pl-4">
        {content.map((notice, i) => (
          <span key={i} className="mx-4 sm:mx-8 text-sm sm:text-lg font-semibold flex items-center gap-1 sm:gap-2 inline-flex">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200 flex-shrink-0" />
            {notice}
          </span>
        ))}
      </div>
    </div>
  );
};

// 2. Firebase Config Modal
interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'warning' | 'default') => void;
}

const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose, onShowConfirm }) => {
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>(() => {
    const stored = getFirebaseConfigFromStorage();
    return stored || {
      apiKey: '',
      authDomain: '',
      databaseURL: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
    };
  });
  const [pasteText, setPasteText] = useState('');

  useEffect(() => {
    if (isOpen) {
      const stored = getFirebaseConfigFromStorage();
      if (stored) {
        setFirebaseConfig(stored);
      } else {
        setFirebaseConfig({
          apiKey: '',
          authDomain: '',
          databaseURL: '',
          projectId: '',
          storageBucket: '',
          messagingSenderId: '',
          appId: '',
        });
      }
      setPasteText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePasteConfig = () => {
    try {
      // JSON 형식 파싱 시도
      let parsed: any;
      
      // 먼저 JSON.parse 시도
      try {
        parsed = JSON.parse(pasteText);
      } catch {
        // JSON.parse 실패 시, JavaScript 객체 형식 파싱 시도
        // const firebaseConfig = {...} 또는 {...} 형식 지원
        const objectMatch = pasteText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          const objectStr = objectMatch[0];
          
          // 각 필드를 정규식으로 추출 (따옴표 처리 개선)
          const extractValue = (key: string): string => {
            // key: "value" 또는 key: 'value' 형식 매칭 (대소문자 구분 없음)
            // 여러 줄에 걸친 값도 처리 가능하도록 [\s\S] 사용
            const pattern = new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`, 'i');
            const match = objectStr.match(pattern);
            if (match && match[1]) {
              return match[1].trim();
            }
            return '';
          };
          
          parsed = {
            apiKey: extractValue('apiKey'),
            authDomain: extractValue('authDomain'),
            databaseURL: extractValue('databaseURL'),
            projectId: extractValue('projectId'),
            storageBucket: extractValue('storageBucket'),
            messagingSenderId: extractValue('messagingSenderId'),
            appId: extractValue('appId'),
          };
          
          // 값이 하나도 없으면 에러
          if (!parsed.apiKey && !parsed.databaseURL && !parsed.projectId) {
            throw new Error('No valid config found');
          }
        } else {
          throw new Error('Invalid format');
        }
      }

      // 파싱된 값으로 설정 업데이트
      if (parsed && typeof parsed === 'object') {
        setFirebaseConfig(prev => ({
          apiKey: parsed.apiKey || prev.apiKey,
          authDomain: parsed.authDomain || prev.authDomain,
          databaseURL: parsed.databaseURL || prev.databaseURL,
          projectId: parsed.projectId || prev.projectId,
          storageBucket: parsed.storageBucket || prev.storageBucket,
          messagingSenderId: parsed.messagingSenderId || prev.messagingSenderId,
          appId: parsed.appId || prev.appId,
        }));
        setPasteText('');
        onShowConfirm(
          '설정 적용 완료',
          'Firebase 설정이 적용되었습니다. 저장 버튼을 눌러 저장하세요.',
          () => {},
          'default'
        );
      } else {
        throw new Error('Invalid format');
      }
    } catch (error) {
      onShowConfirm(
        '파싱 오류',
        '설정 형식이 올바르지 않습니다. JSON 형식 또는 JavaScript 객체 형식으로 입력해주세요.',
        () => {},
        'warning'
      );
    }
  };

  const handleSave = () => {
    if (firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId) {
      saveFirebaseConfigToStorage(firebaseConfig);
      const success = initFirebase();
      if (success) {
        onShowConfirm(
          'Firebase 설정 저장',
          'Firebase 설정이 저장되었습니다. 페이지를 새로고침하면 적용됩니다.',
          () => {
            onClose();
          },
          'default'
        );
      } else {
        onShowConfirm(
          'Firebase 설정 오류',
          'Firebase 초기화에 실패했습니다. 설정을 확인해주세요.',
          () => {},
          'warning'
        );
      }
    } else {
      onShowConfirm(
        '필수 항목 누락',
        'API Key, Database URL, Project ID는 필수 항목입니다.',
        () => {},
        'warning'
      );
    }
  };

  const handleReset = () => {
    onShowConfirm(
      'Firebase 설정 초기화',
      'Firebase 설정을 초기화하시겠습니까? 저장된 설정이 삭제되고 페이지가 새로고침됩니다.',
      () => {
        clearFirebaseConfigFromStorage();
        onClose();
        // 페이지 새로고침
        window.location.reload();
      },
      'warning'
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[20px] sm:rounded-[24px] shadow-2xl p-6 sm:p-8 w-full max-w-2xl my-4 animate-modal-slide-in">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Database className="text-[#3182F6] w-5 h-5" />
            </div>
            Firebase 설정
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            Firebase Realtime Database 연결 정보를 입력하세요
          </p>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* 붙여넣기 영역 */}
          <div className="bg-blue-50 border border-blue-200 rounded-[12px] p-4 mb-4">
            <label className="text-xs font-semibold text-slate-700 mb-2 block">
              빠른 설정 (선택사항)
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Firebase 설정 객체를 한 번에 붙여넣으세요
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "project.firebaseapp.com",
  databaseURL: "https://...",
  projectId: "project-id",
  storageBucket: "project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};`}
              className="w-full bg-white border border-blue-300 rounded-[8px] px-3 py-2 text-xs font-mono text-slate-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              rows={8}
            />
            <button
              onClick={handlePasteConfig}
              disabled={!pasteText.trim()}
              className="mt-2 w-full py-2 bg-blue-600 text-white text-xs font-semibold rounded-[8px] hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200"
            >
              설정 적용
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="text-xs font-semibold text-slate-700 mb-3 block">
              개별 입력
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">API Key *</label>
            <input
              type="text"
              value={firebaseConfig.apiKey}
              onChange={(e) => setFirebaseConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="AIzaSy..."
              className="w-full bg-gray-50 border border-gray-200 rounded-[12px] px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Auth Domain *</label>
            <input
              type="text"
              value={firebaseConfig.authDomain}
              onChange={(e) => setFirebaseConfig(prev => ({ ...prev, authDomain: e.target.value }))}
              placeholder="project.firebaseapp.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-[12px] px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Database URL *</label>
            <input
              type="text"
              value={firebaseConfig.databaseURL}
              onChange={(e) => setFirebaseConfig(prev => ({ ...prev, databaseURL: e.target.value }))}
              placeholder="https://project-default-rtdb.region.firebasedatabase.app/"
              className="w-full bg-gray-50 border border-gray-200 rounded-[12px] px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Project ID *</label>
            <input
              type="text"
              value={firebaseConfig.projectId}
              onChange={(e) => setFirebaseConfig(prev => ({ ...prev, projectId: e.target.value }))}
              placeholder="project-id"
              className="w-full bg-gray-50 border border-gray-200 rounded-[12px] px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Storage Bucket</label>
            <input
              type="text"
              value={firebaseConfig.storageBucket}
              onChange={(e) => setFirebaseConfig(prev => ({ ...prev, storageBucket: e.target.value }))}
              placeholder="project.appspot.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-[12px] px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">Messaging Sender ID</label>
            <input
              type="text"
              value={firebaseConfig.messagingSenderId}
              onChange={(e) => setFirebaseConfig(prev => ({ ...prev, messagingSenderId: e.target.value }))}
              placeholder="123456789"
              className="w-full bg-gray-50 border border-gray-200 rounded-[12px] px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1.5 block">App ID</label>
            <input
              type="text"
              value={firebaseConfig.appId}
              onChange={(e) => setFirebaseConfig(prev => ({ ...prev, appId: e.target.value }))}
              placeholder="1:123456789:web:abc123"
              className="w-full bg-gray-50 border border-gray-200 rounded-[12px] px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-2 mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={handleReset}
            className="flex-1 py-3 bg-gray-100 text-slate-700 font-bold rounded-[12px] hover:bg-gray-200 transition-all duration-200 active:scale-[0.98]"
          >
            설정 초기화
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-slate-700 font-bold rounded-[12px] hover:bg-gray-200 transition-all duration-200 active:scale-[0.98]"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-[#3182F6] text-white font-bold rounded-[12px] hover:bg-[#2563EB] shadow-lg shadow-blue-500/30 transition-all duration-200 active:scale-[0.98]"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

// 3. Settings Modal
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ClinicSettings;
  onUpdate: (newSettings: ClinicSettings) => void;
  onSave?: () => Promise<void>; // Firebase 저장 함수 (선택적)
  onShowConfirm: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'warning' | 'default') => void;
  onOpenFirebaseConfig: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdate, onSave, onShowConfirm, onOpenFirebaseConfig }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [newNotice, setNewNotice] = useState('');
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<CustomStatus | null>(null);
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('blue');
  const [draggedStatusId, setDraggedStatusId] = useState<string | null>(null);
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setEditingStatusId(null);
      setEditingStatus(null);
      setNewStatusLabel('');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const colorOptions = [
    { value: 'blue', label: '파랑', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', color: '#3B82F6' },
    { value: 'green', label: '초록', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', color: '#10B981' },
    { value: 'amber', label: '주황', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', color: '#F59E0B' },
    { value: 'red', label: '빨강', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', color: '#EF4444' },
    { value: 'purple', label: '보라', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', color: '#A855F7' },
    { value: 'gray', label: '회색', bg: 'bg-gray-100', text: 'text-slate-500', border: 'border-gray-200', color: '#6B7280' },
  ];

  const handleAddNotice = () => {
    if (newNotice.trim()) {
      setLocalSettings(prev => ({
        ...prev,
        notices: [...prev.notices, newNotice.trim()]
      }));
      setNewNotice('');
    }
  };

  const removeNotice = (idx: number) => {
    setLocalSettings(prev => ({
      ...prev,
      notices: prev.notices.filter((_, i) => i !== idx)
    }));
  };

  const handleAddStatus = () => {
    if (newStatusLabel.trim()) {
      const colorOption = colorOptions.find(c => c.value === newStatusColor) || colorOptions[0];
      const newStatus: CustomStatus = {
        id: `CUSTOM_${Date.now()}`,
        label: newStatusLabel.trim(),
        color: newStatusColor,
        bgColor: colorOption.bg,
        textColor: colorOption.text,
        borderColor: colorOption.border,
      };
      setLocalSettings(prev => ({
        ...prev,
        customStatuses: [...prev.customStatuses, newStatus]
      }));
      setNewStatusLabel('');
      setNewStatusColor('blue');
    }
  };

  const handleEditStatus = (status: CustomStatus) => {
    setEditingStatusId(status.id);
    setEditingStatus({ ...status });
  };

  const handleSaveStatusEdit = () => {
    if (editingStatus && editingStatus.label.trim()) {
      const colorOption = colorOptions.find(c => c.value === editingStatus.color) || colorOptions[0];
      const updatedStatus: CustomStatus = {
        ...editingStatus,
        bgColor: colorOption.bg,
        textColor: colorOption.text,
        borderColor: colorOption.border,
      };
      setLocalSettings(prev => ({
        ...prev,
        customStatuses: prev.customStatuses.map(s => s.id === editingStatus.id ? updatedStatus : s)
      }));
      setEditingStatusId(null);
      setEditingStatus(null);
    }
  };

  const handleDeleteStatus = (statusId: string) => {
    onShowConfirm(
      '상태 삭제',
      '이 상태를 삭제하시겠습니까? 해당 상태를 사용 중인 환자는 "대기" 상태로 변경됩니다.',
      () => {
        setLocalSettings(prev => ({
          ...prev,
          customStatuses: prev.customStatuses.filter(s => s.id !== statusId)
        }));
      },
      'warning'
    );
  };

  // 드래그 앤 드롭 핸들러
  const handleStatusDragStart = (e: React.DragEvent, statusId: string) => {
    setDraggedStatusId(statusId);
    e.dataTransfer.effectAllowed = 'move';
    const dragImage = document.createElement('div');
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-9999px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleStatusDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedStatusId && draggedStatusId !== statusId) {
      setDragOverStatusId(statusId);
    }
  };

  const handleStatusDrop = (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedStatusId || draggedStatusId === targetStatusId) {
      setDraggedStatusId(null);
      setDragOverStatusId(null);
      return;
    }

    const statuses = [...localSettings.customStatuses];
    const draggedIndex = statuses.findIndex(s => s.id === draggedStatusId);
    const targetIndex = statuses.findIndex(s => s.id === targetStatusId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // 순서 변경
      const [removed] = statuses.splice(draggedIndex, 1);
      statuses.splice(targetIndex, 0, removed);

      setLocalSettings(prev => ({
        ...prev,
        customStatuses: statuses
      }));
    }

    setDraggedStatusId(null);
    setDragOverStatusId(null);
  };

  const handleStatusDragEnd = () => {
    setDraggedStatusId(null);
    setDragOverStatusId(null);
  };

  const handleSave = async () => {
    // 설정 업데이트
    onUpdate(localSettings);
    
    // Firebase 저장 (onSave가 제공된 경우)
    if (onSave) {
      try {
        await onSave();
        // 성공 시 모달 닫기 (토스트 메시지는 App.tsx의 handleSave에서 표시됨)
        onClose();
      } catch (error) {
        console.error('Error saving settings:', error);
        // 에러는 onSave 내부에서 처리되므로 모달은 열어둠
      }
    } else {
      // onSave가 없으면 그냥 모달 닫기
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[20px] sm:rounded-[24px] shadow-2xl p-6 sm:p-8 w-full max-w-2xl my-4 animate-modal-slide-in">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Megaphone className="text-[#3182F6] w-5 h-5" />
            </div>
            환경 설정
          </h3>
        </div>

        <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2">
          {/* Firebase 설정 */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block flex items-center gap-2">
              <Database size={14} className="text-slate-400" />
              Firebase 설정
            </label>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-[16px] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block">Firebase 연결 설정</span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    Firebase Realtime Database 연결 정보를 관리합니다
                  </span>
                </div>
                <button
                  onClick={onOpenFirebaseConfig}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-white rounded-[8px] border border-blue-200 hover:border-blue-300 transition-all"
                >
                  설정 열기
                </button>
              </div>
            </div>
          </div>

          {/* View Options */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block">화면 표시</label>
            <div className="bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-[16px] p-4 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block">원장님 이름 표시</span>
                  <span className="text-xs text-slate-500 mt-0.5 block">진료실 헤더에 원장님 이름을 표시합니다</span>
                </div>
                <button 
                  onClick={() => setLocalSettings(prev => ({...prev, showDoctorNames: !prev.showDoctorNames}))}
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                    localSettings.showDoctorNames 
                      ? 'bg-[#3182F6] shadow-lg shadow-blue-500/30' 
                      : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-all duration-200 shadow-sm ${
                    localSettings.showDoctorNames ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Status Management */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block flex items-center gap-2">
              <Tag size={14} className="text-slate-400" />
              진료 상태 관리
            </label>
            
            {/* Add New Status */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-50/50 border border-gray-100 rounded-[16px] p-4 mb-4">
              <div className="space-y-3">
                <input 
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                  placeholder="상태 이름 입력 (예: 수납 대기)"
                  className="w-full bg-white border-0 rounded-[12px] px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#3182F6] focus:shadow-md outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
                />
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-slate-600 whitespace-nowrap flex-shrink-0">색상:</label>
                  <div className="flex gap-1 flex-wrap">
                    {colorOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewStatusColor(opt.value)}
                        className={`w-6 h-6 rounded-full border-2 transition-all duration-200 flex-shrink-0 ${
                          newStatusColor === opt.value 
                            ? 'border-slate-900 scale-110 shadow-md ring-1 ring-offset-1 ring-slate-900/20' 
                            : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                        }`}
                        style={{ backgroundColor: opt.color }}
                        title={opt.label}
                      />
                    ))}
                  </div>
                </div>
                <button 
                  onClick={handleAddStatus}
                  className="w-full bg-[#3182F6] text-white px-3 py-2 rounded-[12px] font-semibold text-xs hover:bg-[#2563EB] shadow-md shadow-blue-500/20 transition-all duration-200 active:scale-[0.98]"
                >
                  상태 추가
                </button>
              </div>
            </div>

            {/* Status List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {localSettings.customStatuses.map((status) => {
                const isDragging = draggedStatusId === status.id;
                const isDragOver = dragOverStatusId === status.id;
                return (
                <div 
                  key={status.id} 
                  draggable={editingStatusId !== status.id}
                  onDragStart={(e) => editingStatusId !== status.id && handleStatusDragStart(e, status.id)}
                  onDragOver={(e) => editingStatusId !== status.id && handleStatusDragOver(e, status.id)}
                  onDrop={(e) => editingStatusId !== status.id && handleStatusDrop(e, status.id)}
                  onDragEnd={handleStatusDragEnd}
                  className={`bg-white border border-gray-100 rounded-[12px] p-2.5 hover:border-gray-200 hover:shadow-sm transition-all ${
                    editingStatusId !== status.id ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${
                    isDragging ? 'opacity-50 scale-95' : ''
                  } ${
                    isDragOver ? 'border-2 border-blue-400 border-dashed' : ''
                  }`}
                >
                  {editingStatusId === status.id ? (
                    <div className="space-y-2.5">
                      <input
                        value={editingStatus?.label || ''}
                        onChange={(e) => setEditingStatus(prev => prev ? {...prev, label: e.target.value} : null)}
                        className="w-full bg-gray-50 border-0 rounded-[12px] px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#3182F6] focus:bg-white outline-none transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveStatusEdit()}
                        autoFocus
                      />
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-slate-600 whitespace-nowrap flex-shrink-0">색상:</label>
                        <div className="flex gap-1 flex-wrap">
                          {colorOptions.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setEditingStatus(prev => prev ? {...prev, color: opt.value} : null)}
                              className={`w-6 h-6 rounded-full border-2 transition-all duration-200 flex-shrink-0 ${
                                editingStatus?.color === opt.value 
                                  ? 'border-slate-900 scale-110 shadow-md ring-1 ring-offset-1 ring-slate-900/20' 
                                  : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                              }`}
                              style={{ backgroundColor: opt.color }}
                              title={opt.label}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSaveStatusEdit}
                          className="flex-1 bg-[#3182F6] text-white px-3 py-2 rounded-[10px] text-xs font-semibold hover:bg-[#2563EB] shadow-md shadow-blue-500/20 transition-all duration-200 active:scale-[0.98]"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => {
                            setEditingStatusId(null);
                            setEditingStatus(null);
                          }}
                          className="flex-1 bg-gray-100 text-slate-700 px-3 py-2 rounded-[10px] text-xs font-semibold hover:bg-gray-200 transition-all duration-200 active:scale-[0.98]"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="cursor-grab text-slate-300 hover:text-slate-500 flex-shrink-0">
                          <GripVertical size={16} />
                        </div>
                        <span className={`${status.bgColor} ${status.textColor} px-2.5 py-1 rounded-full text-xs font-semibold min-w-[70px] text-center flex-shrink-0`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleEditStatus(status)}
                          className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-[8px] transition-all duration-200"
                          title="편집"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteStatus(status.id)}
                          className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-[8px] transition-all duration-200"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          </div>

          {/* Notices */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block">진료 안내 문구 관리</label>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  value={newNotice}
                  onChange={(e) => setNewNotice(e.target.value)}
                  placeholder="새로운 안내 문구 입력"
                  className="flex-1 bg-gray-50 border-0 rounded-[12px] px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#3182F6] focus:bg-white focus:shadow-md outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNotice()}
                />
                <button 
                  onClick={handleAddNotice} 
                  className="bg-[#3182F6] text-white px-4 py-2.5 rounded-[12px] font-bold text-sm whitespace-nowrap hover:bg-[#2563EB] shadow-md shadow-blue-500/20 transition-all duration-200 active:scale-[0.98]"
                >
                  추가
                </button>
              </div>
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {localSettings.notices.map((notice, idx) => (
                  <li key={idx} className="flex justify-between items-start gap-3 bg-white border border-gray-100 rounded-[12px] p-3 hover:border-gray-200 hover:shadow-sm transition-all">
                    <span className="break-words flex-1 text-sm text-slate-700 font-medium">{notice}</span>
                    <button 
                      onClick={() => removeNotice(idx)} 
                      className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-[8px] transition-all duration-200 flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-2 mt-8 pt-6 border-t border-gray-100">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 bg-gray-100 text-slate-700 font-bold rounded-[12px] hover:bg-gray-200 transition-all duration-200 active:scale-[0.98]"
          >
            취소
          </button>
          <button 
            onClick={handleSave} 
            className="flex-1 py-3 bg-[#3182F6] text-white font-bold rounded-[12px] hover:bg-[#2563EB] shadow-lg shadow-blue-500/30 transition-all duration-200 active:scale-[0.98]"
          >
            설정 적용
          </button>
        </div>
      </div>
    </div>
  );
};

// 3. Add Patient Modal
interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
  roomId: RoomId;
  roomName: string;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onAdd, roomId, roomName }) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[20px] sm:rounded-[24px] shadow-2xl p-6 sm:p-8 w-full max-w-sm my-4 animate-modal-slide-in">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">환자 접수</h3>
        <p className="text-slate-500 text-xs sm:text-sm mb-4 sm:mb-6">
          <span className="font-semibold text-blue-600">{roomName}</span> 대기열에 추가합니다.
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="성함 입력"
            className="w-full bg-gray-50 border-0 rounded-[12px] px-4 py-2.5 sm:py-3 text-base sm:text-lg font-medium text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#3182F6] transition-all"
          />
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 sm:py-3 text-slate-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-[12px] transition-colors text-sm sm:text-base"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 sm:py-3 text-white font-bold bg-[#3182F6] hover:bg-[#2563EB] rounded-[12px] shadow-lg shadow-blue-500/30 transition-all text-sm sm:text-base"
            >
              등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3-1. Edit Room Name Modal
interface EditRoomNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
  currentName: string;
  roomId: RoomId;
}

const EditRoomNameModal: React.FC<EditRoomNameModalProps> = ({ isOpen, onClose, onSave, currentName, roomId }) => {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== currentName) {
      onSave(name.trim());
      onClose();
    } else if (name.trim() === currentName) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[20px] sm:rounded-[24px] shadow-2xl p-6 sm:p-8 w-full max-w-sm my-4 animate-modal-slide-in">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">진료실명 수정</h3>
        <p className="text-slate-500 text-xs sm:text-sm mb-4 sm:mb-6">
          <span className="font-semibold text-blue-600">{roomId === RoomId.ROOM_1 ? '1' : '2'}진료실</span>의 이름을 변경합니다.
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="진료실 이름 입력"
            className="w-full bg-gray-50 border-0 rounded-[12px] px-4 py-2.5 sm:py-3 text-base sm:text-lg font-medium text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#3182F6] transition-all"
          />
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 sm:py-3 text-slate-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-[12px] transition-colors text-sm sm:text-base"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 sm:py-3 text-white font-bold bg-[#3182F6] hover:bg-[#2563EB] rounded-[12px] shadow-lg shadow-blue-500/30 transition-all text-sm sm:text-base"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3-2. Edit Doctor Name Modal
interface EditDoctorNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
  currentName: string;
  roomId: RoomId;
}

const EditDoctorNameModal: React.FC<EditDoctorNameModalProps> = ({ isOpen, onClose, onSave, currentName, roomId }) => {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== currentName) {
      onSave(name.trim());
      onClose();
    } else if (name.trim() === currentName) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[20px] sm:rounded-[24px] shadow-2xl p-6 sm:p-8 w-full max-w-sm my-4 animate-modal-slide-in">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">원장명 수정</h3>
        <p className="text-slate-500 text-xs sm:text-sm mb-4 sm:mb-6">
          <span className="font-semibold text-blue-600">{roomId === RoomId.ROOM_1 ? '1' : '2'}진료실</span> 원장님 성함을 변경합니다.
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="원장님 성함 입력"
            className="w-full bg-gray-50 border-0 rounded-[12px] px-4 py-2.5 sm:py-3 text-base sm:text-lg font-medium text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#3182F6] transition-all"
          />
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 sm:py-3 text-slate-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-[12px] transition-colors text-sm sm:text-base"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 sm:py-3 text-white font-bold bg-[#3182F6] hover:bg-[#2563EB] rounded-[12px] shadow-lg shadow-blue-500/30 transition-all text-sm sm:text-base"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 4. Patient Card
interface PatientCardProps {
  patient: Patient;
  rank: number;
  isAdmin: boolean;
  customStatuses: CustomStatus[];
  onStatusChange: (id: string, status: PatientStatus) => void;
  onDelete: (id: string) => void;
  draggedId: string | null;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetId: string) => void;
  onDragEnd?: () => void;
}

const PatientCard: React.FC<PatientCardProps> = ({ 
  patient, 
  rank, 
  isAdmin,
  customStatuses,
  onStatusChange, 
  onDelete,
  draggedId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}) => {
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const nameTextRef = useRef<HTMLSpanElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);
  
  // Find status configuration
  const statusConfig = customStatuses.find(s => s.id === patient.status) || customStatuses[0];
  
  let cardBg = "bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200";
  let statusBadge = null;

  if (statusConfig) {
    const isHighlighted = statusConfig.icon === 'stethoscope' || statusConfig.label === '진료 중';
    
    statusBadge = (
      <span className={`${statusConfig.textColor} font-bold text-xs sm:text-sm ${statusConfig.bgColor} px-2 sm:px-3 py-1 rounded-full min-w-[60px] sm:min-w-[70px] flex justify-center flex-shrink-0`}>
        {statusConfig.icon === 'stethoscope' && <Stethoscope size={12} className="stroke-[3] mr-1" />}
        <span className="whitespace-nowrap">{statusConfig.label}</span>
      </span>
    );
    
    if (isHighlighted) {
      cardBg = `${statusConfig.bgColor}/80 border-2 ${statusConfig.borderColor || 'border-gray-300'} shadow-lg z-10 scale-[1.01]`;
    } else if (statusConfig.borderColor) {
      cardBg = `${statusConfig.bgColor} border ${statusConfig.borderColor}`;
    } else {
      cardBg = `${statusConfig.bgColor} border border-gray-100`;
    }
  } else {
    // Fallback
    statusBadge = (
      <span className="text-slate-500 font-bold text-xs sm:text-sm bg-gray-100 px-2 sm:px-3 py-1 rounded-full min-w-[60px] sm:min-w-[70px] flex justify-center flex-shrink-0">
        대기
      </span>
    );
  }

  // Check if name needs scrolling by comparing text width with container width
  useEffect(() => {
    const checkScrollNeeded = () => {
      if (nameContainerRef.current && nameTextRef.current) {
        // Use requestAnimationFrame to ensure DOM is fully rendered
        requestAnimationFrame(() => {
          if (nameContainerRef.current && nameTextRef.current) {
            const containerWidth = nameContainerRef.current.offsetWidth;
            const textWidth = nameTextRef.current.scrollWidth;
            // 컨테이너가 실제로 렌더링되었고 너비가 있는지 확인
            if (containerWidth > 0 && textWidth > 0) {
              // 약간의 여유를 두고 비교 (10px)
              setNeedsScroll(textWidth > containerWidth + 10);
            }
          }
        });
      }
    };

    // Initial check with multiple delays to ensure DOM is ready
    const timeoutId1 = setTimeout(checkScrollNeeded, 50);
    const timeoutId2 = setTimeout(checkScrollNeeded, 200);
    const timeoutId3 = setTimeout(checkScrollNeeded, 500);
    
    // Check on resize with debounce
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkScrollNeeded, 150);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Check when patient name changes
    checkScrollNeeded();
    
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [patient.name]);

  const rankBgColor = statusConfig && (statusConfig.icon === 'stethoscope' || statusConfig.label === '진료 중')
    ? 'bg-[#3182F6] text-white' 
    : 'bg-gray-100 text-gray-500';

  const isDragging = draggedId === patient.id;
  const isDragOver = draggedId && draggedId !== patient.id;

  return (
    <div 
      draggable={isAdmin}
      onDragStart={(e) => {
        if (isAdmin && onDragStart) {
          onDragStart(e, patient.id);
          e.dataTransfer.effectAllowed = 'move';
          // 드래그 이미지 설정 (투명하게)
          const dragImage = document.createElement('div');
          dragImage.style.position = 'absolute';
          dragImage.style.top = '-9999px';
          document.body.appendChild(dragImage);
          e.dataTransfer.setDragImage(dragImage, 0, 0);
          setTimeout(() => document.body.removeChild(dragImage), 0);
        }
      }}
      onDragOver={(e) => {
        if (isAdmin && onDragOver) {
          e.preventDefault();
          e.stopPropagation();
          onDragOver(e);
        }
      }}
      onDrop={(e) => {
        if (isAdmin && onDrop) {
          e.preventDefault();
          e.stopPropagation();
          onDrop(e, patient.id);
        }
      }}
      onDragEnd={() => {
        if (isAdmin && onDragEnd) {
          onDragEnd();
        }
      }}
      className={`
        relative flex flex-col sm:flex-row items-start sm:items-center p-3 sm:p-5 md:p-6 rounded-[16px] sm:rounded-[20px] mb-3 transition-all duration-300 w-full max-w-full box-border
        ${cardBg} ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isDragOver ? 'border-2 border-blue-400 border-dashed' : ''}
      `}
    >
      <div className={`
        flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full font-bold text-sm sm:text-base md:text-lg mr-3 sm:mr-4 flex-shrink-0
        ${rankBgColor}
      `}>
        {rank}
      </div>
      
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 overflow-hidden min-w-0 pr-2 w-full sm:w-auto">
        {/* Name with Scrolling logic - only scroll if text actually overflows */}
        <div ref={nameContainerRef} className="flex-1 min-w-0 overflow-hidden relative h-8 sm:h-9 md:h-10 flex items-center">
             {/* Hidden text for measuring width - positioned absolutely but visible for measurement */}
             <span 
               ref={nameTextRef} 
               className="font-bold text-lg sm:text-xl md:text-2xl tracking-tight text-slate-800 whitespace-nowrap invisible absolute left-0 top-0"
               aria-hidden="true"
               style={{ visibility: 'hidden', position: 'absolute' }}
             >
               {patient.name}
             </span>
             {/* Visible text */}
             {needsScroll ? (
                 <div className="animate-marquee whitespace-nowrap absolute left-0 top-0 flex items-center h-full">
                    <span className="font-bold text-lg sm:text-xl md:text-2xl tracking-tight text-slate-800 mr-8 inline-block">{patient.name}</span>
                    <span className="font-bold text-lg sm:text-xl md:text-2xl tracking-tight text-slate-800 mr-8 inline-block">{patient.name}</span>
                    <span className="font-bold text-lg sm:text-xl md:text-2xl tracking-tight text-slate-800 mr-8 inline-block">{patient.name}</span>
                    <span className="font-bold text-lg sm:text-xl md:text-2xl tracking-tight text-slate-800 mr-8 inline-block">{patient.name}</span>
                 </div>
             ) : (
                <span className="font-bold text-lg sm:text-xl md:text-2xl tracking-tight text-slate-800 block w-full truncate">
                    {patient.name}
                </span>
             )}
        </div>
        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto flex-shrink-0">
            {statusBadge}
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <select
            value={patient.status}
            onChange={(e) => onStatusChange(patient.id, e.target.value as PatientStatus)}
            className="bg-gray-50 border-none text-xs sm:text-sm font-bold text-slate-700 py-1.5 sm:py-2 pl-2 sm:pl-3 pr-6 sm:pr-8 rounded-[12px] cursor-pointer hover:bg-gray-100 focus:ring-2 focus:ring-[#3182F6] outline-none appearance-none"
            style={{ 
               backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
               backgroundPosition: `right 0.5rem center`,
               backgroundRepeat: 'no-repeat',
               backgroundSize: '1.5em 1.5em'
            }}
          >
            {customStatuses.map(status => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>

          <button 
            onClick={() => onDelete(patient.id)}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="삭제"
          >
            <X size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
          
          <div className="cursor-grab text-slate-300 hover:text-slate-500 hidden sm:block">
             <GripVertical size={20} />
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // --- State Architecture ---
  // livePatients, liveSettings: Source of Truth (Synced with Firebase, used for Public View)
  // draftPatients, draftSettings: Working copy for Admin (Synced from Live on mount/switch, used for Admin View)
  
  const [livePatients, setLivePatients] = useState<Patient[]>([]);
  const [liveSettings, setLiveSettings] = useState<ClinicSettings>(INITIAL_SETTINGS);

  // Draft state initialized from Live state
  const [draftPatients, setDraftPatients] = useState<Patient[]>([]);
  const [draftSettings, setDraftSettings] = useState<ClinicSettings>(INITIAL_SETTINGS);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRoom, setModalRoom] = useState<RoomId>(RoomId.ROOM_1);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [firebaseConfigModalOpen, setFirebaseConfigModalOpen] = useState(false);
  const [editRoomNameModalOpen, setEditRoomNameModalOpen] = useState(false);
  const [editDoctorNameModalOpen, setEditDoctorNameModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<RoomId>(RoomId.ROOM_1);

  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Confirm Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalOnConfirm, setConfirmModalOnConfirm] = useState<(() => void) | null>(null);
  const [confirmModalVariant, setConfirmModalVariant] = useState<'danger' | 'warning' | 'default'>('default');

  // Confirm Modal Helper
  const showConfirmModal = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: 'danger' | 'warning' | 'default' = 'default'
  ) => {
    setConfirmModalTitle(title);
    setConfirmModalMessage(message);
    setConfirmModalOnConfirm(() => onConfirm);
    setConfirmModalVariant(variant);
    setConfirmModalOpen(true);
  };

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
      const patientsWithOrder = patients.map(p => ({
        ...p,
        order: p.order ?? p.registeredAt
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
        console.error('Error loading initial data:', error);
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

  // When entering admin mode, sync draft with live if no changes
  useEffect(() => {
    if (isAdmin && !hasUnsavedChanges) {
      setDraftPatients(livePatients);
      setDraftSettings(liveSettings);
    }
  }, [isAdmin, livePatients, liveSettings, hasUnsavedChanges]);

  // --- Admin Handlers (Operate on Draft) ---

  // 완료된 환자인지 확인하는 헬퍼 함수 (상태 변경 전에 사용)
  const checkIsCompletedStatus = (status: PatientStatus | string, customStatuses: CustomStatus[]): boolean => {
    const customStatus = customStatuses.find(s => s.id === status);
    return customStatus?.label === '완료' || false;
  };

  const handleAddPatient = async (name: string) => {
    const registeredAt = Date.now();
    // "대기" 상태를 찾거나, 없으면 첫 번째 상태 사용
    const waitingStatus = draftSettings.customStatuses.find(s => s.label === '대기') || draftSettings.customStatuses[0];
    const newPatient: Patient = {
      id: registeredAt.toString(),
      name,
      status: waitingStatus?.id || PatientStatus.WAITING,
      roomId: modalRoom,
      registeredAt,
      order: registeredAt, // order 필드 추가
    };
    
    // Firebase 초기화 확인
    if (!isFirebaseInitialized()) {
      setToastMessage('데이터 저장을 위해 Firebase 설정이 필요합니다. 설정 메뉴에서 Firebase 연결 정보를 입력해주세요.');
      setShowToast(true);
      return;
    }

    // Draft에 추가 (즉시 UI 반영)
    setDraftPatients(prev => [...prev, newPatient]);
    setHasUnsavedChanges(true);
    
    // Firebase에 저장 (비동기)
    try {
      await addPatientToFirebase(newPatient);
    } catch (error) {
      console.error('Error adding patient to Firebase:', error);
      setToastMessage('환자 추가 중 오류가 발생했습니다');
      setShowToast(true);
    }
  };

  const handleStatusChange = async (id: string, status: PatientStatus) => {
    const now = Date.now();
    const isCompleting = checkIsCompletedStatus(status, draftSettings.customStatuses);
    
    // Firebase 초기화 확인
    if (!isFirebaseInitialized()) {
      setToastMessage('상태 변경을 저장하려면 Firebase 설정이 필요합니다. 설정 메뉴에서 Firebase 연결 정보를 입력해주세요.');
      setShowToast(true);
      return;
    }

    // Draft에 반영 (즉시 UI 반영)
    setDraftPatients(prev => prev.map(p => {
      if (p.id === id) {
        // 완료 상태로 변경하는 경우 completedAt 기록
        if (isCompleting && !p.completedAt) {
          return { ...p, status, completedAt: now };
        }
        return { ...p, status };
      }
      return p;
    }));
    setHasUnsavedChanges(true);
    
    // Firebase에 저장 (비동기)
    try {
      const updateData: any = { status };
      if (isCompleting) {
        updateData.completedAt = now;
      }
      await updatePatientInFirebase(id, updateData);
    } catch (error) {
      console.error('Error updating patient status in Firebase:', error);
      setToastMessage('상태 변경 중 오류가 발생했습니다');
      setShowToast(true);
    }
  };

  const handleDeletePatient = async (id: string) => {
    // Firebase 초기화 확인
    if (!isFirebaseInitialized()) {
      setToastMessage('환자 삭제를 저장하려면 Firebase 설정이 필요합니다. 설정 메뉴에서 Firebase 연결 정보를 입력해주세요.');
      setShowToast(true);
      return;
    }

    showConfirmModal(
      '환자 삭제',
      '해당 환자를 대기목록에서 삭제하시겠습니까?',
      async () => {
        // Draft에서 제거 (즉시 UI 반영)
        setDraftPatients(prev => prev.filter(p => p.id !== id));
        setHasUnsavedChanges(true);
        
        // Firebase에서 삭제 (비동기)
        try {
          await deletePatientFromFirebase(id);
        } catch (error) {
          console.error('Error deleting patient from Firebase:', error);
          setToastMessage('환자 삭제 중 오류가 발생했습니다');
          setShowToast(true);
        }
      },
      'danger'
    );
  };

  // Drag and Drop reordering
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const currentList = [...draftPatients];
    const draggedIndex = currentList.findIndex(p => p.id === draggedId);
    const targetIndex = currentList.findIndex(p => p.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    const draggedPatient = currentList[draggedIndex];
    const targetPatient = currentList[targetIndex];
    
    // 같은 진료실인지 확인
    if (draggedPatient.roomId !== targetPatient.roomId) {
      setDraggedId(null);
      return;
    }

    // 배열에서 드래그된 항목 제거하고 타겟 위치에 삽입
    const newList = [...currentList];
    const [movedItem] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, movedItem);
    
    // 같은 진료실의 환자들만 필터링하여 order 재계산
    const roomId = draggedPatient.roomId;
    const roomPatients = newList.filter(p => p.roomId === roomId);
    const otherPatients = newList.filter(p => p.roomId !== roomId);
    
    // 같은 진료실 환자들의 order 재계산 (시간 기반으로 순서 보장)
    const baseTime = Math.min(...roomPatients.map(p => p.registeredAt));
    const updatedRoomPatients = roomPatients.map((patient, index) => ({
      ...patient,
      order: baseTime + index * 1000 // 순서에 따라 order 값 조정
    }));
    
    // 다른 진료실 환자들과 합치기
    const updatedList = [...otherPatients, ...updatedRoomPatients];
    
    // Firebase 초기화 확인
    if (!isFirebaseInitialized()) {
      setToastMessage('순서 변경을 저장하려면 Firebase 설정이 필요합니다. 설정 메뉴에서 Firebase 연결 정보를 입력해주세요.');
      setShowToast(true);
      return;
    }

    // 상태 업데이트
    setDraftPatients(updatedList);
    setHasUnsavedChanges(true);
    setDraggedId(null);
    
    // Firebase에 같은 진료실의 모든 환자 order 업데이트 (비동기)
    try {
      const updatePromises = updatedRoomPatients.map(patient =>
        updatePatientInFirebase(patient.id, { order: patient.order })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating patient order in Firebase:', error);
      setToastMessage('순서 변경 중 오류가 발생했습니다');
      setShowToast(true);
    }
  };

  const updateSettings = (newSettings: ClinicSettings) => {
    setDraftSettings(newSettings);
    setHasUnsavedChanges(true);
  };

  const handleOpenRoomNameEdit = (roomId: RoomId) => {
    if (!isAdmin) return;
    setEditingRoomId(roomId);
    setEditRoomNameModalOpen(true);
  };

  const handleSaveRoomName = (newName: string) => {
    setDraftSettings(prev => ({
      ...prev,
      roomNames: { ...prev.roomNames, [editingRoomId]: newName }
    }));
    setHasUnsavedChanges(true);
  };

  const handleOpenDoctorNameEdit = (roomId: RoomId) => {
    if (!isAdmin) return;
    setEditingRoomId(roomId);
    setEditDoctorNameModalOpen(true);
  };

  const handleSaveDoctorName = (newName: string) => {
    setDraftSettings(prev => ({
      ...prev,
      doctorNames: { ...prev.doctorNames, [editingRoomId]: newName }
    }));
    setHasUnsavedChanges(true);
  };

  // --- Global Handlers ---

  const handleSave = async () => {
    // Firebase 초기화 확인
    if (!isFirebaseInitialized()) {
      setToastMessage('변경사항을 저장하려면 Firebase 설정이 필요합니다. 설정 메뉴에서 Firebase 연결 정보를 입력해주세요.');
      setShowToast(true);
      return;
    }

    try {
      // 모든 환자 데이터를 Firebase에 저장
      // (실시간 구독으로 자동 업데이트되므로 개별 업데이트는 이미 처리됨)
      
      // 설정을 Firebase에 저장
      await updateSettingsInFirebase(draftSettings);
      
      setLivePatients(draftPatients);
      setLiveSettings(draftSettings);
      
      setHasUnsavedChanges(false);
      setToastMessage('저장되었습니다');
      setShowToast(true);
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      setToastMessage('저장 중 오류가 발생했습니다');
      setShowToast(true);
    }
  };

  const handleToggleView = () => {
    if (isAdmin && hasUnsavedChanges) {
      showConfirmModal(
        '변경사항 저장',
        '저장하지 않은 변경사항이 있습니다. 저장하지 않고 나가시겠습니까?',
        () => {
          setHasUnsavedChanges(false);
          setIsAdmin(!isAdmin);
        },
        'warning'
      );
      return;
    }
    setIsAdmin(!isAdmin);
  };

  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      document.exitFullscreen();
    }
  };

  // --- Render Helpers ---

  // Determine which data to show
  const activePatients = isAdmin ? draftPatients : livePatients;
  const activeSettings = isAdmin ? draftSettings : liveSettings;

  // 완료된 환자인지 확인하는 헬퍼 함수
  const isCompletedPatient = (patient: Patient): boolean => {
    const customStatus = activeSettings.customStatuses.find(s => s.id === patient.status);
    return customStatus?.label === '완료' || false;
  };

  // 완료된 환자 목록 (관리자 화면에서만 표시)
  // 상태가 COMPLETED이거나 커스텀 상태의 라벨이 "완료"인 경우 포함
  const completedPatients = isAdmin ? draftPatients
    .filter(p => isCompletedPatient(p))
    .map(p => {
      // completedAt이 없으면 현재 시간으로 설정 (기존 완료 환자 처리)
      if (!p.completedAt && isCompletedPatient(p)) {
        return { ...p, completedAt: p.registeredAt + 3600000 }; // 접수 후 1시간으로 가정
      }
      return p;
    })
    .sort((a, b) => {
      const orderA = a.order ?? a.registeredAt;
      const orderB = b.order ?? b.registeredAt;
      return orderB - orderA; // 최신순 정렬
    }) : [];

  const renderRoomColumn = (roomId: RoomId) => {
    // 공개 화면에서는 완료된 환자 제외, 관리자 화면에서도 대기 목록에서는 완료된 환자 제외
    const roomPatients = activePatients
      .filter(p => {
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
      <div className="flex-1 flex flex-col min-h-0 bg-white/50 rounded-[16px] sm:rounded-[24px] border border-white shadow-sm backdrop-blur-sm">
        {/* Room Header */}
        <div className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 bg-white/80">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
             <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[16px] flex items-center justify-center font-bold text-xl sm:text-2xl shadow-sm bg-[#3182F6] text-white flex-shrink-0">
                {roomId === RoomId.ROOM_1 ? '1' : '2'}
             </div>
             <div className="min-w-0 flex-1 sm:flex-none">
                <h2 
                    onClick={() => handleOpenRoomNameEdit(roomId)}
                    className={`text-lg sm:text-2xl font-bold text-slate-800 flex items-center gap-2 truncate sm:truncate-none ${isAdmin ? 'cursor-pointer hover:text-blue-600 group' : ''}`}
                >
                {activeSettings.roomNames[roomId]}
                {isAdmin && <Edit3 size={14} className="sm:w-4 sm:h-4 opacity-0 group-hover:opacity-50 flex-shrink-0" />}
                </h2>
                {activeSettings.showDoctorNames && (
                <p 
                    onClick={() => handleOpenDoctorNameEdit(roomId)}
                    className={`text-sm sm:text-lg font-medium text-slate-500 mt-1 flex items-center gap-2 truncate sm:truncate-none ${isAdmin ? 'cursor-pointer hover:text-blue-500 group' : ''}`}
                >
                    {activeSettings.doctorNames[roomId]} 진료
                    {isAdmin && <Edit3 size={12} className="sm:w-3.5 sm:h-3.5 opacity-0 group-hover:opacity-50 flex-shrink-0" />}
                </p>
                )}
             </div>
          </div>
          
          {isAdmin && (
             <Button 
                variant="secondary"
                size="sm"
                className="gap-1 font-bold shadow-sm w-full sm:w-auto justify-center"
                onClick={() => {
                  setModalRoom(roomId);
                  setModalOpen(true);
                }}
             >
                <Plus size={14} className="sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">환자 접수</span>
             </Button>
          )}
        </div>

        {/* Patient List */}
        <div className="flex-1 min-h-0 overflow-hidden px-1 sm:px-2 py-3 sm:py-4 patient-list-container w-full">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 py-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4 animate-spin">
                <RefreshCw size={20} className="sm:w-6 sm:h-6" />
              </div>
              <p className="font-medium text-sm sm:text-base">데이터를 불러오는 중...</p>
            </div>
          ) : roomPatients.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 py-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <RefreshCw size={20} className="sm:w-6 sm:h-6" />
              </div>
              <p className="font-medium text-sm sm:text-base">대기 중인 환자가 없습니다.</p>
            </div>
          ) : isAdmin ? (
            // 관리자 모드: 일반 스크롤
            <div className="h-full overflow-y-auto no-scrollbar px-2">
              {roomPatients.map((patient, index) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  rank={index + 1}
                  isAdmin={isAdmin}
                  customStatuses={activeSettings.customStatuses || []}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeletePatient}
                  draggedId={draggedId}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}
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
                    customStatuses={activeSettings.customStatuses || []}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeletePatient}
                    draggedId={draggedId}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
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
                        customStatuses={activeSettings.customStatuses || []}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDeletePatient}
                        draggedId={draggedId}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                    {/* 복제 목록 (순환 효과) */}
                    {roomPatients.slice(3).map((patient, index) => (
                      <PatientCard
                        key={`${patient.id}-2`}
                        patient={patient}
                        rank={index + 4}
                        isAdmin={isAdmin}
                        customStatuses={activeSettings.customStatuses || []}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDeletePatient}
                        draggedId={draggedId}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
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
        onSave={handleSave}
        onOpenSettings={() => setSettingsModalOpen(true)}
        hasChanges={hasUnsavedChanges}
      />
      
      <NoticeBanner notices={activeSettings.notices} />

      <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-y-auto flex flex-col max-w-[1920px] mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 flex-shrink-0 mb-4 md:mb-6">
          {renderRoomColumn(RoomId.ROOM_1)}
          {renderRoomColumn(RoomId.ROOM_2)}
        </div>
        {isAdmin && (
          <div className="w-full flex-shrink-0">
            <div className="bg-white/50 rounded-[16px] sm:rounded-[24px] border border-white shadow-sm backdrop-blur-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-600" />
                  완료된 환자 ({completedPatients.length}명)
                </h3>
                {completedPatients.length > 0 && (
                  <button
                    onClick={() => {
                      showConfirmModal(
                        '완료된 환자 전체 삭제',
                        '완료된 모든 환자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
                        async () => {
                          const deletePromises = completedPatients.map(patient =>
                            deletePatientFromFirebase(patient.id)
                          );
                          try {
                            await Promise.all(deletePromises);
                            setDraftPatients(prev => prev.filter(p => !isCompletedPatient(p)));
                            setToastMessage('완료된 환자가 삭제되었습니다');
                            setShowToast(true);
                          } catch (error) {
                            console.error('Error deleting completed patients:', error);
                            setToastMessage('삭제 중 오류가 발생했습니다');
                            setShowToast(true);
                          }
                        },
                        'danger'
                      );
                    }}
                    className="text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-[8px] hover:bg-red-50 transition-colors"
                  >
                    전체 삭제
                  </button>
                )}
              </div>
              {completedPatients.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 max-h-96 overflow-y-auto">
                  {completedPatients.map((patient) => {
                    const registeredDate = new Date(patient.registeredAt);
                    // completedAt이 없으면 접수 시간으로 대체 (기존 완료 환자 처리)
                    const completedAtValue = patient.completedAt || patient.registeredAt;
                    const completedDate = new Date(completedAtValue);
                    const duration = Math.round((completedDate.getTime() - registeredDate.getTime()) / 1000 / 60); // 분 단위

                    return (
                      <div
                        key={patient.id}
                        className="bg-white border border-gray-200 rounded-[12px] p-3 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-slate-800 truncate">{patient.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {activeSettings.roomNames[patient.roomId]}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeletePatient(patient.id)}
                            className="ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                            title="삭제"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Calendar size={12} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate">
                              접수: {registeredDate.toLocaleString('ko-KR', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <CheckCircle2 size={12} className={`flex-shrink-0 ${patient.completedAt ? 'text-green-500' : 'text-amber-500'}`} />
                            <span className="truncate">
                              완료: {completedDate.toLocaleString('ko-KR', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                              {!patient.completedAt && <span className="text-amber-500 ml-1">(추정)</span>}
                            </span>
                          </div>
                          {duration > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                              <Clock size={12} className="text-blue-500 flex-shrink-0" />
                              <span>소요시간: {duration}분</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle2 size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">완료된 환자가 없습니다</p>
                  <p className="text-xs mt-1">환자 상태를 "완료"로 변경하면 여기에 표시됩니다</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <AddPatientModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onAdd={handleAddPatient}
        roomId={modalRoom}
        roomName={activeSettings.roomNames[modalRoom]}
      />

      <SettingsModal 
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={draftSettings}
        onUpdate={updateSettings}
        onShowConfirm={showConfirmModal}
        onOpenFirebaseConfig={() => {
          setSettingsModalOpen(false);
          setFirebaseConfigModalOpen(true);
        }}
      />

      <FirebaseConfigModal
        isOpen={firebaseConfigModalOpen}
        onClose={() => setFirebaseConfigModalOpen(false)}
        onShowConfirm={showConfirmModal}
      />

      <EditRoomNameModal
        isOpen={editRoomNameModalOpen}
        onClose={() => setEditRoomNameModalOpen(false)}
        onSave={handleSaveRoomName}
        currentName={draftSettings.roomNames[editingRoomId]}
        roomId={editingRoomId}
      />

      <EditDoctorNameModal
        isOpen={editDoctorNameModalOpen}
        onClose={() => setEditDoctorNameModalOpen(false)}
        onSave={handleSaveDoctorName}
        currentName={draftSettings.doctorNames[editingRoomId]}
        roomId={editingRoomId}
      />

      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        title={confirmModalTitle}
        message={confirmModalMessage}
        onConfirm={() => {
          if (confirmModalOnConfirm) {
            confirmModalOnConfirm();
          }
          setConfirmModalOpen(false);
          setConfirmModalOnConfirm(null);
        }}
        onCancel={() => {
          setConfirmModalOpen(false);
          setConfirmModalOnConfirm(null);
        }}
        variant={confirmModalVariant}
      />
    </div>
  );
};

export default App;