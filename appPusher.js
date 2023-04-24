const express = require("express");
const app = express();
const port = 3000;
const middleware = require("./middleware");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("./database");
const User = require("./Schemas/UserSchema");
const Post = require("./Schemas/PostSchema");
const Match = require("./Schemas/MatchSchema");
const AutoMatch = require("./schemas/AutoMatchSchema");
const Pusher = require("pusher");

const pusher = new Pusher({
  appId: "YOUR_APP_ID",
  key: "YOUR_APP_KEY",
  secret: "YOUR_APP_SECRET",
  cluster: "YOUR_APP_CLUSTER",
  useTLS: true, // optional, defaults to false
});

const session = require("express-session");

const server = app.listen(port, () =>
  console.log("Server listening on port " + port)
);
const io = require("socket.io")(server, { pingTimeout: 60000 });

app.set("view engine", "pug");
app.set("views", "views");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "bbq chips",
    resave: true,
    saveUninitialized: false,
  })
);

const loginRoute = require("./routes/loginRoutes");
const registerRoute = require("./routes/registerRoutes");
const logoutRoute = require("./routes/logoutRoutes");
const postRoute = require("./routes/postRoutes");
const profileRoute = require("./routes/profileRoutes");
const uploadRoute = require("./routes/uploadRoutes");
const searchRoute = require("./routes/searchRoutes");
const messagesRoute = require("./routes/messagesRoutes");
const notificationsRoute = require("./routes/notificationRoutes");

const postsApiRoute = require("./routes/api/posts");
const usersApiRoute = require("./routes/api/users");
const chatsApiRoute = require("./routes/api/chats");
const messagesApiRoute = require("./routes/api/messages");
const notificationsApiRoute = require("./routes/api/notifications");

app.use("/login", loginRoute);
app.use("/register", registerRoute);
app.use("/logout", logoutRoute);
app.use("/posts", middleware.requireLogin, postRoute);
app.use("/profile", middleware.requireLogin, profileRoute);
app.use("/uploads", uploadRoute);
app.use("/search", middleware.requireLogin, searchRoute);
app.use("/messages", middleware.requireLogin, messagesRoute);
app.use("/notifications", middleware.requireLogin, notificationsRoute);

app.use("/api/posts", postsApiRoute);
app.use("/api/users", usersApiRoute);
app.use("/api/chats", chatsApiRoute);
app.use("/api/messages", messagesApiRoute);
app.use("/api/notifications", notificationsApiRoute);

app.get("/", middleware.requireLogin, (req, res, next) => {
  var payload = {
    pageTitle: "Home",
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
  };
  res.status(200).render("home", payload);
});

app.get("/trending/:selectedTab", middleware.requireLogin, (req, res, next) => {
  var payload = {
    pageTitle: "Trending",
    userLoggedIn: req.session.user,
    userLoggedInJs: JSON.stringify(req.session.user),
    selectedTab: req.params.selectedTab,
  };
  res.status(200).render("trending", payload);
});

io.on("connection", (socket) => {
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
    socket.userId = userData._id;
    User.findOneAndUpdate(
      { _id: userData._id },
      { isOnline: true },
      { upsert: true, new: true },
      (err, user) => {
        if (err) {
          // console.error(err);
        } else {
          // console.log(`User ${user.userId} is now online.`);
        }
      }
    );
  });

  socket.on("join room", (room) => socket.join(room));

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("reload", (room) => socket.in(room).emit("reload"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessage) => {
    var chat = newMessage.chat;

    if (!chat.users) return console.log("Chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessage.sender._id) return;
      socket.in(user._id).emit("message received", newMessage);
    });
  });

  socket.on("send reload", (newChat) => {
    console.log(newChat);
    var chatUsers = newChat.users;
    var userId = socket.userId;

    if (!chatUsers) {
      console.log("entered chat users null");
      return console.log("Chat.users not defined");
    }
    console.log(newChat);
    console.log(userId);

    chatUsers.forEach((user) => {
      if (user == userId) return;
      console.log(user);
      socket.in(user).emit("recieve reload", newChat);
    });
  });

  socket.on("notification received", (room) =>
    socket.in(room).emit("notification received")
  );
  socket.on("disconnect", () => {
    const userId = socket.userId;

    // update user online status to false
    User.updateOne(
      { _id: userId },
      { $set: { isOnline: false } },
      { $set: { isMatching: false } },
      (error, result) => {
        if (error) {
          console.error(error);
        } else {
          // console.log(result);
        }
      }
    );
    Match.deleteOne({ userId: userId }, (error, result) => {
      if (error) {
        console.error(error);
      } else {
      }
    });
    AutoMatch.deleteOne({ userId: userId }, (error, result) => {
      if (error) {
        console.error(error);
      } else {
      }
    });
  });
});

async function getPosts(filter) {
  var results = await Post.find(filter)
    .populate("postedBy")
    .populate("retweetData")
    .populate("replyTo")
    .populate("originalPost")
    .sort({ createdAt: -1 })
    .catch((error) => console.log(error));

  results = await User.populate(results, { path: "replyTo.postedBy" });
  return await User.populate(results, { path: "retweetData.postedBy" });
}
