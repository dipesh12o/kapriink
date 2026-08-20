import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { STYLES } from "../data/artistData";

export default function Styles() {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.7, // Trigger when 70% of the card is visible
    };

    const cardElements = document.querySelectorAll(".style-card-mobile");

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Only run on mobile/tablet viewports (< 768px)
      if (window.innerWidth >= 768) {
        setActiveCardId(null);
        return;
      }

      const visibleEntries = entries.filter(
        (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.7
      );

      if (visibleEntries.length > 0) {
        visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const highestVisible = visibleEntries[0].target.getAttribute("data-card-id");
        if (highestVisible) {
          setActiveCardId(highestVisible);
        }
      } else {
        // If the current active card went below 70% visibility, reset it
        entries.forEach((entry) => {
          const cardId = entry.target.getAttribute("data-card-id");
          if (cardId === activeCardId && entry.intersectionRatio < 0.7) {
            setActiveCardId(null);
          }
        });
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    cardElements.forEach((el) => observer.observe(el));

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setActiveCardId(null);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cardElements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [activeCardId]);

  return (
    <section id="styles" className="py-24 bg-dark relative overflow-hidden">
      {/* Background neon glows */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center md:text-left mb-16 space-y-4">
          <span className="text-xs uppercase tracking-widest text-primary font-bold">
            ARTISTIC SPECIALTIES
          </span>
          <h2 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-white uppercase">
            Signature Styles
          </h2>
          <div className="w-20 h-1 bg-primary mt-2 mx-auto md:mx-0" />
        </div>

        {/* Custom Styles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STYLES.map((style, index) => {
            const isActive = activeCardId === style.id;
            return (
              <motion.div
                key={style.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                data-card-id={style.id}
                className={`style-card-mobile group relative flex flex-col justify-end bg-dark-gray rounded-lg overflow-hidden aspect-[3/4] transition-all duration-500 border ${
                  isActive ? "border-primary/50 neon-pink-border-glow" : "border-white/5"
                } md:hover:border-primary/50 md:hover:neon-pink-border-glow`}
              >
                {/* Style Image */}
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                  <img
                    src={style.sampleImage}
                    alt={`${style.name} tattoo sample by KaprInk`}
                    className={`w-full h-full object-cover transition-all duration-700 ${
                      isActive ? "grayscale-0 scale-105" : "grayscale"
                    } md:grayscale md:group-hover:grayscale-0 md:group-hover:scale-105`}
                    loading="lazy"
                  />
                  {/* Gradient shader overlays */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-t from-dark via-dark/40 to-transparent transition-opacity duration-500 ${
                      isActive ? "opacity-80" : "opacity-0"
                    } md:opacity-80 md:group-hover:opacity-60`}
                  />
                  <div
                    className={`absolute inset-0 transition-colors duration-500 ${
                      isActive ? "bg-transparent" : "bg-primary/10 mix-blend-color"
                    } md:bg-primary/10 md:mix-blend-color md:group-hover:bg-transparent`}
                  />
                </div>

                {/* Card Label Content */}
                <div
                  className={`relative p-6 space-y-3 z-10 transition-all duration-500 transform ${
                    isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  } md:opacity-100 md:translate-y-0`}
                >
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-widest bg-white/10 text-white rounded uppercase">
                    Style 0{index + 1}
                  </span>
                  <h3
                    className={`text-2xl font-display font-extrabold tracking-wider transition-colors ${
                      isActive ? "text-primary" : "text-white"
                    } md:text-white md:group-hover:text-primary`}
                  >
                    {style.name}
                  </h3>
                  <p
                    className={`text-xs sm:text-sm leading-relaxed transition-colors duration-300 ${
                      isActive ? "text-white" : "text-light-gray/70"
                    } md:text-light-gray/70 md:group-hover:text-white`}
                  >
                    {style.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
