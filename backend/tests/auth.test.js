jest.mock("../utils/mailer", () => ({ sendMail: jest.fn().mockResolvedValue(undefined) }));
jest.mock("../config/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("../middleware/rateLimit", () => ({
  authLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next(),
}));

const request = require("supertest");
const app = require("../app");
const User = require("../models/user");
const { connect, disconnect, clearCollections } = require("./testHelper");

beforeAll(connect);
afterAll(disconnect);
afterEach(clearCollections);

const BASE = "/api/v1/auth";

async function sendOtp(overrides = {}) {
  return request(app).post(`${BASE}/signup/send-otp`).send({
    username: "testuser",
    email: "test@example.com",
    password: "password123",
    ...overrides,
  });
}

describe("POST /signup/send-otp", () => {
  test("returns 200 and resendAvailableAt on valid input", async () => {
    const res = await sendOtp();
    expect(res.status).toBe(200);
    expect(res.body.resendAvailableAt).toBeDefined();
  });

  test("returns 400 for missing username", async () => {
    const res = await sendOtp({ username: undefined });
    expect(res.status).toBe(400);
  });

  test("returns 400 for invalid email", async () => {
    const res = await sendOtp({ email: "notanemail" });
    expect(res.status).toBe(400);
  });

  test("returns 400 for short password", async () => {
    const res = await sendOtp({ password: "abc" });
    expect(res.status).toBe(400);
  });

  test("returns 429 if called again within 60s", async () => {
    await sendOtp();
    const res = await sendOtp();
    expect(res.status).toBe(429);
    expect(res.body.retryAfterSeconds).toBeGreaterThan(0);
  });

  test("returns 409 if verified user with same email exists", async () => {
    await User.create({
      username: "other",
      email: "test@example.com",
      password: "hashed",
      emailVerified: true,
    });
    const res = await sendOtp();
    expect(res.status).toBe(409);
  });
});

describe("POST /signup (OTP verification)", () => {
  async function createPendingUser(otp = "123456") {
    return User.create({
      username: "testuser",
      email: "test@example.com",
      password: "hashed",
      emailVerified: false,
      otp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      otpAttempts: 0,
    });
  }

  test("returns 400 when no pending user exists", async () => {
    const res = await request(app)
      .post(`${BASE}/signup`)
      .send({ email: "test@example.com", otp: "123456" });
    expect(res.status).toBe(400);
  });

  test("returns 400 for wrong OTP and decrements attemptsLeft", async () => {
    await createPendingUser("654321");
    const res = await request(app)
      .post(`${BASE}/signup`)
      .send({ email: "test@example.com", otp: "000000" });
    expect(res.status).toBe(400);
    expect(res.body.attemptsLeft).toBe(4);
  });

  test("returns 201 and sets emailVerified on correct OTP", async () => {
    await createPendingUser("123456");
    const res = await request(app)
      .post(`${BASE}/signup`)
      .send({ email: "test@example.com", otp: "123456" });
    expect(res.status).toBe(201);

    const user = await User.findOne({ email: "test@example.com" });
    expect(user.emailVerified).toBe(true);
    expect(user.otp).toBeUndefined();
  });

  test("locks account after 5 failed attempts", async () => {
    await createPendingUser("654321");
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post(`${BASE}/signup`)
        .send({ email: "test@example.com", otp: "000000" });
    }
    const res = await request(app)
      .post(`${BASE}/signup`)
      .send({ email: "test@example.com", otp: "000000" });
    expect(res.status).toBe(429);
    expect(res.body.lockedUntil).toBeDefined();
  });

  test("returns 429 when account is locked", async () => {
    await User.create({
      username: "testuser",
      email: "test@example.com",
      password: "hashed",
      emailVerified: false,
      otp: "123456",
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      otpAttempts: 5,
      otpLockedUntil: new Date(Date.now() + 5 * 60 * 1000),
    });
    const res = await request(app)
      .post(`${BASE}/signup`)
      .send({ email: "test@example.com", otp: "123456" });
    expect(res.status).toBe(429);
  });

  test("returns 400 for expired OTP", async () => {
    await User.create({
      username: "testuser",
      email: "test@example.com",
      password: "hashed",
      emailVerified: false,
      otp: "123456",
      otpExpiry: new Date(Date.now() - 1000),
      otpAttempts: 0,
    });
    const res = await request(app)
      .post(`${BASE}/signup`)
      .send({ email: "test@example.com", otp: "123456" });
    expect(res.status).toBe(400);
  });
});

describe("POST /signin", () => {
  const bcrypt = require("bcrypt");

  async function createVerifiedUser() {
    return User.create({
      username: "verifieduser",
      email: "v@example.com",
      password: await bcrypt.hash("password123", 10),
      emailVerified: true,
    });
  }

  test("returns 200 and sets cookies on valid credentials", async () => {
    await createVerifiedUser();
    const res = await request(app)
      .post(`${BASE}/signin`)
      .send({ username: "verifieduser", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  test("returns 401 for wrong password", async () => {
    await createVerifiedUser();
    const res = await request(app)
      .post(`${BASE}/signin`)
      .send({ username: "verifieduser", password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  test("returns 403 for unverified email", async () => {
    const bcrypt = require("bcrypt");
    await User.create({
      username: "unverified",
      email: "u@example.com",
      password: await bcrypt.hash("password123", 10),
      emailVerified: false,
    });
    const res = await request(app)
      .post(`${BASE}/signin`)
      .send({ username: "unverified", password: "password123" });
    expect(res.status).toBe(403);
  });
});
