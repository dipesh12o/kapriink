const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Admin = require("../models/Admin");

// Helper to hash token
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Nodemailer transport creation helper
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!admin.isActive) {
      return res.status(401).json({ message: "Account is disabled." });
    }

    if (!admin.passwordHash) {
      return res.status(400).json({ 
        message: "First-time account setup is required. Please use the setup link provided by your administrator." 
      });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin._id, tokenVersion: admin.tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Set cookie
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      id: admin._id,
      email: admin.email,
      role: admin.role,
      token
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server error during login." });
  }
};

const logout = async (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully." });
};

const getMe = async (req, res) => {
  res.json({
    id: req.user._id,
    email: req.user.email,
    role: req.user.role
  });
};

const verifySetupToken = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: "Token is required." });

  try {
    const hashed = hashToken(token);
    const admin = await Admin.findOne({
      setupTokenHash: hashed,
      setupTokenExpiry: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ message: "This setup link is invalid or has expired." });
    }

    res.json({ message: "Token verified successfully.", email: admin.email });
  } catch (error) {
    res.status(500).json({ message: "Server error during token verification." });
  }
};

const setupPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Token and password are required." });
  }

  try {
    const hashedToken = hashToken(token);
    const admin = await Admin.findOne({
      setupTokenHash: hashedToken,
      setupTokenExpiry: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ message: "This setup link has expired or is invalid." });
    }

    // Set new password hash
    admin.passwordHash = await bcrypt.hash(password, 12);
    admin.setupTokenHash = null;
    admin.setupTokenExpiry = null;
    
    // Invalidate any other active credentials
    admin.tokenVersion += 1;

    await admin.save();
    res.json({ message: "Password created successfully. You can now log in." });
  } catch (error) {
    console.error("Setup password error:", error.message);
    res.status(500).json({ message: "Server error during password creation." });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const genericResponse = { message: "If an account exists for this email, password reset instructions have been sent." };

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      // Prevent user enumeration by sending success response
      return res.json(genericResponse);
    }

    // Generate recovery token
    const token = crypto.randomBytes(32).toString("hex");
    admin.resetTokenHash = hashToken(token);
    admin.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

    await admin.save();

    // Send email
    const resetUrl = `${process.env.CLIENT_URL}/admin/reset-password?token=${token}`;
    const transporter = getTransporter();

    const mailOptions = {
      from: `"KaprInk Tattoo Studio" <${process.env.EMAIL_USER}>`,
      to: admin.email,
      subject: "KaprInk Admin Portal Password Reset Request",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested to reset your password for the KaprInk Admin Portal.</p>
          <p>Please click the button below to choose a new password. This link is valid for 1 hour and can only be used once.</p>
          <div style="margin: 25px 0;">
            <a href="${resetUrl}" style="background-color: #e02424; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #777; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 11px;">If the button above does not work, copy and paste this URL into your browser:</p>
          <p style="color: #999; font-size: 11px; word-break: break-all;">${resetUrl}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json(genericResponse);
  } catch (error) {
    console.error("Forgot password error:", error.message);
    // Return success to hide errors/prevent user harvesting
    res.json(genericResponse);
  }
};

const verifyResetToken = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: "Token is required." });

  try {
    const hashed = hashToken(token);
    const admin = await Admin.findOne({
      resetTokenHash: hashed,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ message: "This password reset link is invalid or has expired." });
    }

    res.json({ message: "Token verified successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error during token verification." });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Token and password are required." });
  }

  try {
    const hashedToken = hashToken(token);
    const admin = await Admin.findOne({
      resetTokenHash: hashedToken,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ message: "This password reset link has expired or is invalid." });
    }

    // Set new password hash
    admin.passwordHash = await bcrypt.hash(password, 12);
    admin.resetTokenHash = null;
    admin.resetTokenExpiry = null;
    
    // Invalidate existing sessions
    admin.tokenVersion += 1;

    await admin.save();
    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({ message: "Server error during password reset." });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current password and new password are required." });
  }

  try {
    const admin = await Admin.findById(req.user._id);
    
    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Invalidate all other active sessions
    admin.tokenVersion += 1;

    await admin.save();

    // Clear the current token to force re-login with new password
    res.clearCookie("token");
    res.json({ message: "Password updated successfully. Please log in again." });
  } catch (error) {
    console.error("Change password error:", error.message);
    res.status(500).json({ message: "Server error during password change." });
  }
};

module.exports = {
  login,
  logout,
  getMe,
  verifySetupToken,
  setupPassword,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword
};
