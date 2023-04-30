const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
const User = require("../../Schemas/UserSchema");
const Post = require("../../Schemas/PostSchema");
const Chat = require("../../Schemas/ChatSchema");
const Message = require("../../Schemas/MessageSchema");
const Notification = require("../../Schemas/NotificationSchema");

app.use(bodyParser.urlencoded({ extended: false }));

router.post("/", async (req, res, next) => {
  if (!req.body.content || !req.body.chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }
  var newMessage = {
    sender: req.session.user._id,
    content: req.body.content,
    chat: req.body.chatId,
  };
  Message.create(newMessage)
    .then(async (message) => {
      message = await Message.populate(message, { path: "sender" });
      message = await Message.populate(message, { path: "chat" });
      message = await User.populate(message, { path: "chat.users" });

      var chat = await Chat.findByIdAndUpdate(req.body.chatId, {
        latestMessage: message,
      }).catch((error) => console.log(error));

      insertNotifications(chat, message);
      res.status(201).send(message);
    })
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

function insertNotifications(chat, message) {
  chat.users.forEach((userId) => {
    if (userId == message.sender._id.toString()) return;

    Notification.insertNotification(
      userId,
      message.sender._id,
      "newMessage",
      message.chat._id
    );
  });
}

module.exports = router;
