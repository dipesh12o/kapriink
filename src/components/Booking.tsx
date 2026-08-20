import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, Send, Info, CheckCircle2 } from "lucide-react";
import { CONTACT_INFO, BOOKING_PAYMENT_URL } from "../data/artistData";

export default function Booking() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    style: "Fine Line",
    idea: "",
    schedule: "",
    details: "",
  });

  const [isPreFilled, setIsPreFilled] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Construct Mailto Link
    const subject = encodeURIComponent(`KapriInk Tattoo Booking Request - ${formData.name}`);
    const body = encodeURIComponent(
      `Tattoo Inquiry Details:\n` +
      `-------------------------\n` +
      `Name: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Phone: ${formData.phone}\n` +
      `Preferred Style: ${formData.style}\n` +
      `Tattoo Idea: ${formData.idea}\n` +
      `Preferred Schedule: ${formData.schedule}\n` +
      `Additional Details: ${formData.details}\n\n` +
      `Note: A $20 deposit is required to secure the appointment.`
    );

    const mailtoUrl = `mailto:${CONTACT_INFO.email}?subject=${subject}&body=${body}`;
    
    // Trigger mail client opening
    window.location.href = mailtoUrl;
    setIsPreFilled(true);
  };

  return (
    <section id="booking" className="py-24 bg-dark relative">
      <div className="absolute inset-0 bg-gradient-to-b from-dark via-dark-gray/20 to-dark pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="text-xs uppercase tracking-widest text-primary font-bold">
            SECURE YOUR SPOT
          </span>
          <h2 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-white uppercase">
            Book Your Tattoo
          </h2>
          <p className="text-light-gray/70 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Tell me what you're thinking. Whether it's fine line, bold shading, color, or something completely abstract, send over your idea and let's talk about bringing it to life.
          </p>
          <div className="w-20 h-1 bg-primary mt-2 mx-auto" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Form Inquiry */}
          <div className="lg:col-span-7 bg-dark-gray border border-white/5 p-6 sm:p-8 rounded-lg shadow-xl relative">
            <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">
              Tattoo Inquiry Form
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className="block text-xs uppercase tracking-wider font-bold text-white/70 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-dark border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary text-sm transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs uppercase tracking-wider font-bold text-white/70 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-dark border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="phone" className="block text-xs uppercase tracking-wider font-bold text-white/70 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full bg-dark border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary text-sm transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="style" className="block text-xs uppercase tracking-wider font-bold text-white/70 mb-2">
                    Preferred Style
                  </label>
                  <select
                    id="style"
                    name="style"
                    value={formData.style}
                    onChange={handleChange}
                    className="w-full bg-dark border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary text-sm transition-colors"
                  >
                    <option value="Abstract">Abstract</option>
                    <option value="Dark Shading">Dark Shading</option>
                    <option value="Fine Line">Fine Line</option>
                    <option value="Color">Color</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="idea" className="block text-xs uppercase tracking-wider font-bold text-white/70 mb-2">
                  Tattoo Idea Description *
                </label>
                <textarea
                  id="idea"
                  name="idea"
                  required
                  rows={3}
                  placeholder="Describe your design, size, and where on the body you want it..."
                  value={formData.idea}
                  onChange={handleChange}
                  className="w-full bg-dark border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary text-sm transition-colors resize-none"
                />
              </div>

              <div>
                <label htmlFor="schedule" className="block text-xs uppercase tracking-wider font-bold text-white/70 mb-2">
                  Preferred Appointment Day & Time *
                </label>
                <input
                  type="text"
                  id="schedule"
                  name="schedule"
                  required
                  placeholder="e.g. Saturday afternoon, Wednesday at 4pm..."
                  value={formData.schedule}
                  onChange={handleChange}
                  className="w-full bg-dark border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary text-sm transition-colors"
                />
              </div>

              <div>
                <label htmlFor="details" className="block text-xs uppercase tracking-wider font-bold text-white/70 mb-2">
                  Additional Details / Reference Links
                </label>
                <textarea
                  id="details"
                  name="details"
                  rows={2}
                  placeholder="Any extra info, social handles, or reference link paths..."
                  value={formData.details}
                  onChange={handleChange}
                  className="w-full bg-dark border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary text-sm transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded bg-primary text-white font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-opacity-90 hover:neon-pink-border-glow transition-all duration-300"
              >
                <Send className="h-4 w-4" />
                Prepare Booking Email
              </button>
            </form>

            {isPreFilled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded bg-secondary/10 border border-secondary/20 text-secondary text-sm flex items-start gap-3"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Inquiry pre-filled in your email client!</p>
                  <p className="text-xs text-light-gray/70 mt-1">
                    Please send the generated email containing your inquiry data to <strong className="text-white">{CONTACT_INFO.email}</strong>. 
                    Jordynn will review the details and get back to you shortly.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Deposit Callout */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            
            {/* Deposit Card */}
            <div className="p-6 sm:p-8 bg-gradient-to-b from-primary/15 via-dark-gray to-dark-gray border border-primary/30 rounded-lg text-center space-y-4 shadow-xl">
              <span className="inline-block px-3 py-1 bg-primary/20 border border-primary/40 rounded-full text-xs font-bold text-primary tracking-wider uppercase">
                Required Deposit
              </span>
              <h3 className="text-4xl font-display font-extrabold text-white uppercase tracking-tight">
                $20.00
              </h3>
              <p className="text-sm text-light-gray/80 leading-relaxed font-sans px-2">
                A non-refundable <strong>$20 deposit</strong> is required to secure your booking slot. This amount goes directly towards the final price of your tattoo.
              </p>
              
              <div className="w-full h-px bg-white/5 my-4" />

              {/* Payment CTA Link conditional on BOOKING_PAYMENT_URL */}
              {BOOKING_PAYMENT_URL ? (
                <a
                  href={BOOKING_PAYMENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3.5 rounded bg-secondary text-white font-bold uppercase tracking-wider text-xs hover:neon-blue-border-glow transition-all duration-300"
                >
                  Pay Deposit Now
                </a>
              ) : (
                <div className="p-3.5 rounded bg-dark border border-white/5 text-xs text-light-gray/50 uppercase tracking-widest font-semibold font-sans">
                  Deposit Arranged Upon Booking Approval
                </div>
              )}
            </div>

            {/* Direct Contact Backup Channels */}
            <div className="p-6 bg-dark-gray border border-white/5 rounded-lg space-y-5 shadow-xl text-left">
              <div className="flex items-center gap-2 text-secondary mb-2">
                <Info className="h-4 w-4" />
                <span className="text-xs uppercase tracking-widest font-bold">Alternative Booking</span>
              </div>
              <p className="text-xs text-light-gray/70 leading-relaxed">
                Prefer direct messaging or manual contact? You can also initiate booking inquires by sending a DM, calling, or emailing:
              </p>

              <div className="space-y-3 pt-2 text-sm">
                <a
                  href={CONTACT_INFO.socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-light-gray hover:text-primary transition-colors font-medium"
                >
                  <svg
                    className="h-4 w-4 text-primary"
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
                  <span>Instagram: @kapriink</span>
                </a>
                <a
                  href={CONTACT_INFO.socials.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-light-gray hover:text-primary transition-colors font-medium"
                >
                  <svg
                    className="h-4 w-4 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                  <span>TikTok: @kaprink17</span>
                </a>
                <a
                  href={`tel:${CONTACT_INFO.phone}`}
                  className="flex items-center gap-3 text-light-gray hover:text-secondary transition-colors font-medium"
                >
                  <Phone className="h-4 w-4 text-secondary" />
                  <span>Phone: 801-791-0045</span>
                </a>
                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="flex items-center gap-3 text-light-gray hover:text-secondary transition-colors font-medium"
                >
                  <Mail className="h-4 w-4 text-secondary" />
                  <span>Email: Jordynnkaprink@gmail.com</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
