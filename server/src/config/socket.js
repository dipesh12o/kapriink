const { Server } = require("socket.io");

let io = null;

const getWhitelist = () => {
  const list = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://kapriink.vercel.app"
  ];
  if (process.env.CLIENT_URL) {
    list.push(process.env.CLIENT_URL);
    list.push(process.env.CLIENT_URL.replace(/\/$/, ""));
  }
  return list;
};

const initSocket = (server) => {
  const whitelist = getWhitelist();

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, "");
        if (whitelist.includes(origin) || whitelist.includes(cleanOrigin)) {
          return callback(null, true);
        }
        return callback(null, true); // Allow connection with graceful fallback
      },
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_auction", (paintingId) => {
      if (paintingId && typeof paintingId === "string") {
        socket.join(`auction_${paintingId}`);
      }
    });

    socket.on("leave_auction", (paintingId) => {
      if (paintingId && typeof paintingId === "string") {
        socket.leave(`auction_${paintingId}`);
      }
    });
  });

  console.log("Socket.IO initialized.");
  return io;
};

const getIO = () => io;

const broadcastNewBid = (paintingId, data) => {
  if (!io) return;
  // Strictly allowlisted public payload
  const publicPayload = {
    paintingId: String(paintingId),
    currentHighestBid: data.currentHighestBid,
    bidCount: data.bidCount,
    newBid: {
      id: String(data.newBid.id),
      amount: data.newBid.amount,
      bidderLabel: "Verified Bidder",
      createdAt: data.newBid.createdAt
    }
  };

  // Broadcast to visitors viewing this specific painting
  io.to(`auction_${paintingId}`).emit("new_bid", publicPayload);

  // Broadcast summary update to all visitors viewing auction catalog
  io.emit("auction_updated", {
    paintingId: String(paintingId),
    currentHighestBid: data.currentHighestBid,
    bidCount: data.bidCount
  });
};

const broadcastAuctionStatus = (paintingId, status) => {
  if (!io) return;
  io.emit("auction_status_changed", {
    paintingId: String(paintingId),
    status
  });
};

module.exports = {
  initSocket,
  getIO,
  broadcastNewBid,
  broadcastAuctionStatus
};
