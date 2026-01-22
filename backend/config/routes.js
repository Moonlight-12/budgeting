const router = require('express').Router();

const authentication = require("../routes/auth");
const transaction = require("../routes/transaction");
const user = require("../routes/user");

router.use("/auth", authentication);
router.use("/transactions", transaction);
router.use("/users", user);

module.exports = router;