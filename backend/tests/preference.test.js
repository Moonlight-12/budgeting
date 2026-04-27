jest.mock("../config/db", () => jest.fn().mockResolvedValue(undefined));
jest.mock("../middleware/rateLimit", () => ({
  authLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next(),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const User = require("../models/user");
const { connect, disconnect, clearCollections } = require("./testHelper");

beforeAll(connect);
afterAll(disconnect);
afterEach(clearCollections);

const BASE = "/api/v1/users";

async function createUserAndToken() {
  const user = await User.create({
    username: "prefuser",
    email: "pref@example.com",
    password: "hashed",
    emailVerified: true,
    billingStartDay: 1,
    preferredCurrency: "AUD",
  });
  const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
  return { user, token };
}

function authed(req, token) {
  return req.set("Cookie", `accessToken=${token}`);
}

describe("PUT /users/preference - billingStartDay", () => {
  test("updates billingStartDay to valid value", async () => {
    const { token } = await createUserAndToken();
    const res = await authed(request(app).put(`${BASE}/preference`), token).send({ billingStartDay: 15 });
    expect(res.status).toBe(200);
    expect(res.body.billingStartDay).toBe(15);
  });

  test("accepts boundary value 1", async () => {
    const { token } = await createUserAndToken();
    const res = await authed(request(app).put(`${BASE}/preference`), token).send({ billingStartDay: 1 });
    expect(res.status).toBe(200);
    expect(res.body.billingStartDay).toBe(1);
  });

  test("accepts boundary value 28", async () => {
    const { token } = await createUserAndToken();
    const res = await authed(request(app).put(`${BASE}/preference`), token).send({ billingStartDay: 28 });
    expect(res.status).toBe(200);
    expect(res.body.billingStartDay).toBe(28);
  });

  test("rejects value 0", async () => {
    const { token } = await createUserAndToken();
    const res = await authed(request(app).put(`${BASE}/preference`), token).send({ billingStartDay: 0 });
    expect(res.status).toBe(400);
  });

  test("rejects value 29", async () => {
    const { token } = await createUserAndToken();
    const res = await authed(request(app).put(`${BASE}/preference`), token).send({ billingStartDay: 29 });
    expect(res.status).toBe(400);
  });

  test("rejects non-integer string", async () => {
    const { token } = await createUserAndToken();
    const res = await authed(request(app).put(`${BASE}/preference`), token).send({ billingStartDay: "abc" });
    expect(res.status).toBe(400);
  });

  test("updates preferredCurrency independently", async () => {
    const { token } = await createUserAndToken();
    const res = await authed(request(app).put(`${BASE}/preference`), token).send({ preferredCurrency: "IDR" });
    expect(res.status).toBe(200);
    expect(res.body.preferredCurrency).toBe("IDR");
  });

  test("rejects invalid currency", async () => {
    const { token } = await createUserAndToken();
    const res = await authed(request(app).put(`${BASE}/preference`), token).send({ preferredCurrency: "USD" });
    expect(res.status).toBe(400);
  });

  test("returns 401 without token", async () => {
    const res = await request(app).put(`${BASE}/preference`).send({ billingStartDay: 15 });
    expect(res.status).toBe(401);
  });
});
