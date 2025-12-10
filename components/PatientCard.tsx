import React, { useState, useEffect, useRef } from 'react';
import { Patient, PatientStatus, CustomStatus } from '../types';
import { X, GripVertical, Stethoscope } from 'lucide-react';

interface PatientCardProps {
  patient: Patient;
  rank: number;
  isAdmin: boolean;
  customStatuses: CustomStatus[];
  onStatusChange: (id: string, status: PatientStatus) => void;
  onDelete: (id: string) => void;
  draggedId: string | null;
  dragOverId?: string | null;
  dragOverPosition?: 'above' | 'below' | null;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent, targetId: string) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent, targetId: string) => void;
  onDragEnd?: () => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ 
  patient, 
  rank, 
  isAdmin,
  customStatuses,
  onStatusChange, 
  onDelete,
  draggedId,
  dragOverId,
  dragOverPosition,
  onDragStart,
  onDragOver,
  onDragLeave,
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
            const textElement = nameTextRef.current;
            
            // 텍스트 너비 측정을 위해 임시로 표시
            const originalLeft = textElement.style.left;
            const originalVisibility = textElement.style.visibility;
            const originalPosition = textElement.style.position;
            
            textElement.style.position = 'absolute';
            textElement.style.left = '0';
            textElement.style.visibility = 'visible';
            textElement.style.width = 'auto';
            
            // 강제로 리플로우 발생
            void textElement.offsetWidth;
            
            const textWidth = textElement.offsetWidth || textElement.scrollWidth;
            
            // 스타일 복원
            textElement.style.left = originalLeft;
            textElement.style.visibility = originalVisibility;
            textElement.style.position = originalPosition;
            
            // 컨테이너가 실제로 렌더링되었고 너비가 있는지 확인
            if (containerWidth > 0 && textWidth > 0) {
              // 약간의 여유를 두고 비교 (10px)
              setNeedsScroll(textWidth > containerWidth + 10);
            } else {
              // 측정 실패 시 기본값으로 설정 (안전하게 false)
              setNeedsScroll(false);
            }
          }
        });
      }
    };

    // Initial check with multiple delays to ensure DOM is ready
    const timeoutId1 = setTimeout(checkScrollNeeded, 100);
    const timeoutId2 = setTimeout(checkScrollNeeded, 300);
    const timeoutId3 = setTimeout(checkScrollNeeded, 600);
    
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
  const isDragOver = dragOverId === patient.id;
  const showInsertAbove = isDragOver && dragOverPosition === 'above';
  const showInsertBelow = isDragOver && dragOverPosition === 'below';

  return (
    <>
      {/* 삽입 위치 표시 (위) */}
      {showInsertAbove && (
        <div className="relative w-full mb-1 flex items-center justify-center">
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-slate-400"></div>
        </div>
      )}
      
      <div 
        draggable={false}
        onDragStart={(e) => {
          // 카드 자체는 드래그 불가, 핸들만 드래그 가능
          e.preventDefault();
        }}
        onDragOver={(e) => {
          if (isAdmin && onDragOver) {
            e.preventDefault();
            e.stopPropagation();
            onDragOver(e, patient.id);
          }
        }}
        onDragLeave={() => {
          if (isAdmin && onDragLeave) {
            onDragLeave();
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
          relative flex flex-row items-center p-3 sm:p-4 md:p-5 rounded-[16px] sm:rounded-[20px] mb-3 transition-all duration-200 w-full box-border gap-3
          ${cardBg}
          ${isDragging ? 'opacity-30 scale-95 shadow-2xl rotate-2 z-50' : ''}
          ${isDragOver ? 'border-2 border-dashed border-slate-400 bg-slate-50/80 shadow-lg' : ''}
          ${isAdmin && !isDragging ? 'hover:shadow-lg hover:scale-[1.01]' : ''}
        `}
      >
      {/* 순번 */}
      <div className={`
        flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full font-bold text-sm sm:text-base md:text-lg flex-shrink-0
        ${rankBgColor}
      `}>
        {rank}
      </div>

      {/* 환자명 - 중간에 배치, 최소 너비 보장 */}
      <div ref={nameContainerRef} className="flex-1 overflow-hidden relative flex items-center" style={{ minHeight: '2rem', minWidth: '5ch' }}>
        {/* Hidden text for measuring width */}
        <span 
          ref={nameTextRef} 
          className="font-bold text-base sm:text-lg md:text-xl tracking-tight text-slate-800 whitespace-nowrap"
          aria-hidden="true"
          style={{ 
            position: 'absolute', 
            left: '-9999px', 
            visibility: 'hidden',
            width: 'auto',
            height: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          {patient.name}
        </span>
        {/* Visible text - 환자명 표시 */}
        {needsScroll ? (
          <div className="animate-marquee-right whitespace-nowrap flex items-center h-full w-full">
            <span className="font-bold text-base sm:text-lg md:text-xl tracking-tight text-slate-800 mr-8 inline-block">{patient.name}</span>
            <span className="font-bold text-base sm:text-lg md:text-xl tracking-tight text-slate-800 mr-8 inline-block">{patient.name}</span>
            <span className="font-bold text-base sm:text-lg md:text-xl tracking-tight text-slate-800 mr-8 inline-block">{patient.name}</span>
            <span className="font-bold text-base sm:text-lg md:text-xl tracking-tight text-slate-800 mr-8 inline-block">{patient.name}</span>
          </div>
        ) : (
          <span className="font-bold text-base sm:text-lg md:text-xl tracking-tight text-slate-800 whitespace-nowrap block truncate w-full">
            {patient.name}
          </span>
        )}
      </div>

      {/* 상태 선택 드롭다운 (상태 배지 스타일로 통합) */}
      {isAdmin ? (
        <select
          value={patient.status}
          onChange={(e) => onStatusChange(patient.id, e.target.value as PatientStatus)}
          className={`${statusConfig?.textColor || 'text-slate-500'} font-bold text-xs sm:text-sm ${statusConfig?.bgColor || 'bg-gray-100'} px-2 sm:px-3 py-1 rounded-full min-w-[60px] sm:min-w-[70px] flex justify-center flex-shrink-0 cursor-pointer hover:opacity-80 focus:ring-2 focus:ring-[#3182F6] outline-none appearance-none border-0`}
          style={{ 
            backgroundImage: statusConfig ? 'none' : `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: statusConfig ? 'unset' : `right 0.3rem center`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1em 1em',
            paddingRight: statusConfig ? '0.75rem' : '1.75rem'
          }}
        >
          {customStatuses.map(status => {
            const statusOption = customStatuses.find(s => s.id === status.id);
            return (
              <option key={status.id} value={status.id} style={{
                backgroundColor: statusOption?.bgColor || 'white',
                color: statusOption?.textColor || 'black'
              }}>
                {status.label}
              </option>
            );
          })}
        </select>
      ) : (
        <div className="flex items-center flex-shrink-0">
          {statusBadge}
        </div>
      )}

      {/* 삭제 버튼 (관리자만) */}
      {isAdmin && (
        <button 
          onClick={() => onDelete(patient.id)}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
          title="삭제"
        >
          <X size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
      )}

      {/* 순서 변경 버튼 (드래그 핸들, 관리자만) */}
      {isAdmin && (
        <div 
          draggable={isAdmin}
          onDragStart={(e) => {
            if (isAdmin && onDragStart) {
              e.stopPropagation();
              onDragStart(e, patient.id);
              e.dataTransfer.effectAllowed = 'move';
            }
          }}
          onDrag={(e) => {
            e.stopPropagation();
          }}
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 sm:p-2 rounded-lg transition-all touch-none flex-shrink-0"
          title="드래그하여 순서 변경"
        >
          <GripVertical size={18} className="sm:w-5 sm:h-5" />
        </div>
      )}
      </div>
      
      {/* 삽입 위치 표시 (아래) */}
      {showInsertBelow && (
        <div className="relative w-full mt-1 flex items-center justify-center">
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-slate-400"></div>
        </div>
      )}
    </>
  );
};

