import { ArrowUp } from "lucide-react";
import { ARTIST_INFO, CONTACT_INFO, LOGOS } from "../data/artistData";

export default function Footer() {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-dark border-t border-white/5 py-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Upper Brand Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-white/5 pb-10">
          
          {/* Circular logo brand name */}
          <div className="md:col-span-4 flex items-center justify-center md:justify-start gap-4">
            <img
              src={LOGOS.circular}
              alt="KapriInk Tattoo Logo"
              className="h-14 w-14 rounded-full border border-primary/20"
            />
            <div className="text-left">
              <h3 className="font-display font-extrabold text-xl tracking-wider text-white uppercase leading-none">
                {ARTIST_INFO.brandName}
              </h3>
              <span className="text-[10px] text-white/50 tracking-widest uppercase font-semibold">
                Tattoo Studio
              </span>
            </div>
          </div>

          {/* Quick links & Contact details */}
          <div className="md:col-span-5 flex flex-wrap justify-center gap-6 text-sm">
            <a href="#styles" className="text-light-gray/70 hover:text-primary transition-colors uppercase tracking-wider font-semibold text-xs">
              Styles
            </a>
            <a href="#work" className="text-light-gray/70 hover:text-primary transition-colors uppercase tracking-wider font-semibold text-xs">
              Portfolio
            </a>
            <a href="#about" className="text-light-gray/70 hover:text-primary transition-colors uppercase tracking-wider font-semibold text-xs">
              About
            </a>
            <a href="#booking" className="text-light-gray/70 hover:text-primary transition-colors uppercase tracking-wider font-semibold text-xs">
              Booking
            </a>
            <a href="#contact" className="text-light-gray/70 hover:text-primary transition-colors uppercase tracking-wider font-semibold text-xs">
              Contact
            </a>
          </div>

          {/* Instagram / TikTok links & Booking CTA */}
          <div className="md:col-span-3 flex justify-center md:justify-end items-center gap-4">
            <a
              href={CONTACT_INFO.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-white/5 text-light-gray hover:bg-primary hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
            
            {/* Custom TikTok SVG icon */}
            <a
              href={CONTACT_INFO.socials.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-white/5 text-light-gray hover:bg-primary hover:text-white transition-colors"
              aria-label="TikTok"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </a>

            <button
              onClick={handleScrollToTop}
              className="p-2.5 rounded-full bg-white/5 text-light-gray hover:bg-secondary hover:text-white transition-colors"
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>

        </div>

        {/* Lower footer copyright details */}
        <div className="flex flex-col sm:flex-row justify-between items-center pt-8 gap-4 text-xs text-light-gray/50 uppercase tracking-widest font-semibold font-sans">
          <div>
            &copy; {new Date().getFullYear()} {ARTIST_INFO.studioBranding}. All Rights Reserved.
          </div>
          <div>
            {CONTACT_INFO.cityStateZip}
          </div>
        </div>

      </div>
    </footer>
  );
}
