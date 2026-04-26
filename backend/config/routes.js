const router = require('express').Router();

const authentication = require("../routes/auth");
const transaction = require("../routes/transaction");
const user = require("../routes/user");
const category = require("../routes/category");
const budget = require("../routes/budget");
const savingsGoals = require("../routes/savingsGoals");

router.use("/auth", authentication);
router.use("/transactions", transaction);
router.use("/users", user);
router.use("/categories", category);
router.use("/budget", budget);
router.use("/savings-goals", savingsGoals);

module.exports = router;