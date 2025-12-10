import React from 'react';
import { Activity } from 'lucide-react';

interface NoticeBannerProps {
  notices: string[];
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({ notices }) => {
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

