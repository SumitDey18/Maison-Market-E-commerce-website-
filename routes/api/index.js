const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth"));
router.use(require("./products"));
router.use(require("./cart"));
router.use(require("./orders"));
router.use("/host", require("./host"));
router.use("/admin", require("./admin"));

module.exports = router;
