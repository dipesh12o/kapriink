import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { PortfolioItem } from "../data/artistData";

interface LightboxProps {
  images: PortfolioItem[];
  currentIndex: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}

export default function Lightbox({
  images,
  currentIndex,
  onClose,
  onChangeIndex,
}: LightboxProps) {
  const currentImage = images[currentIndex];

  useEffect(() => {
    // Disable background scroll when modal open
    document.body.style.overflow = "hidden";

    // Keyboard Event Handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "ArrowLeft") {
        const prevIndex = (currentIndex - 1 + images.length) % images.length;
        onChangeIndex(prevIndex);
      }
      if (e.key === "ArrowRight") {
        const nextIndex = (currentIndex + 1) % images.length;
        onChangeIndex(nextIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIndex, images.length, onChangeIndex, onClose]);

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    onChangeIndex(prevIndex);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % images.length;
    onChangeIndex(nextIndex);
  };

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in p-4 sm:p-6 md:p-10">
      {/* Background Close Action */}
      <div className="absolute inset-0 cursor-zoom-out" onClick={onClose} />

      {/* Main Image Container */}
      <div className="relative z-10 w-full max-w-4xl max-h-[85vh] flex flex-col items-center select-none">
        
        {/* Large Image */}
        <div className="relative overflow-hidden rounded-lg border border-white/10 max-h-[75vh] flex items-center justify-center">
          <img
            src={currentImage.src}
            alt={currentImage.alt}
            className="object-contain max-h-[75vh] max-w-full"
          />
        </div>

        {/* Caption Info */}
        <div className="mt-4 text-center max-w-2xl px-4 space-y-2">
          <p className="text-white text-sm sm:text-base font-sans leading-relaxed">
            {currentImage.alt}
          </p>
          <div className="flex justify-center gap-1.5">
            {currentImage.categories.map((c) => (
              <span
                key={c}
                className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 rounded"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Buttons (Desktop UI) */}
      <button
        onClick={handlePrev}
        className="absolute left-4 z-20 p-3 rounded-full bg-white/5 border border-white/15 text-white hover:bg-primary hover:border-primary hover:text-white transition-all duration-300 focus:outline-none"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-4 z-20 p-3 rounded-full bg-white/5 border border-white/15 text-white hover:bg-primary hover:border-primary hover:text-white transition-all duration-300 focus:outline-none"
        aria-label="Next image"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-3 rounded-full bg-white/5 border border-white/15 text-white hover:bg-primary hover:border-primary hover:text-white transition-all duration-300 focus:outline-none"
        aria-label="Close Lightbox"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Counter indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs tracking-widest uppercase font-bold text-white/50 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
