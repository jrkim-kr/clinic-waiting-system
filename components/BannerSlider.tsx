import React, { useState, useEffect } from 'react';

interface BannerSliderProps {
  images: string[];
  autoSlideInterval?: number; // 자동 슬라이드 간격 (ms), 0이면 자동 슬라이드 비활성화
}

export const BannerSlider: React.FC<BannerSliderProps> = ({ 
  images, 
  autoSlideInterval = 5000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // 자동 슬라이드
  useEffect(() => {
    if (images.length <= 1 || !autoSlideInterval || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, autoSlideInterval);

    return () => clearInterval(interval);
  }, [images.length, autoSlideInterval, isPaused]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div 
      className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 이미지 슬라이드 */}
      <div className="relative w-full h-full flex items-start justify-center">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-500 flex items-start justify-center ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt={`배너 ${index + 1}`}
              className="max-w-full max-h-full w-auto h-auto object-contain"
            />
          </div>
        ))}
      </div>


      {/* 인디케이터 */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`배너 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

