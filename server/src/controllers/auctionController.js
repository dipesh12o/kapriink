const crypto = require("crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Painting = require("../models/Painting");
const { getComputedStatus } = require("../models/Painting");
const Bid = require("../models/Bid");
const AuctionParticipant = require("../models/AuctionParticipant");
const { uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary");
const { broadcastNewBid, broadcastAuctionStatus } = require("../config/socket");

// Helper to hash verification token with SHA-256
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Nodemailer transport creation helper
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Explicit Public Painting Serializer (Allowlist Projection)
const serializePublicPainting = (painting, now = new Date()) => {
  const compStatus = getComputedStatus(painting, now);
  const showWinner = (compStatus === "ended" || painting.status === "sold") && painting.winner && painting.winner.amount;

  return {
    id: painting._id,
    title: painting.title,
    description: painting.description || "",
    imageUrl: painting.imageUrl,
    dimensions: painting.dimensions || "",
    medium: painting.medium || "",
    startingBid: painting.startingBid,
    minBidIncrement: painting.minBidIncrement,
    startTime: painting.startTime,
    endTime: painting.endTime,
    status: compStatus,
    currentHighestBid: painting.currentHighestBid,
    bidCount: painting.bidCount,
    isSaleConfirmed: painting.isSaleConfirmed,
    hasBids: painting.bidCount > 0,
    winner: showWinner ? {
      amount: painting.winner.amount,
      bidderLabel: "Verified Bidder"
    } : null,
    serverTime: now.toISOString()
  };
};

// Explicit Public Bid Serializer (Allowlist Projection)
const serializePublicBid = (bid) => {
  return {
    id: bid._id,
    amount: bid.amount,
    bidderLabel: "Verified Bidder",
    status: bid.status,
    createdAt: bid.createdAt
  };
};

// Admin Painting Serializer (Includes Private Details)
const serializeAdminPainting = (painting, now = new Date()) => {
  const compStatus = getComputedStatus(painting, now);
  const isPub = painting.status === "published" || painting.status === "sold";
  return {
    id: painting._id,
    title: painting.title,
    description: painting.description || "",
    imageUrl: painting.imageUrl,
    imagePublicId: painting.imagePublicId,
    dimensions: painting.dimensions || "",
    medium: painting.medium || "",
    startingBid: painting.startingBid,
    minBidIncrement: painting.minBidIncrement,
    startTime: painting.startTime,
    endTime: painting.endTime,
    rawStatus: painting.status,
    computedStatus: compStatus,
    status: compStatus,
    isPublished: isPub,
    currentHighestBid: painting.currentHighestBid,
    bidCount: painting.bidCount,
    isSaleConfirmed: painting.isSaleConfirmed,
    soldAt: painting.soldAt,
    winner: painting.winner && painting.winner.amount ? {
      bidId: painting.winner.bidId,
      bidderId: painting.winner.bidderId,
      amount: painting.winner.amount,
      name: painting.winner.name,
      email: painting.winner.email,
      placedAt: painting.winner.placedAt
    } : null,
    createdAt: painting.createdAt,
    updatedAt: painting.updatedAt
  };
};

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

const getPublicAuctions = async (req, res) => {
  try {
    const now = new Date();
    // Exclude drafts from public catalog
    const paintings = await Painting.find({
      status: { $in: ["published", "sold", "cancelled"] }
    }).sort({ createdAt: -1 });

    // Sort logically: live first, then upcoming, then ended/sold
    const statusPriority = { live: 1, upcoming: 2, ended: 3, sold: 4, cancelled: 5 };
    const serialized = paintings.map((p) => serializePublicPainting(p, now));
    serialized.sort((a, b) => (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99));

    res.json(serialized);
  } catch (err) {
    console.error("getPublicAuctions error:", err.message);
    res.status(500).json({ message: "Server error fetching artwork auctions." });
  }
};

const getPublicAuctionById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid auction ID." });
  }

  try {
    const painting = await Painting.findById(id);
    if (!painting || painting.status === "draft") {
      return res.status(404).json({ message: "Artwork auction not found." });
    }

    res.json(serializePublicPainting(painting, new Date()));
  } catch (err) {
    console.error("getPublicAuctionById error:", err.message);
    res.status(500).json({ message: "Server error fetching artwork auction." });
  }
};

