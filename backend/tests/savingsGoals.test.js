jest.mock("../config/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("../middleware/rateLimit", () => ({
  authLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next(),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const User = require("../models/user");
const SavingsGoal = require("../models/savingsGoal");
const { connect, disconnect, clearCollections } = require("./testHelper");

beforeAll(connect);
afterAll(disconnect);
afterEach(clearCollections);

const BASE = "/api/v1/savings-goals";

async function createUserAndToken() {
  const user = await User.create({
    username: "goaltester",
    email: "goal@example.com",
    password: "hashed",
    emailVerified: true,
  });
  const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
  return { user, token };
}

function authed(req, token) {
  return req.set("Cookie", `accessToken=${token}`);
}

describe("GET /savings-goals", () => {
  test("returns empty array when no goals exist", async () => {
    const { token } = await createUserAndToken();
    const res = await authed(request(app).get(BASE), token);
    expect(res.status).toBe(200);
    expect(res.body.goals).toEqual([]);
  });

  test("returns only goals belonging to the authenticated user", async () => {
    const { user, token } = await createUserAndToken();
    const other = await User.create({ username: "other", email: "o@example.com", password: "hashed", emailVerified: true });
    await SavingsGoal.create({ userId: user._id, name: "Mine", targetAmount: 1000 });
    await SavingsGoal.create({ userId: other._id, name: "Theirs", targetAmount: 2000 });
    const res = await authed(request(app).get(BASE), token);
    expect(res.body.goals).toHaveLength(1);
    expect(res.body.goals[0].name).toBe("Mine");
  });

  test("returns 401 without token", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

describe("POST /savings-goals", () => {
  test("creates a goal with required fields", async () => {
    const { token } = await createUserAndToken();
    const res = await authed(request(app).post(BASE), token).send({ name: "Vacation", targetAmount: 5000 });
    expect(res.status).toBe(201);
    expect(res.body.goal.name).toBe("Vacation");
    expect(res.body.goal.targetAmount).toBe(5000);
    expect(res.body.goal.currentAmount).toBe(0);
    expect(res.body.goal.color).toBe("#10b981");
  });

  test("returns 400 for missing name", async () => {
    const { token } = await createUserAndToken();
    const res = await authed(request(app).post(BASE), token).send({ targetAmount: 1000 });
    expect(res.status).toBe(400);
  });

  test("returns 400 for non-positive targetAmount", async () => {
    const { token } = await createUserAndToken();
    const res = await authed(request(app).post(BASE), token).send({ name: "Test", targetAmount: 0 });
    expect(res.status).toBe(400);
  });

  test("accepts optional color and deadline", async () => {
    const { token } = await createUserAndToken();
    const deadline = new Date("2026-12-31").toISOString();
    const res = await authed(request(app).post(BASE), token).send({
      name: "Car",
      targetAmount: 20000,
      color: "#ff0000",
      deadline,
    });
    expect(res.status).toBe(201);
    expect(res.body.goal.color).toBe("#ff0000");
    expect(res.body.goal.deadline).toBeDefined();
  });
});

describe("PUT /savings-goals/:id", () => {
  test("updates goal fields", async () => {
    const { user, token } = await createUserAndToken();
    const goal = await SavingsGoal.create({ userId: user._id, name: "Old", targetAmount: 1000 });
    const res = await authed(request(app).put(`${BASE}/${goal._id}`), token).send({ name: "New", currentAmount: 500 });
    expect(res.status).toBe(200);
    expect(res.body.goal.name).toBe("New");
    expect(res.body.goal.currentAmount).toBe(500);
  });

  test("returns 404 for goal belonging to another user", async () => {
    const { token } = await createUserAndToken();
    const other = await User.create({ username: "other2", email: "o2@example.com", password: "hashed", emailVerified: true });
    const goal = await SavingsGoal.create({ userId: other._id, name: "Theirs", targetAmount: 1000 });
    const res = await authed(request(app).put(`${BASE}/${goal._id}`), token).send({ name: "Stolen" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /savings-goals/:id", () => {
  test("deletes own goal", async () => {
    const { user, token } = await createUserAndToken();
    const goal = await SavingsGoal.create({ userId: user._id, name: "Delete me", targetAmount: 100 });
    const res = await authed(request(app).delete(`${BASE}/${goal._id}`), token);
    expect(res.status).toBe(200);
    expect(await SavingsGoal.findById(goal._id)).toBeNull();
  });

  test("returns 404 for another user's goal", async () => {
    const { token } = await createUserAndToken();
    const other = await User.create({ username: "other3", email: "o3@example.com", password: "hashed", emailVerified: true });
    const goal = await SavingsGoal.create({ userId: other._id, name: "Theirs", targetAmount: 100 });
    const res = await authed(request(app).delete(`${BASE}/${goal._id}`), token);
    expect(res.status).toBe(404);
  });
});
