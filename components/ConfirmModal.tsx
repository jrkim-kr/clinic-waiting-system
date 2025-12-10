import React from 'react';
import { CheckCircle2 } from 'lucide-react';

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

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
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

