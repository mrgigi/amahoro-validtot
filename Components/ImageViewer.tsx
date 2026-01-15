import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type ImageViewerProps = {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
};

function ImageViewer({ images, isOpen, onClose, initialIndex = 0 }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!isOpen) return null;

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 bg-[#FF006E] text-white p-3 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain border-8 border-black"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 bg-[#FFFF00] text-black p-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] transition-transform"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 bg-[#FFFF00] text-black p-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[-4px] transition-transform"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
          {images.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 border-2 border-black ${
                index === currentIndex ? 'bg-[#FF006E]' : 'bg-white'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ImageViewer;
