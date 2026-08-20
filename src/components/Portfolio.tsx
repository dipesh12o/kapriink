import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { PORTFOLIO } from "../data/artistData";
import type { PortfolioItem } from "../data/artistData";
import Lightbox from "./Lightbox";
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export default function Portfolio() {
  const [filter, setFilter] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [galleryItems, setGalleryItems] = useState<PortfolioItem[]>(PORTFOLIO);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const categories = ["All", "Abstract", "Dark Shading", "Fine Line", "Color"];

  // Fetch Tattoos from Express GridFS backend
  useEffect(() => {
    async function loadTattoos() {
      try {
        const response = await fetch(`${API_URL}/api/tattoos`);
        if (!response.ok) throw new Error("Failed to fetch gallery items.");
        
        const data = await response.json();

        if (data && data.length > 0) {
          const mappedData: PortfolioItem[] = data.map((item: any) => ({
            id: item._id,
            src: `${API_URL}/api/tattoos/image/${item.imageFileId}`,
            alt: item.title,
            categories: item.category,
          }));
          setGalleryItems(mappedData);
        } else if (import.meta.env.PROD) {
          // If empty in production, show empty list (no static fallback)
          setGalleryItems([]);
        }
      } catch (err) {
        console.error("Gallery fetch failed:", err);
        setFetchError("Failed to load tattoo gallery. Please check your connection.");
        if (!import.meta.env.PROD) {
          // Fallback state remains as initialized (PORTFOLIO)
        } else {
          setGalleryItems([]);
        }
      }
    }
    loadTattoos();
  }, []);

  const filteredPortfolio = filter === "All"
    ? galleryItems
    : galleryItems.filter((item) => item.categories.includes(filter));

  // Custom height/layout assignments for editorial spacing (masonry feel)
  const getGridClasses = (id: string) => {
    switch (id) {
      case "botanical-sternum":
        return "col-span-1 md:col-span-2 aspect-[3/4] md:aspect-auto h-auto md:h-[350px] lg:h-[450px]";
      default:
        return "col-span-1 aspect-[3/4] md:aspect-auto h-auto md:h-[350px] lg:h-[450px]";
    }
  };

  const handleImageClick = (item: PortfolioItem) => {
    const idx = galleryItems.findIndex((p) => p.id === item.id);
    if (idx !== -1) {
      setLightboxIndex(idx);
    }
  };

  return (
    <section id="work" className="py-24 bg-dark relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-16 gap-8">
          <div className="text-center md:text-left space-y-4">
            <span className="text-xs uppercase tracking-widest text-secondary font-bold">
              PORTFOLIO
            </span>
            <h2 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-white uppercase">
              Tattoo Gallery
            </h2>
            <div className="w-20 h-1 bg-secondary mt-2 mx-auto md:mx-0" />
          </div>

          {/* Filter Categories */}
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 text-xs uppercase tracking-widest font-bold border rounded-md transition-all duration-300 ${
                  filter === cat
                    ? "bg-primary border-primary text-white neon-pink-border-glow"
                    : "bg-transparent border-white/10 text-light-gray hover:border-white/40 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {fetchError && import.meta.env.PROD && (
          <div className="text-center py-12 text-red-500/70 text-xs sm:text-sm font-semibold uppercase tracking-widest border border-dashed border-red-500/20 rounded-lg bg-red-950/5 mb-8">
            {fetchError}
          </div>
        )}

        {/* Gallery Grid */}
        <motion.div
          layout
          className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 auto-rows-auto"
        >
          <AnimatePresence mode="popLayout">
            {filteredPortfolio.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                onClick={() => handleImageClick(item)}
                className={`group relative overflow-hidden rounded-lg border border-white/5 cursor-pointer bg-dark-gray ${getGridClasses(
                  item.id
                )}`}
              >
                {/* Image */}
                <img
                  src={item.src}
                  alt={item.alt}
                  className="w-full h-full object-cover transform scale-100 group-hover:scale-[1.03] transition-transform duration-500"
                  loading="lazy"
                />

                {/* Grid Overlay / Hover details */}
                <div className="absolute inset-0 bg-dark/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 border-2 border-primary/40 rounded-lg">
                  <div className="absolute top-4 right-4 text-white/50 group-hover:text-primary transition-colors">
                    <Maximize2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {item.categories.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 rounded"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                    <p className="text-white text-xs sm:text-sm font-sans line-clamp-2 leading-relaxed">
                      {item.alt}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <Lightbox
          images={galleryItems}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChangeIndex={(idx) => setLightboxIndex(idx)}
        />
      )}
    </section>
  );
}
