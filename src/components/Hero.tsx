import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ARTIST_INFO, CONTACT_INFO, PORTFOLIO } from "../data/artistData";

export default function Hero() {
  // Let's use the skull arrow tattoo as the hero visual
  const heroImage = PORTFOLIO.find((item) => item.id === "skull-arrow")?.src || "";

  return (
    <section
      id="home"
      className="relative min-h-screen bg-dark flex flex-col justify-center items-center overflow-hidden pt-24 px-4 sm:px-6 lg:px-8"
    >
      {/* Background Neon Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-secondary/10 blur-[150px] pointer-events-none" />

      {/* Grid Lines Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 py-12">
        {/* Left Column: Heading Content */}
        <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold uppercase tracking-widest text-primary"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            Tattoo Studio & Editorial Art
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative"
          >
            <h1 className="font-display font-extrabold text-5xl sm:text-7xl md:text-8xl lg:text-7xl xl:text-8xl text-white tracking-tighter leading-none select-none uppercase">
              {ARTIST_INFO.brandName}
            </h1>
            <div className="absolute -bottom-2 left-0 w-3/4 h-1.5 bg-gradient-to-r from-primary via-secondary to-transparent rounded-full" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-secondary uppercase">
              Tattoo Artist <span className="text-white">•</span> {CONTACT_INFO.cityStateZip.split(",")[0]}, Utah
            </h2>
            <p className="text-light-gray/70 text-base sm:text-lg max-w-xl leading-relaxed">
              Custom design, underground art culture, and bold aesthetics. Specializing in high-impact styles designed for permanence.
            </p>
          </motion.div>

          {/* Style Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-wrap gap-2 pt-2"
          >
            {["Abstract", "Dark Shading", "Fine Line", "Color"].map((style, i) => (
              <span
                key={style}
                className={`px-3 py-1 text-xs uppercase tracking-widest font-bold border rounded-md ${
                  i % 2 === 0
                    ? "border-primary/30 text-primary bg-primary/5 hover:border-primary transition-colors"
                    : "border-secondary/30 text-secondary bg-secondary/5 hover:border-secondary transition-colors"
                }`}
              >
                {style}
              </span>
            ))}
          </motion.div>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-wrap gap-4 pt-4 w-full sm:w-auto"
          >
            <a
              href="#booking"
              className="px-8 py-4 rounded-md bg-primary text-white font-bold tracking-widest text-sm uppercase flex items-center justify-center gap-3 hover:bg-opacity-90 hover:neon-pink-border-glow transition-all duration-300 w-full sm:w-auto"
            >
              Book a Tattoo
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#work"
              className="px-8 py-4 rounded-md bg-transparent border border-white/20 text-white font-bold tracking-widest text-sm uppercase flex items-center justify-center gap-3 hover:border-secondary hover:text-secondary hover:neon-blue-glow transition-all duration-300 w-full sm:w-auto"
            >
              View My Work
            </a>
          </motion.div>
        </div>

        {/* Right Column: Visual Tattoo Showcase */}
        <div className="lg:col-span-5 relative flex justify-center items-center">
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative w-full max-w-[400px] aspect-[3/4] group"
          >
            {/* Out-of-bounds container frame */}
            <div className="absolute inset-0 border-2 border-secondary/40 rounded-lg translate-x-4 translate-y-4 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-300" />
            <div className="absolute inset-0 border border-primary rounded-lg -translate-x-2 -translate-y-2 group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
            
            {/* Image Wrapper */}
            <div className="relative w-full h-full overflow-hidden rounded-lg border-2 border-white shadow-2xl">
              <img
                src={heroImage}
                alt="Featured Tattoo artwork - Skull with arrow through it by KaprInk"
                className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700"
              />
              {/* Overlay shadow */}
              <div className="absolute inset-0 bg-gradient-to-t from-dark/75 via-transparent to-transparent opacity-60" />
            </div>

            {/* Float badge */}
            <div className="absolute bottom-6 right-6 bg-dark/95 border border-primary/40 px-4 py-2 rounded-md backdrop-blur-sm shadow-xl">
              <span className="text-[10px] text-white/50 block tracking-wider uppercase font-semibold">
                Featured Work
              </span>
              <span className="text-xs text-primary font-bold tracking-widest uppercase">
                Skull & Arrow
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