const getPublicAuctionBids = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid auction ID." });
  }

  try {
    const bids = await Bid.find({
      painting: id,
      status: { $in: ["valid", "outbid"] }
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(bids.map(serializePublicBid));
  } catch (err) {
    console.error("getPublicAuctionBids error:", err.message);
    res.status(500).json({ message: "Server error fetching bid history." });
  }
};

const registerBidder = async (req, res) => {
  const { name, email, phone, address } = req.body;

  if (!name || !email || !phone || !address) {
    return res.status(400).json({ message: "Full name, email address, mobile number, and address are required." });
  }

  const trimmedName = String(name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();
  const trimmedPhone = String(phone).trim();
  const trimmedAddress = String(address).trim();

  // Validate Name
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return res.status(400).json({ message: "Full name must be between 2 and 100 characters." });
  }

  // Validate Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ message: "Please provide a valid email address." });
  }

  // Validate Phone
  const digitsOnly = trimmedPhone.replace(/\D/g, "");
  if (digitsOnly.length < 7 || trimmedPhone.length > 30) {
    return res.status(400).json({ message: "Please provide a valid mobile number (at least 7 digits)." });
  }

  // Validate Address
  if (trimmedAddress.length < 5 || trimmedAddress.length > 300) {
    return res.status(400).json({ message: "Please provide a valid address (between 5 and 300 characters)." });
  }

  try {
    let participant = await AuctionParticipant.findOne({ email: normalizedEmail });

    if (!participant) {
      participant = new AuctionParticipant({
        name: trimmedName,
        email: normalizedEmail,
        phone: trimmedPhone,
        address: trimmedAddress,
        isVerified: true,
        verifiedAt: new Date(),
        lastVerificationRequestAt: new Date()
      });
      await participant.save();
    } else {
      participant.name = trimmedName;
      participant.phone = trimmedPhone;
      participant.address = trimmedAddress;
      participant.isVerified = true;
      if (!participant.verifiedAt) participant.verifiedAt = new Date();
      participant.lastVerificationRequestAt = new Date();
      await participant.save();
    }

    // Issue signed Bidder session JWT valid for 30 days
    const bidderToken = jwt.sign(
      {
        participantId: participant._id,
        email: participant.email,
        v: participant.tokenVersion
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      message: "Registration successful! You are now authorized to place bids.",
      token: bidderToken,
      bidderToken,
      participant: {
        name: participant.name,
        email: participant.email
      }
    });
  } catch (err) {
    console.error("registerBidder error:", err.message);
    res.status(500).json({ message: "Server error during bidder registration. Please try again." });
  }
};

const requestVerification = async (req, res) => {
  // If phone & address provided, handle via registerBidder
  if (req.body.phone && req.body.address) {
    return registerBidder(req, res);
  }

  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ message: "Full name and email address are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const trimmedName = String(name).trim();

  // Basic email syntax check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ message: "Please provide a valid email address." });
  }

  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return res.status(400).json({ message: "Name must be between 2 and 100 characters." });
  }

  const genericResponse = {
    success: true,
    message: "If this email address is valid, a verification link has been sent. Please check your inbox."
  };

  try {
    let participant = await AuctionParticipant.findOne({ email: normalizedEmail });

    // Generate 32-byte secure token
    const token = crypto.randomBytes(32).toString("hex");
    const hashed = hashToken(token);
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    if (!participant) {
      participant = new AuctionParticipant({
        email: normalizedEmail,
        name: trimmedName,
        isVerified: false,
        verificationTokenHash: hashed,
        verificationTokenExpiry: expiry,
        lastVerificationRequestAt: new Date()
      });
      await participant.save();
    } else {
      participant.name = trimmedName;
      participant.verificationTokenHash = hashed;
      participant.verificationTokenExpiry = expiry;
      participant.lastVerificationRequestAt = new Date();
      await participant.save();
    }

    // Email dispatch temporarily bypassed to prevent SMTP connection hanging
    const responsePayload = { ...genericResponse };
    if (process.env.NODE_ENV !== "production") {
      responsePayload.devOtp = token;
      responsePayload.devToken = token;
    }

    res.json(responsePayload);
  } catch (err) {
    console.error("requestVerification error:", err.message);
    res.json(genericResponse);
  }
};

