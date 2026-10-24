const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const http = require("http");
const app = require("./app");
const { connectDB } = require("./config/db");
const { initSocket } = require("./config/socket");

const PORT = process.env.PORT || 5000;

// Start database and start listening
const startServer = async () => {
  await connectDB();
  
  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
  });
};

startServer();
