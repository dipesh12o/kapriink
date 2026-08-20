import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
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

// Helper function outside component scope to satisfy purity rules
function generateFileName(fileExt: string) {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
}

export default function AdminPortal() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isResetMode, setIsResetMode] = useState(() => 
    window.location.hash.includes("access_token=") && window.location.hash.includes("type=recovery")
  );
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [authActionLoading, setAuthActionLoading] = useState(false);

  // Password Management
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // CRUD State
  const [tattoos, setTattoos] = useState<any[]>([]);
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
      return "Failed to connect to Supabase. Please verify that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correctly configured in your local .env file.";
    }
    return message;
  }, []);

  // Fetch Current Gallery Data from Database (defined before useEffect to avoid initialization warnings)
  const fetchTattoos = useCallback(async () => {
    try {
      setTattoosLoading(true);
      const { data, error } = await supabase
        .from("tattoos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTattoos(data || []);
    } catch (err: any) {
      setCrudError("Failed to fetch tattoos: " + getFriendlyErrorMessage(err.message));
    } finally {
      setTattoosLoading(false);
      setLoading(false);
    }
  }, [getFriendlyErrorMessage]);

  // Check if UID is authorized in the public.admins table (defined before useEffect to avoid initialization warnings)
  const checkAdminStatus = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("admins")
        .select("id")
        .eq("id", uid)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setIsAdmin(true);
        fetchTattoos();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Admin verification error:", err.message);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [fetchTattoos]);

  // Handle Authentication Session State
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAdminStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen to Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }

      if (event === "PASSWORD_RECOVERY") {
        setIsResetMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAdminStatus]);

  // Auth Operations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthActionLoading(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(getFriendlyErrorMessage(err.message));
      setAuthActionLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthActionLoading(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${import.meta.env.VITE_APP_URL || window.location.origin}/admin`,
      });
      if (error) throw error;
      setAuthSuccess("Password reset instructions sent to your email.");
    } catch (err: any) {
      setAuthError(getFriendlyErrorMessage(err.message));
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setAuthSuccess("Password updated successfully.");
      setIsResetMode(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setAuthError(getFriendlyErrorMessage(err.message));
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTattoos([]);
    setIsAdmin(null);
    window.location.hash = ""; // Clear hash arguments
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
      setCrudError("Please provide descriptive alt text for accessibility.");
      return;
    }
    if (selectedCategories.length === 0) {
      setCrudError("Please select at least one tattoo style category.");
      return;
    }

    setUploadProgress(true);
    setCrudError("");
    setCrudSuccess("");

    try {
      const fileExt = file.name.split(".").pop() || "";
      const fileName = generateFileName(fileExt);
      const filePath = `uploads/${fileName}`;

      // 1. Upload to Supabase Storage Bucket
      const { error: storageError } = await supabase.storage
        .from("tattoos")
        .upload(filePath, file);

      if (storageError) throw storageError;

      // 2. Fetch the Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("tattoos")
        .getPublicUrl(filePath);

      // 3. Save Metadata to Database Table
      const { error: dbError } = await supabase
        .from("tattoos")
        .insert({
          src: publicUrl,
          alt: altText,
          categories: selectedCategories,
          image_path: filePath
        });

      if (dbError) {
        // Cleanup storage file if database save fails
        await supabase.storage.from("tattoos").remove([filePath]);
        throw dbError;
      }

      setCrudSuccess("Tattoo uploaded successfully!");
      setFile(null);
      setAltText("");
      setSelectedCategories([]);
      
      // Reset input element
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      fetchTattoos();
    } catch (err: any) {
      setCrudError(getFriendlyErrorMessage(err.message));
    } finally {
      setUploadProgress(false);
    }
  };

  const handleDelete = async (id: string, imagePath: string) => {
    if (!confirm("Are you sure you want to permanently delete this tattoo from the database and storage?")) {
      return;
    }

    setCrudError("");
    setCrudSuccess("");

    try {
      // 1. Delete from Database
      const { error: dbError } = await supabase
        .from("tattoos")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      // 2. Delete from Storage
      if (imagePath) {
        const { error: storageError } = await supabase.storage
          .from("tattoos")
          .remove([imagePath]);
        
        if (storageError) {
          console.warn("Storage deletion warning:", storageError.message);
        }
      }

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

  // RENDER BLOCKS
  
  // 1. LOADING SCREEN
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-light-gray tracking-wider uppercase text-xs">Verifying Access...</p>
      </div>
    );
  }

  // 2. RECOVERY / RESET PASSWORD SCREEN
  if (isResetMode) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-dark">
        <div className="w-full max-w-md bg-dark-gray border border-white/5 p-8 rounded-lg relative">
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-primary/20 rounded-tr-lg" />
          <h2 className="text-3xl font-display font-extrabold text-white uppercase mb-6 tracking-wide text-center">
            Set New Password
          </h2>
          <form onSubmit={handleUpdatePassword} className="space-y-5">
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
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-white/30" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-dark border border-white/10 rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest font-bold text-white/50 block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-white/30" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                "Update Password"
              )}
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsResetMode(false)}
                className="text-xs text-light-gray hover:text-white uppercase tracking-widest font-semibold transition-colors"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 3. UNAUTHORIZED / WRONG ACCOUNT VIEW
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

  // 4. NOT LOGGED IN / LOGIN FORM
  if (!session) {
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

  // 5. MAIN LOGGED-IN ADMIN DASHBOARD
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
              Admin Session: <span className="text-primary">{session.user.email}</span>
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
                    Alt Text (Accessibility & SEO)
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
              
              <form onSubmit={handleUpdatePassword} className="space-y-4">
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
                    Confirm Password
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
                  No uploads found in Supabase database.
                </p>
                <p className="text-light-gray/30 text-[10px] mt-1 leading-relaxed">
                  The public site is currently displaying fallback local static images. Once you upload your first image here, the gallery will transition to display your dynamic Supabase data!
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
                          onClick={() => handleDelete(item.id, item.image_path)}
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
