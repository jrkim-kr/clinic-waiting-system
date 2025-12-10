import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose }) => {
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

