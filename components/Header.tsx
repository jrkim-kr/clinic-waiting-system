import React, { useState, useEffect } from 'react';
import { CLINIC_NAME } from '../constants';
import { Save, Settings, Maximize } from 'lucide-react';

interface HeaderProps {
  isAdmin?: boolean;
  onToggleView?: () => void;
  onFullScreen?: () => void;
  onSave?: () => void;
  onOpenSettings?: () => void;
  hasChanges?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  isAdmin, 
  onToggleView, 
  onFullScreen, 
  onSave, 
  onOpenSettings,
  hasChanges 
}) => {
  const [time, setTime] = useState(new Date());
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 border-b border-gray-100 transition-all">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight truncate">
          {CLINIC_NAME}
        </h1>
        {isAdmin && (
          <span className="px-2 py-1 rounded-[6px] text-xs font-semibold bg-blue-100 text-blue-600 flex-shrink-0">
            관리자
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto justify-end">
        <div className="text-right hidden sm:block mr-2 md:mr-4">
          <div className="text-sm sm:text-base md:text-lg font-bold text-slate-800 tabular-nums">
            {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xs text-slate-500 font-medium hidden md:block">
            {time.toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {isAdmin && (
          <>
             <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold bg-gray-100 text-gray-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-[10px] sm:rounded-[12px] hover:bg-gray-200 transition-colors"
            >
              <Settings size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">설정</span>
            </button>

            <button
              onClick={onSave}
              className={`
                flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-[10px] sm:rounded-[12px] transition-all shadow-sm
                ${hasChanges 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 animate-pulse' 
                  : 'bg-white text-slate-500 border border-gray-200 hover:bg-gray-50'
                }
              `}
            >
              <Save size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">저장</span>
            </button>
          </>
        )}

        {!isFullScreen && (
          <>
            <div className="h-6 sm:h-8 w-[1px] bg-gray-200 mx-1 hidden sm:block"></div>

            <div className="flex gap-1.5 sm:gap-2 items-center">
              {onToggleView && (
                <button 
                  onClick={onToggleView}
                  className="text-xs sm:text-sm font-semibold bg-gray-50 text-gray-500 px-3 sm:px-4 py-1.5 sm:py-2 rounded-[8px] sm:rounded-[10px] hover:bg-gray-100 hover:text-gray-900 transition-colors whitespace-nowrap"
                >
                  <span className="hidden sm:inline">{isAdmin ? '대기 화면 보기' : '관리자 모드'}</span>
                  <span className="sm:hidden">{isAdmin ? '대기' : '관리'}</span>
                </button>
              )}
              
              {onFullScreen && !isAdmin && (
                <button 
                onClick={onFullScreen}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gray-50 text-slate-600 rounded-[8px] sm:rounded-[10px] hover:bg-gray-100 transition-colors"
                title="전체화면"
              >
                <Maximize size={18} className="sm:w-5 sm:h-5" />
              </button>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
};