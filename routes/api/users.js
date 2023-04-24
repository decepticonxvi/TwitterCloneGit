const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
const User = require("../../schemas/UserSchema");
const Chat = require("../../schemas/ChatSchema");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const path = require("path");
const fs = require("fs");
const Notification = require("../../schemas/NotificationSchema");
const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: "dlrximpgr",
  api_key: "249129813132953",
  api_secret: "oRcijd-Q0cTPNBLAlJ7Ejk_UBHk",
});

router.get("/", async (req, res, next) => {
  var searchObj = req.query;

  if (req.query.search !== undefined) {
    searchObj = {
      $or: [
        { firstName: { $regex: req.query.search, $options: "i" } },
        { lastName: { $regex: req.query.search, $options: "i" } },
        { username: { $regex: req.query.search, $options: "i" } },
      ],
    };
  }

  User.find(searchObj)
    .then((results) => res.status(200).send(results))
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

router.put("/:userId/follow", async (req, res, next) => {
  var userId = req.params.userId;
  var user = await User.findById(userId);

  if (user == null) return res.sendStatus(404);

  var isFollowing =
    user.followers && user.followers.includes(req.session.user._id);

  var option = isFollowing ? "$pull" : "$addToSet";

  req.session.user = await User.findByIdAndUpdate(
    req.session.user._id,
    { [option]: { following: userId } },
    { new: true }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  User.findByIdAndUpdate(userId, {
    [option]: { followers: req.session.user._id },
  }).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  if (!isFollowing) {
    await Notification.insertNotification(
      userId,
      req.session.user._id,
      "follow",
      req.session.user._id
    );
  }

  res.send(req.session.user);
});

router.get("/:userId/following", async (req, res, next) => {
  User.findById(req.params.userId)
    .populate("following")
    .then((results) => {
      res.status(200).send(results);
    })
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});
router.get("/:userId/followers", async (req, res, next) => {
  User.findById(req.params.userId)
    .populate("followers")
    .then((results) => {
      res.status(200).send(results);
    })
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

router.post(
  "/profilePicture",
  upload.single("croppedImage"),
  async (req, res, next) => {
    if (!req.file) {
      console.log("No file uploaded with ajax request.");
      return res.sendStatus(400);
    }
    var filePath = `/uploads/images/${req.file.filename}.png`;
    var tempPath = req.file.path;
    var targetPath = path.join(__dirname, `../../${filePath}`);

    var result = await cloudinary.uploader.upload(
      tempPath,
      (err, result) => {}
    );

    fs.rename(tempPath, targetPath, async (error) => {
      if (error != null) {
        console.log(error);
        return res.sendStatus(400);
      }
      req.session.user = await User.findByIdAndUpdate(
        req.session.user._id,
        { profilePic: result.secure_url },
        { new: true }
      );
      res.sendStatus(200);
    });
  }
);

router.post(
  "/coverPhoto",
  upload.single("croppedImage"),
  async (req, res, next) => {
    if (!req.file) {
      console.log("No file uploaded with ajax request.");
      return res.sendStatus(400);
    }

    var filePath = `/uploads/images/${req.file.filename}.png`;
    var tempPath = req.file.path;
    var targetPath = path.join(__dirname, `../../${filePath}`);

    var result = await cloudinary.uploader.upload(
      tempPath,
      (err, result) => {}
    );

    req.session.user = await User.findByIdAndUpdate(
      req.session.user._id,
      { coverPhoto: result.secure_url },
      { new: true }
    );
    res.sendStatus(204);

    // fs.rename(tempPath, targetPath, async (error) => {
    //   if (error != null) {
    //     console.log(error);
    //     return res.sendStatus(400);
    //   }
    //   req.session.user = await User.findByIdAndUpdate(
    //     req.session.user._id,
    //     { coverPhoto: result.secure_url },
    //     { new: true }
    //   );
    //   res.sendStatus(204);
    // });
  }
);

router.put("/:id", async (req, res, next) => {
  if (req.body.changeGameMode) {
    var chat = await Chat.findOne({
      _id: req.params.id,
    })
      .populate("vs")
      .catch((error) => {
        console.log(error);
        res.sendStatus(400);
      });

    if (chat.userOne.length == 2) {
      await Chat.findByIdAndUpdate(req.params.id, {
        winner: chat.vs[0]._id,
      }).catch((error) => {
        console.log(error);
        return res.sendStatus(400);
      });
      var vsOne = await User.findOne(chat.vs[0]._id).catch((error) => {
        console.log(error);
        return res.sendStatus(400);
      });
      var vsTwo = await User.findOne(chat.vs[1]._id).catch((error) => {
        console.log(error);
        return res.sendStatus(400);
      });
      await User.findByIdAndUpdate(chat.vs[0]._id, {
        $set: { rank: vsOne.rank + 1 },
      }).catch((error) => {
        console.log(error);
        return res.sendStatus(400);
      });
      if (vsTwo.rank > 0) {
        await User.findByIdAndUpdate(chat.vs[1]._id, {
          $set: { rank: vsTwo.rank - 1 },
        }).catch((error) => {
          console.log(error);
          return res.sendStatus(400);
        });
      }
    } else if (chat.userTwo.length == 2) {
      await Chat.findByIdAndUpdate(req.params.id, {
        winner: chat.vs[1]._id,
      }).catch((error) => {
        console.log(error);
        return res.sendStatus(400);
      });
      var vsOne = await User.findOne(chat.vs[0]._id).catch((error) => {
        console.log(error);
        return res.sendStatus(400);
      });
      var vsTwo = await User.findOne(chat.vs[1]._id).catch((error) => {
        console.log(error);
        return res.sendStatus(400);
      });
      await User.findByIdAndUpdate(chat.vs[1]._id, {
        $set: { rank: vsOne.rank + 1 },
      }).catch((error) => {
        console.log(error);
        return res.sendStatus(400);
      });
      if (vsOne.rank > 0) {
        await User.findByIdAndUpdate(chat.vs[0]._id, {
          $set: { rank: vsTwo.rank - 1 },
        }).catch((error) => {
          console.log(error);
          return res.sendStatus(400);
        });
      }
    } else if (chat.userOne.length == 1 && chat.userTwo.length == 1) {
    }

    var vs = chat.vs;
    var jd = chat.jd;
    var conbined = [...vs, ...jd];

    await User.updateMany(
      { _id: { $in: vs } },
      {
        $set: { lastGameMode: "ultraWar", gameStatus: false },
        $push: { history: chat._id },
      }
    ).catch((error) => {
      console.log(error);
      return res.sendStatus(400);
    });
    await User.updateMany(
      { _id: { $in: jd } },
      {
        $set: { lastGameMode: "spectate", gameStatus: false },
      }
    ).catch((error) => {
      console.log(error);
      return res.sendStatus(400);
    });
    
    await Chat.findOne({
      _id: req.params.id,
    })
      .then((results) => res.status(200).send(results))
      .catch((error) => {
        console.log(error);
        res.sendStatus(400);
      });
  } else {
    await User.findByIdAndUpdate(req.params.id, req.body)
      .then(async () => {
        await User.find({ randomChat: true })
          .then((results) => res.status(200).send(results))
          .catch((error) => {
            console.log(error);
            return res.sendStatus(400);
          });
      })
      .catch((error) => {
        console.log(error);
        return res.sendStatus(400);
      });
  }
});

module.exports = router;
