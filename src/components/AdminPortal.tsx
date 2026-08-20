import { useState, useEffect, useCallback } from "react";
import { 
  Lock, 
  Mail, 
  Plus, 
  Trash2, 
  LogOut, 
  Key, 
  Upload, 
  Check, 
  AlertCircle, 
  Loader2, 
  ArrowLeft 
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

// Custom interface for Mapped Tattoo Item
interface WebTattoo {
  id: string;
  src: string;
  alt: string;
  categories: string[];
  imageFileId: string;
}

export default function AdminPortal() {
  const [session, setSession] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");

  // Setup / Reset Mode Routing State
  const [isSetupMode, setIsSetupMode] = useState(() => 
    window.location.pathname === "/admin/setup"
  );
  const [isResetMode, setIsResetMode] = useState(() => 
    window.location.pathname === "/admin/reset-password"
  );
  const [token] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  });

  // Password Management
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // CRUD State
  const [tattoos, setTattoos] = useState<WebTattoo[]>([]);
  const [tattoosLoading, setTattoosLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [crudError, setCrudError] = useState("");
  const [crudSuccess, setCrudSuccess] = useState("");

  const categories = ["Abstract", "Dark Shading", "Fine Line", "Color"];

  // Helper to translate generic network/fetch failures into useful config errors
  const getFriendlyErrorMessage = useCallback((message: string) => {
    if (message === "Failed to fetch") {
      return "Failed to connect to the server. Please verify that your Node.js backend is running at http://localhost:5000 and MONGODB_URI is configured.";
    }
    return message;
  }, []);

  // Fetch Current Gallery Data from Database
  const fetchTattoos = useCallback(async () => {
    try {
      setTattoosLoading(true);
      const res = await fetch(`${API_URL}/api/tattoos`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to load tattoos.");
      }
      
      const data = await res.json();
      const mapped: WebTattoo[] = data.map((item: any) => ({
        id: item._id,
        src: `${API_URL}/api/tattoos/image/${item.imageFileId}`,
        alt: item.title,
        categories: item.category,
        imageFileId: item.imageFileId
      }));
      setTattoos(mapped);
    } catch (err: any) {
      setCrudError("Failed to fetch tattoos: " + getFriendlyErrorMessage(err.message));
    } finally {
      setTattoosLoading(false);
    }
  }, [getFriendlyErrorMessage]);

  // Handle Authentication Session State
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          setSession(data);
          setIsAdmin(data.role === "admin");
          fetchTattoos();
        } else {
          setSession(null);
          setIsAdmin(null);
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [fetchTattoos]);

  // Verify setup/reset tokens on landing page
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return;
      try {
        let endpoint = "";
        if (isSetupMode) {
          endpoint = `/api/auth/setup?token=${token}`;
        } else if (isResetMode) {
          endpoint = `/api/auth/reset-password?token=${token}`;
        } else {
          return;
        }

        const res = await fetch(`${API_URL}${endpoint}`);
        const data = await res.json();
        if (!res.ok) {
          setRecoveryError(data.message || "This link has expired or is invalid.");
        } else if (isSetupMode && data.email) {
          setEmail(data.email); // Auto-fill email for setup view
        }
      } catch (err) {
        setRecoveryError("Failed to connect to the server to verify the token link.");
      }
    };

    verifyToken();
  }, [isSetupMode, isResetMode, token]);

  // Auth Operations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthActionLoading(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed.");
      }

      setSession(data);
      setIsAdmin(data.role === "admin");
      fetchTattoos();
    } catch (err: any) {
      setAuthError(getFriendlyErrorMessage(err.message));
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthActionLoading(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit request.");
      
      setAuthSuccess("If an account exists for this email, password reset instructions have been sent.");
    } catch (err: any) {
      setAuthError(getFriendlyErrorMessage(err.message));
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthActionLoading(true);
    setAuthError("");
    setAuthSuccess("");

    if (newPassword !== confirmPassword) {
      setAuthError("Passwords do not match.");
      setAuthActionLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create password.");

      setAuthSuccess("Password created successfully. You can now log in.");
      setIsSetupMode(false);
      setNewPassword("");
      setConfirmPassword("");
      window.history.pushState({}, "", "/admin");
    } catch (err: any) {
      setAuthError(getFriendlyErrorMessage(err.message));
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthActionLoading(true);
    setAuthError("");
    setAuthSuccess("");

    if (newPassword !== confirmPassword) {
      setAuthError("Passwords do not match.");
      setAuthActionLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset password.");

      setAuthSuccess("Password reset successfully. You can now log in.");
      setIsResetMode(false);
      setNewPassword("");
      setConfirmPassword("");
      window.history.pushState({}, "", "/admin");
    } catch (err: any) {
      setAuthError(getFriendlyErrorMessage(err.message));
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthActionLoading(true);
    setAuthError("");
    setAuthSuccess("");

    if (newPassword !== confirmPassword) {
      setAuthError("New passwords do not match.");
      setAuthActionLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update password.");

      setAuthSuccess("Password updated successfully. Please log in again.");
      setSession(null);
      setIsAdmin(null);
      setTattoos([]);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setAuthError(getFriendlyErrorMessage(err.message));
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setSession(null);
      setIsAdmin(null);
      setTattoos([]);
      setForgotPasswordMode(false);
      window.history.pushState({}, "", "/admin");
    }
  };

  // Gallery CRUD Operations
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setCrudError("Please select an image file to upload.");
      return;
    }
    if (!altText.trim()) {
      setCrudError("Please provide a title for the tattoo.");
      return;
    }
    if (selectedCategories.length === 0) {
      setCrudError("Please select at least one style category.");
      return;
    }

    setUploadProgress(true);
    setCrudError("");
    setCrudSuccess("");

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("title", altText);
      formData.append("category", JSON.stringify(selectedCategories));

      const res = await fetch(`${API_URL}/api/tattoos`, {
        method: "POST",
        credentials: "include",
        body: formData
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to upload tattoo.");
      }

      setCrudSuccess("Tattoo uploaded successfully to GridFS!");
      setFile(null);
      setAltText("");
      setSelectedCategories([]);
      
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      fetchTattoos();
    } catch (err: any) {
      setCrudError(getFriendlyErrorMessage(err.message));
    } finally {
      setUploadProgress(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this tattoo and its GridFS image?")) {
      return;
    }

    setCrudError("");
    setCrudSuccess("");

    try {
      const res = await fetch(`${API_URL}/api/tattoos/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to delete tattoo.");

      setCrudSuccess("Tattoo deleted successfully.");
      fetchTattoos();
    } catch (err: any) {
      setCrudError("Failed to delete tattoo: " + getFriendlyErrorMessage(err.message));
    }
  };

  // Navigating back home helper
  const navigateHome = () => {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  // 1. LOADING SCREEN
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-light-gray uppercase tracking-widest text-xs font-semibold">
          Verifying Session...
        </p>
      </div>
    );
  }

  // 2. FIRST-TIME CLIENT SETUP VIEW
  if (isSetupMode && !recoveryError) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-dark">
        <div className="w-full max-w-md bg-dark-gray border border-white/5 p-8 rounded-lg relative">
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-primary/20 rounded-tr-lg" />
          
          <h2 className="text-3xl font-display font-extrabold text-white uppercase text-center tracking-wide mt-4 mb-6">
            Setup Password
          </h2>
          <p className="text-xs text-light-gray/60 uppercase tracking-widest text-center mb-6">
            Account Email: <span className="text-secondary font-bold">{email}</span>
          </p>

          <form onSubmit={handleSetupPassword} className="space-y-5">
            {authError && (
              <div className="flex items-center gap-2 p-4 bg-red-950/20 border border-red-500/30 rounded text-red-400 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-white/30" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-dark border border-white/10 rounded-md py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-white/30" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-dark border border-white/10 rounded-md py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authActionLoading}
              className="w-full py-3 bg-secondary text-white font-bold uppercase tracking-wider rounded-md hover:bg-secondary/80 focus:outline-none transition-all flex justify-center items-center gap-2 text-sm"
            >
              {authActionLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Save Password"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. RESET PASSWORD VIEW (FROM RESET EMAIL LINK)
  if (isResetMode && !recoveryError) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-dark">
        <div className="w-full max-w-md bg-dark-gray border border-white/5 p-8 rounded-lg relative">
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-primary/20 rounded-tr-lg" />
          
          <h2 className="text-3xl font-display font-extrabold text-white uppercase text-center tracking-wide mt-4 mb-6">
            New Password
          </h2>

          <form onSubmit={handleResetPassword} className="space-y-5">
            {authError && (
              <div className="flex items-center gap-2 p-4 bg-red-950/20 border border-red-500/30 rounded text-red-400 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-white/30" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-dark border border-white/10 rounded-md py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-white/30" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-dark border border-white/10 rounded-md py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authActionLoading}
              className="w-full py-3 bg-secondary text-white font-bold uppercase tracking-wider rounded-md hover:bg-secondary/80 focus:outline-none transition-all flex justify-center items-center gap-2 text-sm"
            >
              {authActionLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 4. UNAUTHORIZED / ACCESS DENIED VIEW
  if (session && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-dark">
        <div className="w-full max-w-md bg-dark-gray border border-red-500/30 p-8 rounded-lg relative text-center space-y-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-950/20 border border-red-500/40 text-red-500">
            <AlertCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-extrabold text-white uppercase tracking-wide">
              Access Denied
            </h2>
            <p className="text-light-gray/70 text-sm leading-relaxed">
              Authenticated user account is not registered in the studio administrators registry. Only the authorized KaprInk owner account can edit website assets.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleLogout}
              className="w-full py-3 border border-white/10 text-white rounded-md text-sm font-bold uppercase tracking-wider hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
            <button
              onClick={navigateHome}
              className="w-full py-3 bg-primary text-white rounded-md text-sm font-bold uppercase tracking-wider hover:neon-pink-border-glow transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Studio Site
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. NOT LOGGED IN / LOGIN FORM
  if (!session) {
    if (recoveryError) {
      return (
        <div className="flex items-center justify-center min-h-screen px-4 bg-dark">
          <div className="w-full max-w-md bg-dark-gray border border-red-500/30 p-8 rounded-lg relative text-center space-y-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-950/20 border border-red-500/40 text-red-500">
              <AlertCircle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-extrabold text-white uppercase tracking-wide">
                Link Expired
              </h2>
              <p className="text-light-gray/70 text-sm leading-relaxed">
                {recoveryError}
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => {
                  setForgotPasswordMode(true);
                  setRecoveryError(""); // Clear error to allow requesting new link
                  setIsSetupMode(false);
                  setIsResetMode(false);
                  setAuthError("");
                  setAuthSuccess("");
                }}
                className="w-full py-3 bg-primary text-white rounded-md text-sm font-bold uppercase tracking-wider hover:neon-pink-border-glow transition-all flex items-center justify-center gap-2"
              >
                Request New Reset Link
              </button>
              <button
                onClick={navigateHome}
                className="w-full py-3 border border-white/10 text-white rounded-md text-sm font-bold uppercase tracking-wider hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Studio Site
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-dark">
        <div className="w-full max-w-md bg-dark-gray border border-white/5 p-8 rounded-lg relative">
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-primary/20 rounded-tr-lg" />
          
          <button
            onClick={navigateHome}
            className="absolute top-6 left-6 text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1.5 uppercase tracking-widest font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </button>

          <h2 className="text-3xl font-display font-extrabold text-white uppercase text-center tracking-wide mt-8 mb-6">
            {forgotPasswordMode ? "Reset Password" : "Admin Login"}
          </h2>

          {forgotPasswordMode ? (
            // Forgot Password Form
            <form onSubmit={handleForgotPassword} className="space-y-5">
              {authError && (
                <div className="flex items-center gap-2 p-4 bg-red-950/20 border border-red-500/30 rounded text-red-400 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              {authSuccess && (
                <div className="flex items-center gap-2 p-4 bg-green-950/20 border border-green-500/30 rounded text-green-400 text-sm">
                  <Check className="h-5 w-5 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-white/30" />
                  <input
                    type="email"
                    required
                    placeholder="jordynnkaprink@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-dark border border-white/10 rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={authActionLoading}
                className="w-full py-3 bg-primary text-white font-bold uppercase tracking-wider rounded-md hover:neon-pink-border-glow focus:outline-none transition-all flex justify-center items-center gap-2 text-sm"
              >
                {authActionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Send Reset Instructions"
                )}
              </button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordMode(false);
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className="text-xs text-light-gray hover:text-white uppercase tracking-widest font-semibold transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            // Standard Login Form
            <form onSubmit={handleLogin} className="space-y-5">
              {authError && (
                <div className="flex items-center gap-2 p-4 bg-red-950/20 border border-red-500/30 rounded text-red-400 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              {authSuccess && (
                <div className="flex items-center gap-2 p-4 bg-green-950/20 border border-green-500/30 rounded text-green-400 text-sm">
                  <Check className="h-5 w-5 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-white/30" />
                  <input
                    type="email"
                    required
                    placeholder="jordynnkaprink@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-dark border border-white/10 rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordMode(true);
                      setAuthError("");
                      setAuthSuccess("");
                    }}
                    className="text-[10px] uppercase tracking-widest font-bold text-secondary hover:text-white transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-white/30" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-dark border border-white/10 rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={authActionLoading}
                className="w-full py-3 bg-primary text-white font-bold uppercase tracking-wider rounded-md hover:neon-pink-border-glow focus:outline-none transition-all flex justify-center items-center gap-2 text-sm"
              >
                {authActionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Access Portal"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 6. MAIN LOGGED-IN ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-dark py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-dark-gray border border-white/5 p-6 rounded-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 border-t border-r border-primary/10 rounded-tr-lg" />
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-extrabold text-white uppercase tracking-wide">
              KaprInk Dashboard
            </h1>
            <p className="text-xs text-light-gray/60 uppercase tracking-widest font-bold">
              Admin Session: <span className="text-primary">{session.email}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={navigateHome}
              className="px-4 py-2 border border-white/10 text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
            >
              View Site
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-950/20 border border-red-500/30 text-red-400 rounded text-xs font-bold uppercase tracking-widest hover:bg-red-950/40 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload Form & Settings */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Upload Section */}
            <div className="bg-dark-gray border border-white/5 p-6 rounded-lg space-y-6">
              <h2 className="text-xl font-display font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Upload New Tattoo
              </h2>
              
              <form onSubmit={handleUpload} className="space-y-5">
                {crudError && (
                  <div className="flex items-center gap-2 p-4 bg-red-950/20 border border-red-500/30 rounded text-red-400 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{crudError}</span>
                  </div>
                )}
                {crudSuccess && (
                  <div className="flex items-center gap-2 p-4 bg-green-950/20 border border-green-500/30 rounded text-green-400 text-sm">
                    <Check className="h-5 w-5 shrink-0" />
                    <span>{crudSuccess}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                    Tattoo Photograph
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    required
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full bg-dark border border-white/10 rounded-md p-3 text-white text-xs focus:outline-none focus:border-primary transition-colors file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:uppercase file:bg-white/10 file:text-white hover:file:bg-white/20 file:cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                    Tattoo Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fine line butterfly tattoo on forearm"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    className="w-full bg-dark border border-white/10 rounded-md py-3 px-4 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                    Style Categories
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryToggle(cat)}
                        className={`py-2 px-3 border rounded text-xs font-bold uppercase tracking-wider text-center transition-colors duration-300 ${
                          selectedCategories.includes(cat)
                            ? "bg-secondary/20 border-secondary text-secondary"
                            : "bg-dark border-white/10 text-light-gray/60 hover:border-white/30"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploadProgress}
                  className="w-full py-3 bg-primary text-white font-bold uppercase tracking-wider rounded-md hover:neon-pink-border-glow focus:outline-none transition-all flex justify-center items-center gap-2 text-sm"
                >
                  {uploadProgress ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add to Gallery
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Change Password settings block */}
            <div className="bg-dark-gray border border-white/5 p-6 rounded-lg space-y-6">
              <h2 className="text-xl font-display font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Key className="h-5 w-5 text-secondary" />
                Change Password
              </h2>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                {authError && (
                  <div className="flex items-center gap-2 p-4 bg-red-950/20 border border-red-500/30 rounded text-red-400 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}
                {authSuccess && (
                  <div className="flex items-center gap-2 p-4 bg-green-950/20 border border-green-500/30 rounded text-green-400 text-sm">
                    <Check className="h-5 w-5 shrink-0" />
                    <span>{authSuccess}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-dark border border-white/10 rounded-md py-2.5 px-4 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-dark border border-white/10 rounded-md py-2.5 px-4 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-dark border border-white/10 rounded-md py-2.5 px-4 text-white focus:outline-none focus:border-secondary transition-colors text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authActionLoading}
                  className="w-full py-2.5 bg-secondary text-white font-bold uppercase tracking-wider rounded-md hover:bg-secondary/80 focus:outline-none transition-colors flex justify-center items-center gap-2 text-xs"
                >
                  {authActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Update Password"
                  )}
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Manage Existing Items */}
          <div className="lg:col-span-7 bg-dark-gray border border-white/5 p-6 rounded-lg space-y-6">
            <h2 className="text-xl font-display font-extrabold text-white uppercase tracking-wider">
              Manage Tattoo Gallery
            </h2>

            {tattoosLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                <p className="text-light-gray/60 uppercase tracking-widest text-[10px]">Loading Gallery...</p>
              </div>
            ) : tattoos.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-lg p-12 text-center">
                <p className="text-light-gray/50 uppercase tracking-widest text-xs font-semibold">
                  No uploads found in MongoDB database.
                </p>
                <p className="text-light-gray/30 text-[10px] mt-1 leading-relaxed">
                  Your public site is currently displaying fallback local static images. Once you upload your first image here, the gallery will transition to display your dynamic MongoDB GridFS data!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto pr-2">
                {tattoos.map((item) => (
                  <div key={item.id} className="group relative aspect-[3/4] bg-dark rounded border border-white/5 overflow-hidden">
                    <img
                      src={item.src}
                      alt={item.alt}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-dark/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          title="Delete Tattoo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {item.categories.map((c: string) => (
                            <span key={c} className="text-[7px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 px-1 rounded">
                              {c}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-white font-sans line-clamp-2 leading-tight">
                          {item.alt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
