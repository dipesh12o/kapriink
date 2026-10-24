import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Flame, Paintbrush, ArrowRight, CheckCircle2 } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { formatCountdown } from "../utils/auctionUtils";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export interface PublicPainting {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  dimensions?: string;
  medium?: string;
  startingBid: number;
  minBidIncrement: number;
  startTime: string;
  endTime: string;
  status: "draft" | "upcoming" | "live" | "ended" | "sold" | "cancelled";
  currentHighestBid: number;
  bidCount: number;
  isSaleConfirmed: boolean;
  hasBids: boolean;
  winner?: {
    amount: number;
    bidderLabel: string;
  } | null;
  serverTime: string;
}

interface AuctionsProps {
  onSelectPainting?: (id: string) => void;
}

export default function Auctions({ onSelectPainting }: AuctionsProps) {
  const [auctions, setAuctions] = useState<PublicPainting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");
  const [now, setNow] = useState<Date>(new Date());

  // Clock tick for live countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch public auctions
  const fetchAuctions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auctions`);
      if (res.ok) {
        const data = await res.json();
        setAuctions(data);
      }
    } catch (err) {
      console.error("Failed to load auctions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();

    // Socket.IO real-time connection
    let socket: Socket | null = null;
    try {
      socket = io(API_URL || window.location.origin, {
        transports: ["websocket", "polling"]
      });

      socket.on("auction_updated", (data: { paintingId: string; currentHighestBid: number; bidCount: number }) => {
        setAuctions((prev) =>
          prev.map((item) =>
            item.id === data.paintingId
              ? { ...item, currentHighestBid: data.currentHighestBid, bidCount: data.bidCount, hasBids: true }
              : item
          )
        );
      });

      socket.on("auction_status_changed", (data: { paintingId: string; status: PublicPainting["status"] }) => {
        setAuctions((prev) =>
          prev.map((item) =>
            item.id === data.paintingId ? { ...item, status: data.status } : item
          )
        );
      });
    } catch (e) {
      console.warn("Socket.IO client init fallback:", e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const handleCardClick = (id: string) => {
    if (onSelectPainting) {
      onSelectPainting(id);
    } else {
      window.history.pushState({}, "", `/auctions/${id}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  // Filter auctions
  const filteredAuctions = useMemo(() => {
    if (filter === "All") return auctions;
    if (filter === "Live") return auctions.filter((a) => a.status === "live");
    if (filter === "Upcoming") return auctions.filter((a) => a.status === "upcoming");
    if (filter === "Past") return auctions.filter((a) => a.status === "ended" || a.status === "sold");
    return auctions;
  }, [auctions, filter]);

  return (
    <section id="auctions" className="py-24 bg-dark relative overflow-hidden border-t border-white/5">
      {/* Background glow accent */}
      <div className="absolute top-1/3 right-10 w-96 h-96 rounded-full bg-primary/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-secondary/5 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="text-xs uppercase tracking-widest text-secondary font-bold flex items-center justify-center gap-2">
            
            ORIGINAL ARTWORK & COLLECTIBLES
          </span>
          <h2 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-white uppercase">
            Painting Auctions
          </h2>
          <p className="text-light-gray/70 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Own an exclusive, one-of-a-kind original painting created by Jordynn in the studio. Each canvas is hand-signed, custom-finished, and available directly through live online bidding.
          </p>
          <div className="w-20 h-1 bg-secondary mt-2 mx-auto" />
        </div>

        {/* Filter Tabs */}
        {auctions.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
            {["All", "Live", "Upcoming", "Past"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                  filter === tab
                    ? "bg-secondary text-dark shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                    : "bg-white/5 text-light-gray/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-dark-gray border border-white/5 rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-[4/5] bg-white/5" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-6 bg-white/10 rounded w-3/4" />
                  <div className="h-4 bg-white/5 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : auctions.length === 0 ? (
          /* Polished Empty State - Zero Dummy Data */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto bg-dark-gray border border-white/5 p-10 sm:p-14 rounded-xl text-center space-y-6 relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-secondary/20 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-primary/20 rounded-bl-xl" />

            <div className="mx-auto w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-secondary">
              <Paintbrush className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-primary font-bold">
                STUDIO RELEASE
              </span>
              <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white uppercase tracking-wider">
                Original Auctions Coming Soon
              </h3>
              <p className="text-light-gray/70 text-sm sm:text-base leading-relaxed pt-2">
                Jordynn is currently crafting a fresh collection of original canvas and wood-panel paintings. When new auction dates open, you will be able to register and place live bids right here.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#booking"
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-primary text-white font-bold uppercase tracking-wider text-xs hover:neon-pink-border-glow transition-all"
              >
                Inquire on Custom Commissions
              </a>
              <a
                href="#work"
                className="w-full sm:w-auto px-6 py-3 rounded-full border border-white/10 text-white/80 hover:text-white hover:bg-white/5 font-bold uppercase tracking-wider text-xs transition-colors"
              >
                Explore Tattoo Portfolio
              </a>
            </div>
          </motion.div>
        ) : filteredAuctions.length === 0 ? (
          <div className="text-center py-16 text-light-gray/50 uppercase tracking-widest text-xs font-semibold">
            No paintings currently in the "{filter}" category.
          </div>
        ) : (
          /* Painting Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredAuctions.map((painting) => {
                const isLive = painting.status === "live";
                const isUpcoming = painting.status === "upcoming";
                const isSold = painting.status === "sold";
                const isEnded = painting.status === "ended";

                const countdown = isLive
                  ? formatCountdown(painting.endTime, now)
                  : isUpcoming
                  ? formatCountdown(painting.startTime, now)
                  : null;

                return (
                  <motion.div
                    key={painting.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => handleCardClick(painting.id)}
                    className="group bg-dark-gray border border-white/5 hover:border-secondary/40 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col shadow-xl hover:shadow-[0_0_25px_rgba(0,229,255,0.15)]"
                  >
                    {/* Artwork Image Container */}
                    <div className="relative aspect-[4/5] bg-dark overflow-hidden">
                      <img
                        src={painting.imageUrl}
                        alt={painting.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        loading="lazy"
                      />

                      {/* Status Badge */}
                      <div className="absolute top-4 left-4 z-10">
                        {isLive && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark/80 backdrop-blur-md border border-secondary text-secondary text-xs font-extrabold uppercase tracking-widest shadow-[0_0_12px_rgba(0,229,255,0.5)]">
                            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                            Live Auction
                          </span>
                        )}
                        {isUpcoming && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark/80 backdrop-blur-md border border-yellow-400 text-yellow-400 text-xs font-extrabold uppercase tracking-widest">
                            <Clock className="h-3 w-3" />
                            Upcoming
                          </span>
                        )}
                        {isSold && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark/80 backdrop-blur-md border border-primary text-primary text-xs font-extrabold uppercase tracking-widest">
                            <CheckCircle2 className="h-3 w-3" />
                            Sold
                          </span>
                        )}
                        {isEnded && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark/80 backdrop-blur-md border border-white/20 text-white/60 text-xs font-extrabold uppercase tracking-widest">
                            Auction Ended
                          </span>
                        )}
                      </div>

                      {/* Live Countdown Overlay */}
                      {isLive && countdown && (
                        <div className="absolute bottom-4 left-4 right-4 z-10 bg-dark/85 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs">
                          <span className="text-white/60 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-secondary" />
                            Time Remaining
                          </span>
                          <span
                            className={`font-mono font-bold tracking-wider ${
                              countdown.isUrgent ? "text-primary animate-pulse" : "text-white"
                            }`}
                          >
                            {countdown.text}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Artwork Details */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider font-bold text-light-gray/50">
                          {painting.medium && (
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                              {painting.medium}
                            </span>
                          )}
                          {painting.dimensions && (
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                              {painting.dimensions}
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-display font-extrabold text-white uppercase tracking-wide group-hover:text-secondary transition-colors line-clamp-1">
                          {painting.title}
                        </h3>

                        {painting.description && (
                          <p className="text-light-gray/60 text-xs leading-relaxed line-clamp-2">
                            {painting.description}
                          </p>
                        )}
                      </div>

                      {/* Pricing and Action */}
                      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <div>
                          <span className="block text-[10px] uppercase tracking-widest font-bold text-white/50">
                            {isLive
                              ? painting.hasBids
                                ? "Current Highest Bid"
                                : "Starting Bid"
                              : isUpcoming
                              ? "Starting Bid"
                              : painting.hasBids
                              ? "Winning Bid"
                              : "Starting Bid"}
                          </span>
                          <span className="text-2xl font-display font-extrabold text-white tracking-tight">
                            ${(isLive && painting.hasBids
                              ? painting.currentHighestBid
                              : painting.startingBid
                            ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          {painting.bidCount > 0 && (
                            <span className="block text-[10px] text-secondary font-bold tracking-wider uppercase">
                              {painting.bidCount} {painting.bidCount === 1 ? "bid" : "bids"} placed
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 ${
                            isLive
                              ? "bg-primary text-white hover:neon-pink-border-glow shadow-md"
                              : "border border-white/10 text-white group-hover:border-secondary group-hover:text-secondary"
                          }`}
                        >
                          {isLive ? (
                            <>
                              <Flame className="h-3.5 w-3.5" />
                              Bid Now
                            </>
                          ) : (
                            <>
                              View
                              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}