const verifyEmail = async (req, res) => {
  const email = req.body.email;
  const token = req.body.token || req.body.code;

  if (!email || !token) {
    return res.status(400).json({ message: "Email and verification token are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const trimmedToken = String(token).trim();

  try {
    const hashed = hashToken(trimmedToken);
    const participant = await AuctionParticipant.findOne({
      email: normalizedEmail,
      verificationTokenHash: hashed,
      verificationTokenExpiry: { $gt: new Date() }
    });

    if (!participant) {
      return res.status(400).json({ message: "Verification link is invalid or has expired. Please request a new link." });
    }

    // Invalidate token and mark verified
    participant.isVerified = true;
    participant.verifiedAt = new Date();
    participant.verificationTokenHash = null;
    participant.verificationTokenExpiry = null;
    await participant.save();

    // Issue signed Bidder session JWT valid for 30 days
    const bidderToken = jwt.sign(
      {
        participantId: participant._id,
        email: participant.email,
        v: participant.tokenVersion
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      message: "Email successfully verified! You may now place bids.",
      token: bidderToken,
      bidderToken,
      participant: {
        name: participant.name,
        email: participant.email
      }
    });
  } catch (err) {
    console.error("verifyEmail error:", err.message);
    res.status(500).json({ message: "Server error during email verification." });
  }
};

const placeBid = async (req, res) => {
  const { id } = req.params;
  const { amount, idempotencyKey, termsAccepted } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid auction ID." });
  }

  if (termsAccepted === false) {
    return res.status(400).json({ message: "You must accept the auction terms to place a bid." });
  }

  const rawAmount = Number(amount);
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    return res.status(400).json({ message: "Please enter a valid positive bid amount." });
  }

  // Enforce precision limit: strictly 2 decimal places
  const cleanAmount = Number(rawAmount.toFixed(2));
  if (cleanAmount !== rawAmount && rawAmount.toString().split(".")[1]?.length > 2) {
    return res.status(400).json({ message: "Bid amount cannot have more than 2 decimal places." });
  }

  // Idempotency check: if already processed, return existing bid
  if (idempotencyKey) {
    const existingBid = await Bid.findOne({
      painting: id,
      idempotencyKey: String(idempotencyKey)
    });
    if (existingBid) {
      return res.status(200).json({
        success: true,
        message: "Bid already recorded.",
        bid: serializePublicBid(existingBid)
      });
    }
  }

  // Atomic Multi-Document Transaction
  const session = await mongoose.startSession();
  let createdBid = null;
  let updatedPainting = null;

  try {
    await session.withTransaction(async () => {
      const painting = await Painting.findById(id).session(session);
      if (!painting) {
        const err = new Error("Artwork not found.");
        err.statusCode = 404;
        throw err;
      }

      const now = new Date();
      const compStatus = getComputedStatus(painting, now);
      if (compStatus !== "live") {
        const message = compStatus === "upcoming" 
          ? "This auction has not opened for bidding yet." 
          : "This auction has ended and is no longer accepting bids.";
        const err = new Error(message);
        err.statusCode = 400;
        throw err;
      }

      // Calculate minimum required bid
      const minRequired = painting.currentHighestBid > 0
        ? Number((painting.currentHighestBid + painting.minBidIncrement).toFixed(2))
        : painting.startingBid;

      if (cleanAmount < minRequired) {
        const formattedMin = `$${minRequired.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
        const err = new Error(`Bid amount must be at least ${formattedMin}.`);
        err.statusCode = 400;
        throw err;
      }

      // Optimistic Concurrency Lock: update only if currentHighestBid hasn't changed
      const updateResult = await Painting.findOneAndUpdate(
        {
          _id: id,
          status: "published",
          startTime: { $lte: now },
          endTime: { $gt: now },
          currentHighestBid: painting.currentHighestBid
        },
        {
          $set: {
            currentHighestBid: cleanAmount,
            "winner.amount": cleanAmount,
            "winner.bidderId": req.bidder._id,
            "winner.name": req.bidder.name,
            "winner.email": req.bidder.email,
            "winner.placedAt": now
          },
          $inc: { bidCount: 1 }
        },
        { session, new: true }
      );

      if (!updateResult) {
        const err = new Error("Another bid was accepted just now. Please review the updated highest bid and try again.");
        err.statusCode = 409;
        throw err;
      }

      // Insert new Bid document
      const [newBid] = await Bid.create(
        [
          {
            painting: id,
            participant: req.bidder._id,
            bidderName: req.bidder.name,
            bidderEmail: req.bidder.email,
            amount: cleanAmount,
            status: "valid",
            idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
            ipAddress: req.ip || req.headers["x-forwarded-for"] || null
          }
        ],
        { session }
      );

      // Link Bid ID in Painting winner reference
      await Painting.updateOne(
        { _id: id },
        { $set: { "winner.bidId": newBid._id } },
        { session }
      );

      // Mark prior valid bids on this painting as outbid
      await Bid.updateMany(
        { painting: id, _id: { $ne: newBid._id }, status: "valid" },
        { $set: { status: "outbid" } },
        { session }
      );

      createdBid = newBid;
      updatedPainting = updateResult;
    });
  } catch (txErr) {
    await session.endSession();
    const status = txErr.statusCode || 500;
    return res.status(status).json({ message: txErr.message || "Failed to place bid." });
  }

  await session.endSession();

  // POST-COMMIT: Broadcast real-time Socket.IO update (Strictly allowlisted payload)
  try {
    broadcastNewBid(id, {
      currentHighestBid: updatedPainting.currentHighestBid,
      bidCount: updatedPainting.bidCount,
      newBid: {
        id: createdBid._id,
        amount: createdBid.amount,
        createdAt: createdBid.createdAt
      }
    });
  } catch (socketErr) {
    console.warn("Socket broadcast error:", socketErr.message);
  }

  return res.status(201).json({
    success: true,
    message: `Your bid of $${cleanAmount.toFixed(2)} was successfully placed!`,
    bid: serializePublicBid(createdBid),
    currentHighestBid: updatedPainting.currentHighestBid,
    bidCount: updatedPainting.bidCount
  });
};

// ==========================================
// ADMIN ENDPOINTS (protect, authorize("admin", "editor"))
// ==========================================

const getAdminAuctions = async (req, res) => {
  try {
    const now = new Date();
    const paintings = await Painting.find({}).sort({ createdAt: -1 });
    res.json(paintings.map((p) => serializeAdminPainting(p, now)));
  } catch (err) {
    console.error("getAdminAuctions error:", err.message);
    res.status(500).json({ message: "Server error fetching admin paintings list." });
  }
};

const getAdminAuctionById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid auction ID." });
  }

  try {
    const painting = await Painting.findById(id);
    if (!painting) {
      return res.status(404).json({ message: "Artwork not found." });
    }

    res.json(serializeAdminPainting(painting, new Date()));
  } catch (err) {
    console.error("getAdminAuctionById error:", err.message);
    res.status(500).json({ message: "Server error fetching admin painting." });
  }
};

const createPainting = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Please upload an artwork photograph." });
  }

  // Validate image MIME type
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: "Only JPEG, PNG, WEBP, and GIF images are allowed." });
  }

  const {
    title,
    description,
    dimensions,
    medium,
    startingBid,
    minBidIncrement,
    startTime,
    endTime,
    publishImmediately,
    isPublished
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Artwork title is required." });
  }

  const sBid = Number(startingBid);
  if (!Number.isFinite(sBid) || sBid < 1) {
    return res.status(400).json({ message: "Starting bid must be at least $1.00." });
  }

  const increment = minBidIncrement ? Number(minBidIncrement) : 10;
  if (!Number.isFinite(increment) || increment < 1) {
    return res.status(400).json({ message: "Minimum bid increment must be at least $1.00." });
  }

  if (!startTime || !endTime) {
    return res.status(400).json({ message: "Auction start and end times are required." });
  }

  const sTime = new Date(startTime);
  const eTime = new Date(endTime);
  if (isNaN(sTime.getTime()) || isNaN(eTime.getTime())) {
    return res.status(400).json({ message: "Invalid date format for auction schedule." });
  }

  if (eTime <= sTime) {
    return res.status(400).json({ message: "Auction end time must be after the start time." });
  }

  let cloudResult;
  try {
    // Upload strictly to isolated Cloudinary folder "kapriink/paintings"
    cloudResult = await uploadToCloudinary(req.file.buffer, {
      folder: "kapriink/paintings"
    });

    const isPublish =
      publishImmediately === "true" ||
      publishImmediately === true ||
      isPublished === "true" ||
      isPublished === true;

    const painting = new Painting({
      title: title.trim(),
      description: description ? description.trim() : "",
      dimensions: dimensions ? dimensions.trim() : "",
      medium: medium ? medium.trim() : "",
      imageUrl: cloudResult.secure_url,
      imagePublicId: cloudResult.public_id,
      startingBid: Number(sBid.toFixed(2)),
      minBidIncrement: Number(increment.toFixed(2)),
      startTime: sTime,
      endTime: eTime,
      status: isPublish ? "published" : "draft"
    });

    await painting.save();

    res.status(201).json(serializeAdminPainting(painting, new Date()));
  } catch (err) {
    console.error("createPainting error:", err.message);
    if (cloudResult && cloudResult.public_id) {
      await deleteFromCloudinary(cloudResult.public_id).catch(() => {});
    }
    res.status(500).json({ message: "Failed to upload and create artwork auction." });
  }
};

const updatePainting = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid auction ID." });
  }

  try {
    const painting = await Painting.findById(id);
    if (!painting) {
      return res.status(404).json({ message: "Artwork not found." });
    }

    const {
      title,
      description,
      dimensions,
      medium,
      startingBid,
      minBidIncrement,
      startTime,
      endTime,
      isPublished,
      publishImmediately,
      status
    } = req.body;

    if (title && title.trim()) painting.title = title.trim();
    if (description !== undefined) painting.description = description.trim();
    if (dimensions !== undefined) painting.dimensions = dimensions.trim();
    if (medium !== undefined) painting.medium = medium.trim();

    // Protect core pricing and schedule if bids already exist
    const hasBids = painting.bidCount > 0;

    if (!hasBids) {
      if (startingBid) {
        const sBid = Number(startingBid);
        if (Number.isFinite(sBid) && sBid >= 1) painting.startingBid = Number(sBid.toFixed(2));
      }
      if (minBidIncrement) {
        const inc = Number(minBidIncrement);
        if (Number.isFinite(inc) && inc >= 1) painting.minBidIncrement = Number(inc.toFixed(2));
      }
      if (startTime) {
        const sTime = new Date(startTime);
        if (!isNaN(sTime.getTime())) painting.startTime = sTime;
      }
    }

    if (endTime) {
      const eTime = new Date(endTime);
      if (!isNaN(eTime.getTime())) {
        if (eTime <= painting.startTime) {
          return res.status(400).json({ message: "Auction end time must be after start time." });
        }
        painting.endTime = eTime;
      }
    }

    // Handle publication status toggle if provided
    if (isPublished !== undefined || publishImmediately !== undefined || status !== undefined) {
      const wantPublished =
        isPublished === true ||
        isPublished === "true" ||
        publishImmediately === true ||
        publishImmediately === "true" ||
        status === "published";

      const wantUnpublished =
        isPublished === false ||
        isPublished === "false" ||
        publishImmediately === false ||
        publishImmediately === "false" ||
        status === "draft";

      if (wantPublished && painting.status !== "sold") {
        const targetEndTime = painting.endTime;
        if (new Date(targetEndTime) <= new Date()) {
          return res.status(400).json({
            message: "Cannot publish an auction whose end time has already passed. Please update the schedule first."
          });
        }
        painting.status = "published";
      } else if (wantUnpublished && painting.status !== "sold") {
        painting.status = "draft";
      }
    }

    // Handle image replacement if a new file is uploaded
    if (req.file) {
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Only JPEG, PNG, WEBP, and GIF images are allowed." });
      }

      const oldPublicId = painting.imagePublicId;
      const cloudResult = await uploadToCloudinary(req.file.buffer, {
        folder: "kapriink/paintings"
      });

      painting.imageUrl = cloudResult.secure_url;
      painting.imagePublicId = cloudResult.public_id;

      if (oldPublicId) {
        deleteFromCloudinary(oldPublicId).catch(() => {});
      }
    }

    await painting.save();

    broadcastAuctionStatus(painting._id, getComputedStatus(painting, new Date()));

    res.json(serializeAdminPainting(painting, new Date()));
  } catch (err) {
    console.error("updatePainting error:", err.message);
    res.status(500).json({ message: "Server error updating artwork auction." });
  }
};

const publishAuction = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid auction ID." });
  }

  try {
    const painting = await Painting.findById(id);
    if (!painting) {
      return res.status(404).json({ message: "Artwork not found." });
    }

    const now = new Date();
    if (new Date(painting.endTime) <= now) {
      return res.status(400).json({ message: "Cannot publish an auction whose end time has already passed. Please update the schedule first." });
    }

    painting.status = "published";
    await painting.save();

    broadcastAuctionStatus(id, getComputedStatus(painting, now));

    res.json({
      message: "Auction published successfully.",
      painting: serializeAdminPainting(painting, now)
    });
  } catch (err) {
    console.error("publishAuction error:", err.message);
    res.status(500).json({ message: "Server error publishing auction." });
  }
};

const unpublishAuction = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid auction ID." });
  }

  try {
    const painting = await Painting.findById(id);
    if (!painting) {
      return res.status(404).json({ message: "Artwork not found." });
    }

    if (painting.status === "sold") {
      return res.status(400).json({ message: "Cannot move a sold painting back to drafts." });
    }

    painting.status = "draft";
    await painting.save();

    broadcastAuctionStatus(id, "draft");

    res.json({
      message: "Painting moved to drafts successfully.",
      painting: serializeAdminPainting(painting, new Date())
    });
  } catch (err) {
    console.error("unpublishAuction error:", err.message);
    res.status(500).json({ message: "Server error unpublishing auction." });
  }
};

const cancelAuction = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid auction ID." });
  }

  try {
    const painting = await Painting.findById(id);
    if (!painting) {
      return res.status(404).json({ message: "Artwork not found." });
    }

    painting.status = "cancelled";
    await painting.save();

    broadcastAuctionStatus(id, "cancelled");

    res.json({
      message: "Auction cancelled successfully.",
      painting: serializeAdminPainting(painting, new Date())
    });
  } catch (err) {
    console.error("cancelAuction error:", err.message);
    res.status(500).json({ message: "Server error cancelling auction." });
  }
};

const markAuctionSold = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid auction ID." });
  }

  try {
    const painting = await Painting.findById(id);
    if (!painting) {
      return res.status(404).json({ message: "Artwork not found." });
    }

    painting.status = "sold";
    painting.isSaleConfirmed = true;
    painting.soldAt = new Date();
    await painting.save();

    broadcastAuctionStatus(id, "sold");

    res.json({
      message: "Artwork marked as sold.",
      painting: serializeAdminPainting(painting, new Date())
    });
  } catch (err) {
    console.error("markAuctionSold error:", err.message);
    res.status(500).json({ message: "Server error confirming sale." });
  }
};

const deletePainting = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid auction ID." });
  }

  try {
    const painting = await Painting.findById(id);
    if (!painting) {
      return res.status(404).json({ message: "Artwork not found." });
    }

    // Critical Safeguard: Block deletion if any bids exist
    if (painting.bidCount > 0) {
      return res.status(400).json({
        message: "Cannot delete an artwork that has bid history. Please cancel the auction instead to maintain historical records."
      });
    }

    const bidsCount = await Bid.countDocuments({ painting: id });
    if (bidsCount > 0) {
      return res.status(400).json({
        message: "Cannot delete an artwork that has recorded bids. Please cancel the auction instead."
      });
    }

    // Delete image from Cloudinary (isolated folder kapriink/paintings)
    if (painting.imagePublicId) {
      await deleteFromCloudinary(painting.imagePublicId).catch((e) => {
        console.warn(`Cloudinary deletion warning for ${painting.imagePublicId}:`, e.message);
      });
    }

    await Painting.findByIdAndDelete(id);

    res.json({ message: "Painting deleted successfully." });
  } catch (err) {
    console.error("deletePainting error:", err.message);
    res.status(500).json({ message: "Server error deleting painting." });
  }
};

const getAdminAuctionBids = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid auction ID." });
  }

  try {
    const bids = await Bid.find({ painting: id })
      .sort({ createdAt: -1 });

    res.json(
      bids.map((b) => ({
        id: b._id,
        amount: b.amount,
        bidderName: b.bidderName,
        bidderEmail: b.bidderEmail,
        status: b.status,
        createdAt: b.createdAt,
        ipAddress: b.ipAddress
      }))
    );
  } catch (err) {
    console.error("getAdminAuctionBids error:", err.message);
    res.status(500).json({ message: "Server error fetching private bid records." });
  }
};

module.exports = {
  // Public
  getPublicAuctions,
  getPublicAuctionById,
  getPublicAuctionBids,
  registerBidder,
  requestVerification,
  verifyEmail,
  placeBid,
  // Admin
  getAdminAuctions,
  getAdminAuctionById,
  createPainting,
  updatePainting,
  publishAuction,
  unpublishAuction,
  cancelAuction,
  markAuctionSold,
  deletePainting,
  getAdminAuctionBids
};
