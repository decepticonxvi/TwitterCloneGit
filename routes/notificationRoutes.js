const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../Schemas/UserSchema");
const Chat = require("../Schemas/ChatSchema");

router.get("/:selectedTab", (req, res, next) => {
  res.status(200).render("notificationsPage", {
    pageTitle: "Notifications",
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
    selectedTab: req.params.selectedTab,
    lastGm: req.session.user.lastGameMode,
  });
});

module.exports = router;
