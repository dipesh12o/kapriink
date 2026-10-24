import { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, 
  Clock, 
  Flame, 
  Sparkles, 
  Paintbrush, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Maximize2, 
  X, 
  User, 
  Mail, 
  Tag, 
  Award
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { formatCountdown } from "../utils/auctionUtils";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export interface PaintingDetail {
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

export interface AnonymizedBid {
  id: string;
  amount: number;
  bidderLabel: string;
  createdAt: string;
}

interface PaintingDetailsProps {
  paintingId: string;
  onBack?: () => void;
}

export default function PaintingDetails({ paintingId, onBack }: PaintingDetailsProps) {
  const [painting, setPainting] = useState<PaintingDetail | null>(null);
  const [bids, setBids] = useState<AnonymizedBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  // Bidder authentication state
  const [bidderToken, setBidderToken] = useState<string>(() => localStorage.getItem("kaprink_bidder_token") || "");
  const [bidderEmail, setBidderEmail] = useState<string>(() => localStorage.getItem("kaprink_bidder_email") || "");
  const [bidderName, setBidderName] = useState<string>(() => localStorage.getItem("kaprink_bidder_name") || "");

  // Verification request form state
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Bidding form state
  const [bidAmount, setBidAmount] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch painting details & bid history
  const loadPaintingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [resPainting, resBids] = await Promise.all([
        fetch(`${API_URL}/api/auctions/${paintingId}`),
        fetch(`${API_URL}/api/auctions/${paintingId}/bids`)
      ]);

      if (!resPainting.ok) {
        if (resPainting.status === 404) {
          throw new Error("Painting not found or unavailable.");
        }
        throw new Error("Failed to load painting details.");
      }

      const pData: PaintingDetail = await resPainting.json();
      setPainting(pData);

      if (resBids.ok) {
        const bData: AnonymizedBid[] = await resBids.json();
        setBids(bData);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaintingData();
  }, [paintingId]);

  // Set default bid amount when painting loads
  useEffect(() => {
    if (painting) {
      const minRequired = painting.currentHighestBid > 0 
        ? painting.currentHighestBid + painting.minBidIncrement 
        : painting.startingBid;
      setBidAmount(minRequired.toString());
    }
  }, [painting?.currentHighestBid, painting?.startingBid, painting?.minBidIncrement]);

  // Socket.IO Room & Real-time bid listeners
  useEffect(() => {
    if (!paintingId) return;

    let socket: Socket | null = null;
    try {
      socket = io(API_URL || window.location.origin, {
        transports: ["websocket", "polling"]
      });

      // Join specific room for this painting
      socket.emit("join_auction", paintingId);

      socket.on("new_bid", (data: { paintingId: string; bid: AnonymizedBid; currentHighestBid: number; bidCount: number }) => {
        if (data.paintingId === paintingId) {
          // Prepend new bid to history
          setBids((prev) => [data.bid, ...prev]);

          // Update painting state
          setPainting((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              currentHighestBid: data.currentHighestBid,
              bidCount: data.bidCount,
              hasBids: true
            };
          });
        }
      });

      socket.on("auction_updated", (data: { paintingId: string; currentHighestBid: number; bidCount: number; status?: any; isSaleConfirmed?: boolean }) => {
        if (data.paintingId === paintingId) {
          setPainting((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              currentHighestBid: data.currentHighestBid,
              bidCount: data.bidCount,
              ...(data.status ? { status: data.status } : {}),
              ...(typeof data.isSaleConfirmed === "boolean" ? { isSaleConfirmed: data.isSaleConfirmed } : {})
            };
          });
        }
      });
    } catch (err) {
      console.error("Socket error on detail page:", err);
    }

    return () => {
      if (socket) {
        socket.emit("leave_auction", paintingId);
        socket.disconnect();
      }
    };
  }, [paintingId]);

  // Handle Request Email Verification Code
  const handleRequestVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    setDevOtpHint(null);

    try {
      const res = await fetch(`${API_URL}/api/auctions/request-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: reqEmail, name: reqName })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to send verification code.");
      }

      setVerificationSent(true);
      setAuthSuccess(data.message || "Verification code sent to your email.");

      // If developer/sandbox returned preview token
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
    } catch (err: any) {
      setAuthError(err.message || "Could not request verification.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Verify Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const res = await fetch(`${API_URL}/api/auctions/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: reqEmail, code: otpCode })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Invalid or expired verification code.");
      }

      // Store verified bidder credentials in localStorage
      localStorage.setItem("kaprink_bidder_token", data.token);
      localStorage.setItem("kaprink_bidder_email", data.participant.email);
      localStorage.setItem("kaprink_bidder_name", data.participant.name);

      setBidderToken(data.token);
      setBidderEmail(data.participant.email);
      setBidderName(data.participant.name);

      setAuthSuccess("Email verified successfully! You are now authorized to place bids.");
      setVerificationSent(false);
    } catch (err: any) {
      setAuthError(err.message || "Verification failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Switch / Log out bidder
  const handleLogoutBidder = () => {
    localStorage.removeItem("kaprink_bidder_token");
    localStorage.removeItem("kaprink_bidder_email");
    localStorage.removeItem("kaprink_bidder_name");
    setBidderToken("");
    setBidderEmail("");
    setBidderName("");
    setVerificationSent(false);
    setAuthSuccess(null);
    setAuthError(null);
  };

  // Handle Placing a Bid
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidSubmitting(true);
    setBidSuccess(null);
    setBidError(null);

    const numericAmount = parseFloat(bidAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setBidError("Please enter a valid bid amount.");
      setBidSubmitting(false);
      return;
    }

    if (!termsAccepted) {
      setBidError("You must accept the auction terms to place a bid.");
      setBidSubmitting(false);
      return;
    }

    // Generate unique idempotency key for this bid attempt
    const idempotencyKey = "bid_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);

    try {
      const res = await fetch(`${API_URL}/api/auctions/${paintingId}/bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bidder-token": bidderToken
        },
        body: JSON.stringify({
          amount: numericAmount,
          idempotencyKey
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleLogoutBidder();
          throw new Error("Your bidder session has expired. Please verify your email again.");
        }
        throw new Error(data.message || "Failed to place bid.");
      }

      setBidSuccess(`Success! Your bid of $${numericAmount.toLocaleString()} has been placed.`);

      // Update painting state with authoritative server response
      if (data.painting) {
        setPainting((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            currentHighestBid: data.painting.currentHighestBid,
            bidCount: data.painting.bidCount,
            hasBids: true
          };
        });
      }

      // Prepend bid to list if returned
      if (data.bid) {
        setBids((prev) => {
          if (prev.some((b) => b.id === data.bid.id)) return prev;
          return [data.bid, ...prev];
        });
      }

      // Reset bid amount to the next required increment
      if (painting) {
        const nextMin = numericAmount + painting.minBidIncrement;
        setBidAmount(nextMin.toString());
      }
    } catch (err: any) {
      setBidError(err.message || "Could not place bid.");
    } finally {
      setBidSubmitting(false);
    }
  };

  // Format countdown
  const countdown = useMemo(() => {
    if (!painting) return null;
    const target = painting.status === "upcoming" ? painting.startTime : painting.endTime;
    return formatCountdown(target, now);
  }, [painting, now]);

  // Minimum required bid calculator
  const minRequiredBid = useMemo(() => {
    if (!painting) return 0;
    return painting.currentHighestBid > 0 
      ? painting.currentHighestBid + painting.minBidIncrement 
      : painting.startingBid;
  }, [painting]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.pushState({}, "", "/#auctions");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-light-gray uppercase tracking-widest text-xs font-semibold">
          Loading Original Painting...
        </p>
      </div>
    );
  }

  // 2. Error State
  if (error || !painting) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-dark-gray border border-white/5 p-8 rounded-lg text-center space-y-5">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-2xl font-display font-bold text-white uppercase">Painting Unavailable</h2>
          <p className="text-sm text-light-gray/70">{error || "Could not locate this auction item."}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-xs uppercase font-bold tracking-wider hover:neon-pink-border-glow transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark py-12 px-4 sm:px-6 lg:px-8">
      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close Lightbox"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={painting.imageUrl}
            alt={painting.title}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-md shadow-2xl"
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-light-gray/80 hover:text-primary transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Auctions
          </button>

          {/* Status Badge */}
          <div>
            {painting.status === "live" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold tracking-wider uppercase">
                <Flame className="h-3.5 w-3.5 text-red-400 animate-pulse" />
                Live Auction
              </span>
            )}
            {painting.status === "upcoming" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-bold tracking-wider uppercase">
                <Clock className="h-3.5 w-3.5 text-yellow-400" />
                Upcoming
              </span>
            )}
            {painting.status === "sold" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold tracking-wider uppercase">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Sold
              </span>
            )}
            {painting.status === "ended" && !painting.isSaleConfirmed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-light-gray border border-white/20 text-xs font-bold tracking-wider uppercase">
                <Clock className="h-3.5 w-3.5" />
                Auction Ended
              </span>
            )}
            {painting.status === "cancelled" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/40 text-red-400 border border-red-800/40 text-xs font-bold tracking-wider uppercase">
                Cancelled
              </span>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Artwork Photograph & Lightbox */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative group bg-dark-gray border border-white/5 rounded-lg overflow-hidden shadow-2xl">
              <img
                src={painting.imageUrl}
                alt={painting.title}
                className="w-full h-auto max-h-[700px] object-contain mx-auto transition-transform duration-500 group-hover:scale-[1.01]"
              />
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-4 right-4 p-3 rounded-full bg-dark/80 backdrop-blur-md text-white border border-white/10 hover:border-primary hover:text-primary transition-all opacity-90 group-hover:opacity-100 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
              >
                <Maximize2 className="h-4 w-4" />
                Expand View
              </button>
            </div>

            {/* Artwork Specifications Banner */}
            <div className="bg-dark-gray/60 border border-white/5 rounded-lg p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-light-gray/50 font-bold">Medium</p>
                <p className="text-sm font-semibold text-white mt-0.5">{painting.medium || "Original Mixed Media"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-light-gray/50 font-bold">Dimensions</p>
                <p className="text-sm font-semibold text-white mt-0.5">{painting.dimensions || "Custom Frame"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-light-gray/50 font-bold">Artist</p>
                <p className="text-sm font-semibold text-secondary mt-0.5">Jordynn Smith</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-light-gray/50 font-bold">Authenticity</p>
                <p className="text-sm font-semibold text-primary mt-0.5">Signed Original</p>
              </div>
            </div>

            {/* Artwork Description */}
            <div className="bg-dark-gray border border-white/5 rounded-lg p-6 space-y-3">
              <h3 className="text-xs uppercase tracking-widest font-bold text-white/50 flex items-center gap-2">
                <Paintbrush className="h-4 w-4 text-primary" />
                Artist Note & Provenance
              </h3>
              <p className="text-light-gray/80 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {painting.description}
              </p>
            </div>
          </div>

          {/* Right Column: Bidding Controls, Live Countdown & Bid History */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Header / Title Card */}
            <div className="bg-dark-gray border border-white/5 p-6 rounded-lg space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 border-t border-r border-primary/10 rounded-tr-lg" />
              
              <div>
                <h1 className="text-3xl font-display font-extrabold text-white uppercase tracking-wide">
                  {painting.title}
                </h1>
                <p className="text-xs text-light-gray/60 uppercase tracking-widest font-semibold mt-1">
                  1-of-1 Original Artwork by Jordynn
                </p>
              </div>

              {/* Price / Current Highest Bid Box */}
              <div className="p-4 bg-dark/70 border border-white/10 rounded-md flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-light-gray/60 font-bold">
                    {painting.currentHighestBid > 0 ? "Current Highest Bid" : "Starting Bid"}
                  </p>
                  <p className="text-3xl font-display font-extrabold text-secondary mt-0.5">
                    ${(painting.currentHighestBid > 0 ? painting.currentHighestBid : painting.startingBid).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-light-gray/60 font-bold">Min Increment</p>
                  <p className="text-base font-display font-bold text-white mt-0.5">
                    +${painting.minBidIncrement.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Countdown Banner */}
              {countdown && (
                <div className={`p-4 rounded-md border flex items-center justify-between ${
                  countdown.isExpired
                    ? "bg-white/5 border-white/10 text-light-gray"
                    : countdown.isUrgent
                    ? "bg-red-950/30 border-red-500/40 text-red-300"
                    : "bg-secondary/10 border-secondary/20 text-secondary"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Clock className={`h-5 w-5 ${countdown.isUrgent ? "text-red-400 animate-pulse" : "text-secondary"}`} />
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold opacity-75">
                        {painting.status === "upcoming" ? "Bidding Opens In" : painting.status === "live" ? "Time Remaining" : "Auction Status"}
                      </p>
                      <p className="text-lg font-mono font-bold tracking-wider mt-0.5">
                        {countdown.text}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs uppercase tracking-widest font-bold opacity-70">
                      {painting.bidCount} {painting.bidCount === 1 ? "Bid" : "Bids"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bidding Interaction Card */}
            <div className="bg-dark-gray border border-white/5 p-6 rounded-lg space-y-5 relative">
              <h2 className="text-lg font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="h-5 w-5 text-secondary" />
                Place Your Bid
              </h2>

              {/* 1. If Auction is NOT live (Ended / Sold / Upcoming) */}
              {painting.status !== "live" && (
                <div className="p-5 bg-dark/60 border border-white/10 rounded-md text-center space-y-2">
                  {painting.status === "sold" ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                      <p className="text-sm font-bold text-white uppercase tracking-wider">Sale Confirmed</p>
                      <p className="text-xs text-light-gray/70">
                        This original artwork has been acquired by the winning collector.
                      </p>
                    </>
                  ) : painting.status === "ended" ? (
                    <>
                      <Clock className="h-8 w-8 text-light-gray/60 mx-auto" />
                      <p className="text-sm font-bold text-white uppercase tracking-wider">Auction Has Concluded</p>
                      {painting.winner ? (
                        <p className="text-xs text-light-gray/70">
                          Final highest bid was <span className="text-secondary font-bold">${painting.winner.amount.toLocaleString()}</span> placed by {painting.winner.bidderLabel}. Jordynn is contacting the winning bidder directly.
                        </p>
                      ) : (
                        <p className="text-xs text-light-gray/70">This auction concluded with no bids.</p>
                      )}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-8 w-8 text-yellow-400 mx-auto" />
                      <p className="text-sm font-bold text-white uppercase tracking-wider">Bidding Opens Soon</p>
                      <p className="text-xs text-light-gray/70">
                        This auction begins on {new Date(painting.startTime).toLocaleString()}. You can verify your email now to be ready.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* 2. Email Verification Flow (if not verified or user wants to verify early) */}
              {!bidderToken ? (
                <div className="space-y-4">
                  <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-md space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      Secure Email Verification Required
                    </p>
                    <p className="text-xs text-light-gray/70">
                      No password required. Enter your email to receive a secure one-time verification code to bid.
                    </p>
                  </div>

                  {authError && (
                    <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-500/30 rounded text-red-400 text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-green-950/20 border border-green-500/30 rounded text-green-400 text-xs">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{authSuccess}</span>
                    </div>
                  )}

                  {devOtpHint && (
                    <div className="p-3 bg-yellow-950/20 border border-yellow-500/30 rounded text-yellow-300 text-xs space-y-1">
                      <p className="font-bold uppercase tracking-wider">Development Sandbox Mode Active</p>
                      <p>Your one-time verification code is: <span className="font-mono font-bold text-white text-sm bg-black/40 px-2 py-0.5 rounded">{devOtpHint}</span></p>
                    </div>
                  )}

                  {!verificationSent ? (
                    <form onSubmit={handleRequestVerification} className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 block mb-1">
                          Your Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Alexis Vance"
                            value={reqName}
                            onChange={(e) => setReqName(e.target.value)}
                            className="w-full bg-dark border border-white/10 rounded-md py-2.5 pl-9 pr-3 text-white text-xs focus:outline-none focus:border-secondary"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 block mb-1">
                          Your Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                          <input
                            type="email"
                            required
                            placeholder="alexis@example.com"
                            value={reqEmail}
                            onChange={(e) => setReqEmail(e.target.value)}
                            className="w-full bg-dark border border-white/10 rounded-md py-2.5 pl-9 pr-3 text-white text-xs focus:outline-none focus:border-secondary"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-secondary text-dark font-bold uppercase tracking-wider rounded-md hover:neon-pink-border-glow transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        {authLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Send Verification Code"
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyCode} className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 block mb-1">
                          Enter 6-Digit Code sent to {reqEmail}
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          className="w-full bg-dark border border-white/10 rounded-md py-2.5 px-3 text-center font-mono text-lg font-bold tracking-widest text-secondary focus:outline-none focus:border-secondary"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setVerificationSent(false)}
                          className="w-1/3 py-2.5 bg-white/5 border border-white/10 text-white rounded-md text-xs font-bold uppercase hover:bg-white/10 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={authLoading || otpCode.length !== 6}
                          className="w-2/3 py-2.5 bg-secondary text-dark font-bold uppercase tracking-wider rounded-md hover:neon-pink-border-glow transition-all flex items-center justify-center gap-2 text-xs"
                        >
                          {authLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Verify & Authorize"
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* 3. Verified Bidder Session & Bidding Form */
                <div className="space-y-4">
                  {/* Verified Bidder Banner */}
                  <div className="p-3 bg-dark/80 border border-secondary/30 rounded-md flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-secondary shrink-0" />
                      <span className="text-light-gray truncate">
                        Verified as: <strong className="text-white">{bidderName}</strong> ({bidderEmail})
                      </span>
                    </div>
                    <button
                      onClick={handleLogoutBidder}
                      className="text-[10px] text-light-gray/60 hover:text-red-400 uppercase tracking-wider font-semibold ml-2 underline"
                    >
                      Change
                    </button>
                  </div>

                  {painting.status === "live" && (
                    <form onSubmit={handlePlaceBid} className="space-y-4">
                      {bidError && (
                        <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-500/30 rounded text-red-400 text-xs">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{bidError}</span>
                        </div>
                      )}

                      {bidSuccess && (
                        <div className="flex items-center gap-2 p-3 bg-green-950/20 border border-green-500/30 rounded text-green-400 text-xs">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>{bidSuccess}</span>
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 block">
                            Bid Amount (USD)
                          </label>
                          <span className="text-[10px] text-secondary font-mono">
                            Min: ${minRequiredBid.toLocaleString()}
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-base font-bold text-secondary">$</span>
                          <input
                            type="number"
                            required
                            min={minRequiredBid}
                            step={painting.minBidIncrement}
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="w-full bg-dark border border-white/10 rounded-md py-2.5 pl-8 pr-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      </div>

                      {/* Terms Acceptance Checkbox */}
                      <div className="flex items-start gap-2.5 pt-1">
                        <input
                          id="auction-terms"
                          type="checkbox"
                          required
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-0.5 rounded border-white/20 bg-dark text-primary focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="auction-terms" className="text-[11px] text-light-gray/70 leading-snug cursor-pointer select-none">
                          I agree that all bids are binding. If I am the winning bidder, Jordynn will contact me directly to finalize payment and shipping.
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={bidSubmitting || !termsAccepted || parseFloat(bidAmount) < minRequiredBid}
                        className="w-full py-3 bg-primary text-white font-bold uppercase tracking-wider rounded-md hover:neon-pink-border-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        {bidSubmitting ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          `Confirm Bid of $${(parseFloat(bidAmount) || minRequiredBid).toLocaleString()}`
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Real-time Bid History Feed */}
            <div className="bg-dark-gray border border-white/5 p-6 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-widest font-bold text-white/50 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-secondary" />
                  Live Bid Activity
                </h3>
                <span className="text-[10px] text-light-gray/50 uppercase tracking-widest font-mono">
                  {bids.length} {bids.length === 1 ? "Record" : "Records"}
                </span>
              </div>

              {bids.length === 0 ? (
                <div className="py-8 text-center text-light-gray/40 text-xs italic">
                  No bids have been placed yet. Be the first to place an opening bid!
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {bids.map((b, idx) => (
                    <div
                      key={b.id || idx}
                      className={`flex items-center justify-between p-3 rounded-md text-xs transition-colors ${
                        idx === 0
                          ? "bg-secondary/10 border border-secondary/30 text-white font-semibold"
                          : "bg-dark/50 border border-white/5 text-light-gray/70"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {idx === 0 && <Award className="h-3.5 w-3.5 text-secondary" />}
                        <span className="font-mono">{b.bidderLabel}</span>
                        {idx === 0 && (
                          <span className="text-[9px] bg-secondary/20 text-secondary px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                            Highest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-white text-sm">
                          ${b.amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-light-gray/40 font-mono">
                          {new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
