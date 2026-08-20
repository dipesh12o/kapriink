import { motion } from "framer-motion";
import { STYLES } from "../data/artistData";

export default function Styles() {
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
          {STYLES.map((style, index) => (
            <motion.div
              key={style.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative flex flex-col justify-end bg-dark-gray border border-white/5 rounded-lg overflow-hidden aspect-[3/4] hover:border-primary/50 hover:neon-pink-border-glow transition-all duration-500"
            >
              {/* Style Image */}
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                <img
                  src={style.sampleImage}
                  alt={`${style.name} tattoo sample by KapriInk`}
                  className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  loading="lazy"
                />
                {/* Gradient shader overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                <div className="absolute inset-0 bg-primary/10 mix-blend-color group-hover:bg-transparent transition-colors duration-500" />
              </div>

              {/* Card Label Content */}
              <div className="relative p-6 space-y-3 z-10">
                <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-widest bg-white/10 text-white rounded uppercase">
                  Style 0{index + 1}
                </span>
                <h3 className="text-2xl font-display font-extrabold tracking-wider text-white group-hover:text-primary transition-colors">
                  {style.name}
                </h3>
                <p className="text-light-gray/70 text-xs sm:text-sm leading-relaxed group-hover:text-white transition-colors duration-300">
                  {style.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
