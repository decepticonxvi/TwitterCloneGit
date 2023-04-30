const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
const User = require("../../Schemas/UserSchema");
const Post = require("../../Schemas/PostSchema");
const Chat = require("../../Schemas/ChatSchema");
const Message = require("../../Schemas/MessageSchema");
const Match = require("../../Schemas/MatchSchema");
const AutoMatch = require("../../Schemas/AutoMatchSchema");
const Notification = require("../../Schemas/NotificationSchema");

app.use(bodyParser.urlencoded({ extended: false }));

router.post("/", async (req, res, next) => {
  if (!req.body.users) {
    console.log("Users param not sent with request");
    return res.sendStatus(400);
  }
  var data = JSON.parse(req.body.users);
  console.log("data" + data);
  var parsedData = JSON.parse(req.body.users);
  var users = parsedData;

  if (req.body.gameMode == "Auto" || req.body.gameMode == "ON") {
    users = parsedData.users;
  }

  if (users.length == 0) {
    console.log("Users array is empty");
    return res.sendStatus(400);
  }

  users.push(req.session.user);

  if (req.body.gameMode == "ON") {
    var removeUsers = users.map((user) => user._id.toString());
    await Match.deleteMany({ userId: { $in: removeUsers } });
    await User.updateMany(
      { _id: { $in: removeUsers } },
      {
        $set: { gameStatus: true },
      }
    ).catch((error) => {
      console.log(error);
      return res.sendStatus(400);
    });
  }
  if (req.body.gameMode == "Auto") {
    var removeUsers = users.map((user) => user._id.toString());
    await AutoMatch.deleteMany({ userId: { $in: removeUsers } });
    await User.updateMany(
      { _id: { $in: removeUsers } },
      {
        $set: { gameStatus: true },
      }
    ).catch((error) => {
      console.log(error);
      return res.sendStatus(400);
    });
  }

  var chatData = {
    users: users,
    isGroupChat: true,
  };

  if (req.body.gameMode == "Auto" || req.body.gameMode == "ON") {
    console.log("enterd gamemode");
    chatData.vs = data.vs;
    chatData.jd = data.jd;
    chatData.postId = data.postId;
    chatData.gameMode = "match";

    var combined = [...data.vs, ...data.jd];

    await Notification.updateMany(
      { userFrom: { $in: combined }, entityId: chatData.postId },
      { $set: { status: "expired" } }
    ).catch((error) => {
      console.log(error);
      return res.sendStatus(400);
    });

    console.log(chatData);
  }

  Chat.create(chatData)
    .then((results) => res.status(200).send(results))
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

router.get("/", async (req, res, next) => {
  Chat.find({ users: { $elemMatch: { $eq: req.session.user._id } } })
    .populate("users")
    .populate("latestMessage")
    .sort({ updatedAt: -1 })
    .then(async (results) => {
      if (
        req.query.unreadOnly !== undefined &&
        req.query.unreadOnly == "true"
      ) {
        results = results.filter(
          (r) =>
            r.latestMessage &&
            !r.latestMessage.readBy.includes(req.session.user._id)
        );
      }

      results = await User.populate(results, { path: "latestMessage.sender" });
      res.status(200).send(results);
    })
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

router.get("/:chatId", async (req, res, next) => {
  Chat.findOne({
    _id: req.params.chatId,
    users: { $elemMatch: { $eq: req.session.user._id } },
  })
    .populate("users")
    .populate("postId")
    .populate("latestMessage")
    .then(async (results) => {
      results = await User.populate(results, { path: "latestMessage.sender" });
      res.status(200).send(results);
    })
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

router.put("/:chatId", async (req, res, next) => {
  var searchObj = req.body;

  if (req.body.optionOne) {
    searchObj = { $addToSet: { userOne: req.session.user._id } };
  } else if (req.body.optionTwo) {
    searchObj = { $addToSet: { userTwo: req.session.user._id } };
  }
  Chat.findByIdAndUpdate(req.params.chatId, searchObj, {
    new: true,
  })
    .then((results) => res.status(200).send(results))
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

router.get("/:chatId/messages", async (req, res, next) => {
  Message.find({ chat: req.params.chatId })
    .populate("sender")
    .populate("chat")
    .then((results) => res.status(200).send(results))
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

router.put("/:chatId/messages/markAsRead", async (req, res, next) => {
  Message.updateMany(
    { chat: req.params.chatId },
    { $addToSet: { readBy: req.session.user._id } }
  )
    .then(() => res.sendStatus(204))
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

module.exports = router;
