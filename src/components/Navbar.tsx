import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { CONTACT_INFO, LOGOS } from "../data/artistData";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "#home" },
    { name: "Styles", href: "#styles" },
    { name: "Work", href: "#work" },
    { name: "About", href: "#about" },
    { name: "Booking", href: "#booking" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-dark/90 backdrop-blur-md py-3 border-b border-primary/20"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <a href="#home" className="flex items-center gap-3 group">
            <img
              src={LOGOS.circular}
              alt="KapriInk Circular Logo"
              className="h-12 w-12 rounded-full border border-primary/30 group-hover:border-primary transition-colors"
            />
            <span className="font-display font-bold text-lg tracking-wider text-white group-hover:text-primary transition-colors">
              KAPRIINK<span className="text-secondary">.</span>
            </span>
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="font-sans text-sm tracking-wider text-light-gray/80 hover:text-primary hover:neon-pink-glow transition-all duration-200 uppercase font-semibold"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Social & Booking Button (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href={CONTACT_INFO.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-light-gray hover:text-primary transition-colors"
              aria-label="Instagram Profile"
            >
              <svg
                className="h-5 w-5"
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
            <a
              href="#booking"
              className="px-5 py-2 rounded-full bg-transparent border border-primary text-primary hover:bg-primary hover:text-white hover:neon-pink-border-glow transition-all duration-300 font-semibold tracking-wider text-xs uppercase"
            >
              Book Now
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-primary focus:outline-none transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="md:hidden bg-dark/95 border-b border-primary/20 absolute top-full left-0 w-full backdrop-blur-lg animate-fade-in">
          <div className="px-4 pt-2 pb-6 space-y-4 flex flex-col items-center">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block text-lg font-semibold tracking-widest text-white hover:text-primary uppercase py-2 transition-colors"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-4 flex items-center gap-6 w-full justify-center">
              <a
                href={CONTACT_INFO.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-primary transition-colors"
                aria-label="Instagram Profile"
              >
                <svg
                  className="h-6 w-6"
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
              <a
                href="#booking"
                onClick={() => setIsOpen(false)}
                className="w-2/3 text-center py-2.5 rounded-full bg-primary text-white neon-pink-border-glow font-bold tracking-widest text-sm uppercase"
              >
                Book Now
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
