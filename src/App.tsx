import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Styles from "./components/Styles";
import Portfolio from "./components/Portfolio";
import About from "./components/About";
import Booking from "./components/Booking";
import LocationContact from "./components/LocationContact";
import Footer from "./components/Footer";
import AdminPortal from "./components/AdminPortal";

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Check if the current route is the admin portal
  const isAdminRoute = path.startsWith("/admin");

  if (isAdminRoute) {
    return (
      <div className="relative min-h-screen bg-dark text-white selection:bg-primary selection:text-white antialiased">
        <div className="noise-overlay" />
        <AdminPortal />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-dark text-white selection:bg-primary selection:text-white antialiased">
      {/* Editorial SVG Noise Grain Overlay */}
      <div className="noise-overlay" />

      {/* Navigation Header */}
      <Navbar />

      {/* Main Page Layout Sections */}
      <main>
        {/* Hero Banner Section */}
        <Hero />

        {/* Core Specialties Styles Section */}
        <Styles />

        {/* Gallery / Portfolio Section */}
        <Portfolio />

        {/* Bio / About Jordynn Section */}
        <About />

        {/* Booking Form and Deposit Portal */}
        <Booking />

        {/* Location Coordinates & Availability */}
        <LocationContact />
      </main>

      {/* Styled Branded Footer */}
      <Footer />
    </div>
  );
}

export default App;
