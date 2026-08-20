import { motion } from "framer-motion";
import { Heart, Compass } from "lucide-react";
import { ARTIST_INFO, CONTACT_INFO, LOGOS } from "../data/artistData";

export default function About() {
  return (
    <section id="about" className="py-24 bg-dark relative overflow-hidden">
      {/* Glow overlays */}
      <div className="absolute top-1/3 right-0 w-[350px] h-[350px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] rounded-full bg-secondary/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Branding / Studio Logo */}
          <div className="lg:col-span-5 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="relative w-full max-w-[380px] aspect-square rounded-full border border-primary/30 p-2 bg-gradient-to-tr from-primary/10 via-dark-gray to-secondary/10 flex items-center justify-center overflow-hidden hover:neon-pink-border-glow hover:border-primary transition-all duration-500 shadow-2xl"
            >
              <img
                src={LOGOS.studio}
                alt="KaprInk Tattoo Studio Logo featuring classic car and tattoo machine"
                className="w-[94%] h-[94%] object-cover rounded-full border border-white/10"
              />
            </motion.div>
          </div>

          {/* Right Column: Bio / Personality */}
          <div className="lg:col-span-7 flex flex-col space-y-6 text-left">
            <div className="space-y-4">
              <span className="text-xs uppercase tracking-widest text-primary font-bold">
                THE ARTIST
              </span>
              <h2 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-white uppercase">
                Meet Jordynn Smith
              </h2>
              <div className="w-20 h-1 bg-primary mt-2" />
            </div>

            {/* Main Personality Biography */}
            <div className="text-light-gray/80 space-y-4 text-base sm:text-lg leading-relaxed font-sans">
              <p>
                Hey, I’m Jordynn! Under the brand name <strong className="text-white font-bold">{ARTIST_INFO.brandName}</strong>, 
                I create custom tattoo art out of South Jordan, Utah.
              </p>
              <p>
                My lifestyle is driven by my passions. I love cars, I love to paint, and I’m a big lover and family girl. 
                When I'm not in the studio tattooing or painting canvases, you can find me enjoying the outdoors.
              </p>
            </div>

            {/* Stormi detail (No dummy dog stock photo used, typography layout only) */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-lg bg-dark-gray border-l-4 border-primary/60 bg-gradient-to-r from-primary/5 to-transparent space-y-3"
            >
              <div className="flex items-center gap-2 text-primary">
                <Heart className="h-4 w-4 fill-primary" />
                <span className="text-xs uppercase tracking-widest font-bold">Stormi's Corner</span>
              </div>
              <p className="text-white italic text-base leading-relaxed">
                "I love the outdoors, so does my dog stormi. Stormis my world!"
              </p>
              <p className="text-xs text-white/50 font-semibold tracking-wide">
                - Jordynn Smith
              </p>
            </motion.div>

            {/* Mini Features List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-secondary/10 text-secondary border border-secondary/20">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs text-white/50 uppercase font-semibold">Location</span>
                  <span className="text-sm text-white font-semibold">{CONTACT_INFO.cityStateZip.split(",")[0]}, UT</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-primary/10 text-primary border border-primary/20">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs text-white/50 uppercase font-semibold">Passions</span>
                  <span className="text-sm text-white font-semibold">Cars, Painting, Outdoors & Family</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
