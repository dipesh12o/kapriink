import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { CONTACT_INFO, AVAILABILITY } from "../data/artistData";

export default function LocationContact() {
  return (
    <section id="contact" className="py-24 bg-dark-gray border-t border-white/5 relative overflow-hidden">
      {/* Glow overlay */}
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: Location & Contact */}
          <div className="space-y-8 text-left">
            <div className="space-y-4">
              <span className="text-xs uppercase tracking-widest text-secondary font-bold">
                VISIT THE STUDIO
              </span>
              <h2 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-white uppercase">
                Location & Contact
              </h2>
              <div className="w-20 h-1 bg-secondary mt-2" />
            </div>

            <p className="text-light-gray/70 text-base sm:text-lg max-w-xl leading-relaxed">
              Located on Redwood Road in South Jordan, Utah. Easily accessible and fully equipped for a premium, clean tattoo experience.
            </p>

            <div className="space-y-6 pt-4">
              {/* Address details */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/5 border border-white/10 rounded text-primary shrink-0">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-widest font-bold text-white/50 mb-1">
                    Studio Location
                  </h4>
                  <p className="text-white font-semibold text-lg">
                    {CONTACT_INFO.address}
                  </p>
                  <p className="text-light-gray/80 text-sm">
                    {CONTACT_INFO.cityStateZip}
                  </p>
                </div>
              </div>

              {/* Direct contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <a
                  href={`tel:${CONTACT_INFO.phone}`}
                  className="flex items-start gap-4 group"
                >
                  <div className="p-3 bg-white/5 border border-white/10 rounded text-secondary shrink-0 group-hover:border-secondary transition-colors">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-widest font-bold text-white/50 mb-1">
                      Call Studio
                    </h4>
                    <p className="text-white font-semibold group-hover:text-secondary transition-colors">
                      {CONTACT_INFO.phone}
                    </p>
                  </div>
                </a>

                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="flex items-start gap-4 group"
                >
                  <div className="p-3 bg-white/5 border border-white/10 rounded text-secondary shrink-0 group-hover:border-secondary transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-widest font-bold text-white/50 mb-1">
                      Send Email
                    </h4>
                    <p className="text-white font-semibold group-hover:text-secondary transition-colors break-all text-sm sm:text-base">
                      {CONTACT_INFO.email}
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Availability */}
          <div className="bg-dark border border-white/5 p-8 sm:p-10 rounded-lg shadow-xl relative overflow-hidden flex flex-col justify-center">
            {/* Outline corner decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-primary/20 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-secondary/20 rounded-bl-lg" />

            <div className="space-y-6 text-left relative z-10">
              <div className="flex items-center gap-3 text-primary">
                <Clock className="h-6 w-6" />
                <h3 className="text-xl font-bold uppercase tracking-widest text-white">
                  Studio Availability
                </h3>
              </div>
              <div className="h-px bg-white/10 w-full" />
              
              <div className="space-y-6 font-sans">
                <div className="space-y-1">
                  <span className="block text-xs uppercase tracking-wider font-bold text-primary">
                    {AVAILABILITY.weekdays.days}
                  </span>
                  <span className="block text-2xl font-extrabold text-white">
                    {AVAILABILITY.weekdays.hours}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="block text-xs uppercase tracking-wider font-bold text-secondary">
                    {AVAILABILITY.weekends.days}
                  </span>
                  <span className="block text-2xl font-extrabold text-white">
                    {AVAILABILITY.weekends.hours}
                  </span>
                </div>
              </div>

              <div className="pt-4 text-xs text-light-gray/40 leading-relaxed uppercase tracking-wider font-semibold">
                * APPOINTMENTS OUTSIDE CORE HOURS ARE SUBJECT TO SPECIAL REQUEST.
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
