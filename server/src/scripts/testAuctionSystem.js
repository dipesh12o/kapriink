const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../server/.env") });
const http = require("http");
const mongoose = require("mongoose");
const app = require("../app");
const { connectDB } = require("../config/db");
const { initSocket } = require("../config/socket");
const Painting = require("../models/Painting");
const AuctionParticipant = require("../models/AuctionParticipant");
const Bid = require("../models/Bid");

async function runTests() {
  console.log("==================================================");
  console.log("KAPRINK PAINTING AUCTION SYSTEM - TEST SUITE");
  console.log("==================================================");

  let server;
  let baseUrl;
  let testPaintingIds = [];
  let testParticipantEmails = [];

  try {
    // 1. Connect DB & start test server
    console.log("\n[1/10] Initializing database and HTTP test server...");
    await connectDB();
    server = http.createServer(app);
    initSocket(server);

    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`✓ Test server running on ${baseUrl}`);
        resolve();
      });
    });

    // Helper fetch wrapper
    const api = async (endpoint, options = {}) => {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }
      return { status: res.status, data };
    };

    // 2. Public Endpoints & Privacy Audit
    console.log("\n[2/10] Verifying Public Endpoints & Data Privacy Guarantee...");
    const resPublic = await api("/api/auctions");
    if (resPublic.status !== 200 || !Array.isArray(resPublic.data)) {
      throw new Error(`Public auctions fetch failed with status ${resPublic.status}`);
    }

    // Check privacy on all returned records
    for (const item of resPublic.data) {
      const keys = Object.keys(item);
      const forbidden = ["email", "ipAddress", "verificationToken", "bidder"];
      for (const f of forbidden) {
        if (keys.includes(f)) {
          throw new Error(`PRIVACY VIOLATION: public auction record exposed forbidden field '${f}'`);
        }
      }
      if (item.winner && item.winner.email) {
        throw new Error(`PRIVACY VIOLATION: public auction winner exposed email`);
      }
    }
    console.log(`✓ Public /api/auctions returns sanitized data with zero email/IP leaks.`);

    // 3. RBAC Protection
    console.log("\n[3/10] Verifying RBAC Security on Sensitive Endpoints...");
    const resNoAuth = await api("/api/admin/auctions");
    if (resNoAuth.status !== 401) {
      throw new Error(`Expected 401 on /api/admin/auctions without token, got ${resNoAuth.status}`);
    }

    const resBadAuth = await api("/api/admin/auctions", {
      headers: { Authorization: "Bearer bad-token-12345" }
    });
    if (resBadAuth.status !== 401) {
      throw new Error(`Expected 401 on /api/admin/auctions with invalid token, got ${resBadAuth.status}`);
    }
    console.log("✓ Admin endpoints correctly reject unauthenticated and malformed requests.");

    // 4. Guest Bidder Verification Flow
    console.log("\n[4/10] Testing Guest Bidder Verification Flow (No Password Needed)...");
    const testEmail1 = `test_bidder_1_${Date.now()}@kaprink-test.internal`;
    const testEmail2 = `test_bidder_2_${Date.now()}@kaprink-test.internal`;
    testParticipantEmails.push(testEmail1, testEmail2);

    const resReqVerify1 = await api("/api/auctions/request-verification", {
      method: "POST",
      body: JSON.stringify({ email: testEmail1, name: "Collector Alpha" })
    });

    if (resReqVerify1.status !== 200) {
      throw new Error(`Request verification failed with status ${resReqVerify1.status}: ${JSON.stringify(resReqVerify1.data)}`);
    }

    // Inspect database for participant and OTP
    const participant1 = await AuctionParticipant.findOne({ email: testEmail1 });
    if (!participant1 || !participant1.verificationTokenHash) {
      throw new Error("AuctionParticipant record or verification token missing from database.");
    }

    // Test bad OTP
    const resBadOtp = await api("/api/auctions/verify-email", {
      method: "POST",
      body: JSON.stringify({ email: testEmail1, code: "000000" })
    });
    if (resBadOtp.status !== 400) {
      throw new Error(`Expected 400 on invalid OTP, got ${resBadOtp.status}`);
    }

    // Test good OTP (from devOtp or we can use the participant document)
    const validOtp = resReqVerify1.data.devOtp;
    if (!validOtp) {
      throw new Error("Dev OTP hint was not returned in development mode.");
    }

    const resGoodOtp = await api("/api/auctions/verify-email", {
      method: "POST",
      body: JSON.stringify({ email: testEmail1, code: validOtp })
    });
    if (resGoodOtp.status !== 200 || !resGoodOtp.data.token) {
      throw new Error(`Valid OTP verification failed: ${JSON.stringify(resGoodOtp.data)}`);
    }
    const bidderToken1 = resGoodOtp.data.token;
    console.log("✓ Guest bidder 1 registered and cryptographically verified.");

    // Verify bidder 2 as well
    const resReqVerify2 = await api("/api/auctions/request-verification", {
      method: "POST",
      body: JSON.stringify({ email: testEmail2, name: "Collector Beta" })
    });
    const resGoodOtp2 = await api("/api/auctions/verify-email", {
      method: "POST",
      body: JSON.stringify({ email: testEmail2, code: resReqVerify2.data.devOtp })
    });
    const bidderToken2 = resGoodOtp2.data.token;
    console.log("✓ Guest bidder 2 registered and cryptographically verified.");

    // 5. Create Live Test Painting in Database
    console.log("\n[5/10] Setting up Live Auction Item for Transaction Tests...");
    const testPaintingLive = await Painting.create({
      title: "Test Celestial Canvas - Automated Suite",
      description: "Ephemeral test painting created for ACID transaction verification.",
      imageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      imagePublicId: "kapriink/paintings/test_sample_live",
      medium: "Oil on Linen",
      dimensions: "30x40 in",
      startingBid: 100,
      minBidIncrement: 25,
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() + 7200000), // 2 hours in future
      isPublished: true,
      status: "published",
      currentHighestBid: 0,
      bidCount: 0
    });
    testPaintingIds.push(testPaintingLive._id.toString());
    const livePaintingId = testPaintingLive._id.toString();
    console.log(`✓ Test painting created (ID: ${livePaintingId}, Starting Bid: $100, Min Inc: $25)`);

    // 6. Test Bid Validation Rules & Increments
    console.log("\n[6/10] Testing Authoritative Server-side Bid Validation...");
    
    // Attempt bid with no token
    const resNoToken = await api(`/api/auctions/${livePaintingId}/bid`, {
      method: "POST",
      body: JSON.stringify({ amount: 100 })
    });
    if (resNoToken.status !== 401 && resNoToken.status !== 403) {
      throw new Error(`Expected 401/403 for unverified bidder, got ${resNoToken.status}`);
    }

    // Bid below starting bid ($50 < $100)
    const resLowBid = await api(`/api/auctions/${livePaintingId}/bid`, {
      method: "POST",
      headers: { "x-bidder-token": bidderToken1 },
      body: JSON.stringify({ amount: 50 })
    });
    if (resLowBid.status !== 400) {
      throw new Error(`Expected 400 for bid below starting bid, got ${resLowBid.status}`);
    }

    // Opening bid ($100) -> Should succeed
    const resOpeningBid = await api(`/api/auctions/${livePaintingId}/bid`, {
      method: "POST",
      headers: { "x-bidder-token": bidderToken1 },
      body: JSON.stringify({ amount: 100, idempotencyKey: `idem_open_${Date.now()}` })
    });
    if (resOpeningBid.status !== 201) {
      throw new Error(`Opening bid failed: ${JSON.stringify(resOpeningBid.data)}`);
    }
    console.log("✓ Opening bid of $100 accepted.");

    // Bid below minimum increment ($110 when min next is $100 + $25 = $125)
    const resBelowInc = await api(`/api/auctions/${livePaintingId}/bid`, {
      method: "POST",
      headers: { "x-bidder-token": bidderToken2 },
      body: JSON.stringify({ amount: 110 })
    });
    if (resBelowInc.status !== 400) {
      throw new Error(`Expected 400 for bid below min increment ($110 < $125), got ${resBelowInc.status}`);
    }
    console.log("✓ Bid below required minimum increment rejected with 400.");

    // 7. Test Concurrency & Transaction Lock
    console.log("\n[7/10] Testing Atomic Concurrency & Optimistic Concurrency Control...");
    // Both bidders attempt to bid $150 simultaneously
    const identicalAmount = 150;
    const [bidRes1, bidRes2] = await Promise.all([
      api(`/api/auctions/${livePaintingId}/bid`, {
        method: "POST",
        headers: { "x-bidder-token": bidderToken1 },
        body: JSON.stringify({ amount: identicalAmount, idempotencyKey: `idem_conc_1_${Date.now()}` })
      }),
      api(`/api/auctions/${livePaintingId}/bid`, {
        method: "POST",
        headers: { "x-bidder-token": bidderToken2 },
        body: JSON.stringify({ amount: identicalAmount, idempotencyKey: `idem_conc_2_${Date.now()}` })
      })
    ]);

    const statuses = [bidRes1.status, bidRes2.status];
    const successCount = statuses.filter(s => s === 201).length;
    const conflictCount = statuses.filter(s => s === 409 || s === 400).length;

    console.log(`Concurrency responses: Bidder 1 = ${bidRes1.status}, Bidder 2 = ${bidRes2.status}`);

    if (successCount !== 1 || conflictCount !== 1) {
      throw new Error(`Concurrency race condition failed: expected exactly 1 success and 1 conflict/rejection, got statuses: ${JSON.stringify(statuses)}`);
    }

    // Verify consistency in database
    const liveDoc = await Painting.findById(livePaintingId);
    const bidsInDb = await Bid.find({ painting: livePaintingId });
    if (liveDoc.currentHighestBid !== 150) {
      throw new Error(`Database currentHighestBid expected 150, found ${liveDoc.currentHighestBid}`);
    }
    if (liveDoc.bidCount !== 2 || bidsInDb.length !== 2) {
      throw new Error(`Database bidCount inconsistency: Painting says ${liveDoc.bidCount}, Bid collection has ${bidsInDb.length}`);
    }
    console.log("✓ ACID transaction and concurrency lock verified! Exactly 1 bid won, 0 duplicate increments.");

    // 8. Test Idempotency
    console.log("\n[8/10] Testing Idempotent Resubmission Protection...");
    const testIdemKey = `idem_replay_${Date.now()}`;
    const nextAmount = 200;

    const resFirstAttempt = await api(`/api/auctions/${livePaintingId}/bid`, {
      method: "POST",
      headers: { "x-bidder-token": bidderToken1 },
      body: JSON.stringify({ amount: nextAmount, idempotencyKey: testIdemKey })
    });
    if (resFirstAttempt.status !== 201) {
      throw new Error(`First attempt for idempotent bid failed: ${JSON.stringify(resFirstAttempt.data)}`);
    }

    const resReplayAttempt = await api(`/api/auctions/${livePaintingId}/bid`, {
      method: "POST",
      headers: { "x-bidder-token": bidderToken1 },
      body: JSON.stringify({ amount: nextAmount, idempotencyKey: testIdemKey })
    });
    if (resReplayAttempt.status !== 200 && resReplayAttempt.status !== 201) {
      throw new Error(`Replay attempt failed: ${JSON.stringify(resReplayAttempt.data)}`);
    }

    const liveDocAfterIdem = await Painting.findById(livePaintingId);
    const bidsAfterIdem = await Bid.find({ painting: livePaintingId });
    if (liveDocAfterIdem.bidCount !== 3 || bidsAfterIdem.length !== 3) {
      throw new Error(`Idempotency failure: bidCount was incremented on duplicate submission!`);
    }
    console.log("✓ Idempotent resubmission handled cleanly with zero double-counting.");

    // 9. Test Timing Bounds & Expiration
    console.log("\n[9/10] Testing Start & End Time Enforcement...");
    const testPaintingExpired = await Painting.create({
      title: "Test Expired Painting - Automated Suite",
      description: "Ephemeral expired test painting.",
      imageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      imagePublicId: "kapriink/paintings/test_sample_expired",
      startingBid: 200,
      minBidIncrement: 50,
      startTime: new Date(Date.now() - 7200000), // 2 hours ago
      endTime: new Date(Date.now() - 3600000), // 1 hour ago (Ended)
      isPublished: true,
      status: "published",
      currentHighestBid: 0,
      bidCount: 0
    });
    testPaintingIds.push(testPaintingExpired._id.toString());

    const resExpiredBid = await api(`/api/auctions/${testPaintingExpired._id}/bid`, {
      method: "POST",
      headers: { "x-bidder-token": bidderToken1 },
      body: JSON.stringify({ amount: 250 })
    });
    if (resExpiredBid.status !== 400) {
      throw new Error(`Expected 400 for bid on ended auction, got ${resExpiredBid.status}`);
    }
    console.log("✓ Bidding on expired/concluded auction successfully rejected with 400.");

    // 10. Regression Testing: Existing Studio & Tattoo APIs
    console.log("\n[10/10] Verifying Zero Regression on Existing Studio Endpoints...");
    const resTattoos = await api("/api/tattoos");
    if (resTattoos.status !== 200 || !Array.isArray(resTattoos.data)) {
      throw new Error(`Regression: /api/tattoos returned status ${resTattoos.status}`);
    }

    const resAvailability = await api("/api/availability");
    if (resAvailability.status !== 200 || !resAvailability.data.days) {
      throw new Error(`Regression: /api/availability returned status ${resAvailability.status}`);
    }

    // Health check endpoint verification
    const resHealth = await api("/api/health");
    if (resHealth.status !== 200 || resHealth.data?.status !== "ok") {
      throw new Error(`Health check: /api/health returned status ${resHealth.status}`);
    }

    // 404 JSON fallback verification (must never return HTML <!DOCTYPE)
    const res404 = await api("/api/nonexistent-endpoint-test");
    if (res404.status !== 404 || !res404.data?.message) {
      throw new Error(`404 Fallback: Expected JSON message, got ${JSON.stringify(res404.data)}`);
    }
    console.log("✓ Existing endpoints, /api/health, and JSON 404 fallback verified.");

    console.log("\n==================================================");
    console.log("ALL AUCTION SYSTEM TESTS PASSED SUCCESSFULLY! (10/10)");
    console.log("==================================================");

  } finally {
    // Teardown: Clean up temporary test documents
    console.log("\n[Teardown] Cleaning up test database records...");
    if (testPaintingIds.length > 0) {
      await Painting.deleteMany({ _id: { $in: testPaintingIds } });
      await Bid.deleteMany({ painting: { $in: testPaintingIds } });
    }
    if (testParticipantEmails.length > 0) {
      await AuctionParticipant.deleteMany({ email: { $in: testParticipantEmails } });
    }
    console.log("✓ Database cleaned: 0 residual test records left behind.");

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  }
}

runTests().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
