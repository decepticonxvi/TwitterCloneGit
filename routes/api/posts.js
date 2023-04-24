const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
const User = require("../../schemas/UserSchema");
const Post = require("../../schemas/PostSchema");
const Notification = require("../../schemas/NotificationSchema");
const Match = require("../../schemas/MatchSchema");
const AutoMatch = require("../../schemas/AutoMatchSchema");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const cloudinary = require("cloudinary");
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

const io = require("socket.io-client");
const socket = io("http://localhost:3000");

cloudinary.config({
  cloud_name: "dlrximpgr",
  api_key: "249129813132953",
  api_secret: "oRcijd-Q0cTPNBLAlJ7Ejk_UBHk",
});

app.use(bodyParser.urlencoded({ extended: false }));

app.set("view engine", "pug");
app.set("views", "views");

router.get("/", async (req, res, next) => {
  // Post.find()
  //   .populate("postedBy")
  //   .populate("retweetData")
  //   .sort({ createdAt: -1 })
  //   .then(async (results) => {
  //     results = await User.populate(results, { path: "retweetData.postedBy" });
  //     res.status(200).send(results);
  //   })
  //   .catch((error) => {
  //     console.log(error);
  //     res.sendStatus(400);
  //   });
  var searchObj = req.query;

  if (searchObj.isReply !== undefined) {
    var isReply = searchObj.isReply == "true";
    searchObj.replyTo = { $exists: isReply };
    delete searchObj.isReply;
  }

  if (searchObj.search !== undefined) {
    searchObj.content = { $regex: searchObj.search, $options: "i" };
    delete searchObj.search;
  }

  if (searchObj.followingOnly !== undefined) {
    var followingOnly = searchObj.followingOnly == "true";

    if (followingOnly) {
      var objectIds = [];

      if (!req.session.user.following) {
        req.session.user.following = [];
      }
      req.session.user.following.forEach((user) => {
        objectIds.push(user);
      });

      objectIds.push(req.session.user._id);
      searchObj.postedBy = { $in: objectIds };
    }

    delete searchObj.followingOnly;
  }

  var results = await getPosts(searchObj);
  res.status(200).send(results);
});

router.get("/:id", async (req, res, next) => {
  var postId = req.params.id;
  console.log(postId);

  var postData = await getPosts({ _id: postId });
  postData = postData[0];

  var results = {
    postData: postData,
  };
  if (postData.replyTo !== undefined) {
    results.replyTo = postData.replyTo;
  }
  results.replies = await getPosts({ replyTo: postId });

  res.status(200).send(results);
});

router.get("/:userid/automatch", async (req, res, next) => {
  var userId = req.params.userid;

  var prevGameMode;
  var gameMode;
  var users;
  var update = false;
  var postId;

  var user = await User.findOne({
    _id: userId,
  }).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });
  console.log("user" + user);

  prevGameMode = user.lastGameMode;
  gameMode = user.lastGameMode == "spectate" ? "ultraWar" : "spectate";

  var userPostList = [...user.optionOne, ...user.optionTwo];
  var newUserPostList = userPostList.map((userId) => userId.toString());
  var postData = await getPosts({ _id: { $in: newUserPostList } });
  console.log(postData);
  newUserPostList = postData.map((user) => user._id.toString());
  console.log(newUserPostList);

  if (
    (newUserPostList.length === 0 && gameMode == "ultraWar") ||
    user.gameStatus == true
  ) {
    console.log("please select any option.");
    return res.status(200).send("select");
  }

  var data = {
    userId: userId,
    username: user.username,
    gameMode: gameMode,
    rank: user.rank,
    availability: true,
    autoMatch: user.autoMatch,
  };
  var userInMatch = await AutoMatch.findOne({ userId: userId }).catch(
    (error) => {
      console.log(error);
    }
  );

  if (userInMatch !== null && userInMatch.availability === false) {
    console.log("User already in a match");
    return res.status(200).send(users);
  }

  await AutoMatch.findOneAndDelete({ userId: userId }).catch((error) => {
    console.log(error);
  });

  await AutoMatch.create(data).catch((error) => {
    console.log(error);
  });

  var matchOpponent;
  if (prevGameMode == "spectate") {
    matchOpponent = await AutoMatch.findOne({
      userId: { $ne: userId },
      gameMode: gameMode,
      availability: true,
      autoMatch: !user.autoMatch,
    });
    if (matchOpponent !== null) {
      var update = true;
    }

    console.log("matchOpponent 1 " + matchOpponent);
    if (matchOpponent == null) {
      matchOpponent = await AutoMatch.findOne({
        userId: { $ne: userId },
        gameMode: gameMode,
        availability: true,
        autoMatch: user.autoMatch,
      });

      postId =
        newUserPostList[Math.floor(Math.random() * newUserPostList.length)];

      console.log("matchOpponent 2 " + matchOpponent);
    }
    var matchJudge = await AutoMatch.find({
      gameMode: prevGameMode,
      availability: true,
    }).limit(2);

    if (matchOpponent !== null && matchJudge.length == 2) {
      console.log("matchOpponent not null 1 ");

      await AutoMatch.updateMany(
        {
          userId: {
            $in: [
              matchOpponent.userId,
              userId,
              matchJudge[0].userId,
              matchJudge[1].userId,
            ],
          },
        },
        { $set: { availability: false } }
      );

      if (update) {
        console.log("updateON");
        if (user.automatch == true) {
          postId =
            newUserPostList[Math.floor(Math.random() * newUserPostList.length)];
        } else {
          var opponentUser = await User.findOne({
            _id: matchOpponent.userId,
          }).catch((error) => {
            console.log(error);
            res.sendStatus(400);
          });
          console.log("opponentUser" + opponentUser);

          var userPostListOpponent = [
            ...opponentUser.optionOne,
            ...opponentUser.optionTwo,
          ];
          var newUserPostListOpponent = userPostListOpponent.map((userId) =>
            userId.toString()
          );
          console.log("newUserPostListOpponent" + newUserPostListOpponent);

          postId =
            newUserPostListOpponent[
              Math.floor(Math.random() * newUserPostListOpponent.length)
            ];
        }
        await User.findByIdAndUpdate(user._id, {
          $set: { autoMatch: !user.autoMatch },
        }).catch((error) => {
          console.log(error);
          res.sendStatus(400);
        });
        await User.findByIdAndUpdate(matchOpponent.userId, {
          $set: { autoMatch: user.autoMatch },
        }).catch((error) => {
          console.log(error);
          res.sendStatus(400);
        });
      }

      users = await User.find({
        _id: {
          $in: [
            matchOpponent.userId,
            matchJudge[0].userId,
            matchJudge[1].userId,
          ],
        },
      }).catch((error) => {
        console.log(error);
        res.sendStatus(400);
      });

      console.log(" matchOpponent.userId" + matchOpponent.userId);
      console.log(" matchJudge[0].userId" + matchJudge[0].userId);
      console.log("  matchJudge[1].userId," + matchJudge[1].userId);

      var vs = [user._id, matchOpponent.userId];
      var jd = [matchJudge[0].userId, matchJudge[1].userId];

      var data = { users, postId, vs, jd };

      return res.status(200).send(data);
    } else {
      return;
    }
  } else {
    return;
  }
});

router.get("/:postid/:userid/match", async (req, res, next) => {
  var postId = req.params.postid;
  var userId = req.params.userid;
  console.log("postId" + postId);
  console.log("userId" + userId);

  var prevGameMode;
  var gameMode;
  var users;
  var argue;
  var judge;
  var optionOneUsers;
  var optionTwoUsers;
  var one = false;
  var two = false;
  var three = false;

  //////Get User Details
  var user = await User.findOne({
    _id: userId,
  }).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });
  prevGameMode = user.lastGameMode;
  gameMode = user.lastGameMode == "spectate" ? "ultraWar" : "spectate";
  //////Get User Details

  console.log("prevGameMode" + prevGameMode);
  console.log("gameMode" + gameMode);

  //////Get Post Details
  var post = await Post.findOne({
    _id: postId,
  }).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });
  //////Get Post Details

  if (post.optionOne.includes(userId)) {
    argue = post.optionTwo;
    judge = post.neutral;
    judge = judge.map((objectId) => objectId.toString());
    console.log("argue 1" + argue);
    console.log("judge 1" + judge);
    one = true;
  } else if (post.optionTwo.includes(userId)) {
    argue = post.optionOne;
    judge = post.neutral;
    judge = judge.map((objectId) => objectId.toString());
    console.log("argue 2" + argue);
    console.log("judge 2" + judge);
    two = true;
  } else if (post.neutral.includes(userId)) {
    judge = post.neutral;
    judge = judge.filter((id) => id.toString() !== userId);
    judge = judge.map((objectId) => objectId.toString());
    optionOneUsers = post.optionOne;
    optionTwoUsers = post.optionTwo;
    three = true;
  }

  if (one || two || three) {
    console.log("user selected options");
  } else {
    return res.status(200).send("select");
  }
  if (user.gameStatus == true) {
    return;
  }

  var data = {
    userId: userId,
    postId: postId,
    gameMode: gameMode,
    rank: user.rank,
    availability: true,
  };
  var userInMatch = await Match.findOne({ userId: userId }).catch((error) => {
    console.log(error);
  });

  if (userInMatch !== null && userInMatch.availability === false) {
    console.log("User already in a match");
    return res.status(200).send(users);
  }
  await Match.findOneAndDelete({ userId: userId }).catch((error) => {
    console.log(error);
  });

  await Match.create(data).catch((error) => {
    console.log(error);
  });
  var matchOpponent;
  if (prevGameMode == "spectate") {
    matchOpponent = await Match.findOne({
      userId: { $in: argue },
      postId: postId,
      gameMode: gameMode,
      availability: true,
    });
    var matchJudge = await Match.find({
      userId: { $in: judge },
      postId: postId,
      gameMode: prevGameMode,
      availability: true,
    }).limit(2);

    console.log("matchOpponent 1" + matchOpponent);
    console.log("matchJudge 1" + matchJudge);

    if (matchOpponent !== null && matchJudge.length == 2) {
      await Match.updateMany(
        {
          userId: {
            $in: [
              matchOpponent.userId,
              userId,
              matchJudge[0].userId,
              matchJudge[1].userId,
            ],
          },
        },
        { $set: { availability: false } }
      );

      users = await User.find({
        _id: {
          $in: [
            matchOpponent.userId,
            matchJudge[0].userId,
            matchJudge[1].userId,
          ],
        },
      }).catch((error) => {
        console.log(error);
        res.sendStatus(400);
      });

      var vs = [user._id, matchOpponent.userId];
      var jd = [matchJudge[0].userId, matchJudge[1].userId];

      var data = { users, postId, vs, jd };

      return res.status(200).send(data);

      // Match.deleteMany({ userId: { $in: [matchOpponent.userId, userId] } });
    } else {
      if (matchOpponent !== null) {
        matchJudge = await Match.find({
          gameMode: prevGameMode,
          availability: true,
        }).limit(2);

        if (matchOpponent !== null && matchJudge.length == 2) {
          await Match.updateMany(
            {
              userId: {
                $in: [
                  matchOpponent.userId,
                  userId,
                  matchJudge[0].userId,
                  matchJudge[1].userId,
                ],
              },
            },
            { $set: { availability: false } }
          );
          users = await User.find({
            _id: {
              $in: [
                matchOpponent.userId,
                matchJudge[0].userId,
                matchJudge[1].userId,
              ],
            },
          }).catch((error) => {
            console.log(error);
            res.sendStatus(400);
          });

          var vs = [user._id, matchOpponent.userId];
          var jd = [matchJudge[0].userId, matchJudge[1].userId];

          var data = { users, postId, vs, jd };

          return res.status(200).send(data);
        } else {
          judge?.map(async (id) => {
            await Notification.insertNotification(
              id,
              userId,
              "matching",
              postId,
              "spectate"
            );
          });

          console.log("recruptment send to users");
          return res.status(200).send(null);
        }
      } else {
        argue?.map(async (id) => {
          await Notification.insertNotification(
            id,
            userId,
            "matching",
            postId,
            "ultraWar"
          );
        });

        if (req.body.retry == "true") {
          matchOpponent = await Match.findOne({
            userId: { $in: argue },
            postId: postId,
            gameMode: gameMode,
            availability: true,
          });

          judge?.map(async (id) => {
            await Notification.insertNotification(
              id,
              userId,
              "matching",
              postId,
              "spectate"
            );
          });

          console.log("recruptment send to users");
          return res.status(200).send(null);
        }

        return res.status(200).send(null);
      }
    }
  } else {
    var matchJudge = await Match.findOne({
      userId: { $in: judge },
      postId: postId,
      gameMode: gameMode,
      availability: true,
    });
    var anotherOneUser = await Match.findOne({
      userId: { $in: optionOneUsers },
      postId: postId,
      gameMode: prevGameMode,
      availability: true,
    });
    var anotherTwoUser = await Match.findOne({
      userId: { $in: optionTwoUsers },
      postId: postId,
      gameMode: prevGameMode,
      availability: true,
    });

    if (
      matchJudge !== null &&
      anotherOneUser !== null &&
      anotherTwoUser !== null
    ) {
      await Match.updateMany(
        {
          userId: {
            $in: [
              matchJudge.userId,
              userId,
              anotherOneUser.userId,
              anotherTwoUser.userId,
            ],
          },
        },
        { $set: { availability: false } }
      );

      users = await User.find({
        _id: {
          $in: [
            matchJudge.userId,
            anotherOneUser.userId,
            anotherTwoUser.userId,
          ],
        },
      }).catch((error) => {
        console.log(error);
        res.sendStatus(400);
      });

      var vs = [anotherOneUser.userId, anotherTwoUser.userId];
      var jd = [user._id, matchJudge.userId];

      var data = { users, postId, vs, jd };

      return res.status(200).send(data);
      // Match.deleteMany({ userId: { $in: [matchOpponent.userId, userId] } });
    } else {
      return;
    }
  }
});

router.post("/", async (req, res, next) => {
  if (!req.body.content) {
    console.log("Content param not sent with request");
    return res.sendStatus(400);
  }
  var postData = {
    content: req.body.content,
    postedBy: req.session.user,
  };
  if (req.body.replyTo) {
    postData.replyTo = req.body.replyTo;

    var originalPost = await Post.findOne({
      _id: req.body.replyTo,
    }).catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
    if (originalPost.originalPost !== undefined) {
      postData.originalPost = originalPost.originalPost;
    } else {
      postData.originalPost = originalPost._id;
    }
  } else {
    postData.oneContent = req.body.oneContent;
    postData.twoContent = req.body.twoContent;
  }

  Post.create(postData)
    .then(async (newPost) => {
      newPost = await User.populate(newPost, { path: "postedBy" });
      newPost = await Post.populate(newPost, { path: "replyTo" });

      if (req.body.replyTo) {
        await Post.findByIdAndUpdate(
          postData.replyTo,
          { $addToSet: { replies: newPost._id } },
          { new: true }
        ).catch((error) => {
          console.log(error);
          res.sendStatus(400);
        });
      }

      if (newPost.replyTo !== undefined) {
        await Notification.insertNotification(
          newPost.replyTo.postedBy,
          req.session.user._id,
          "reply",
          newPost._id
        );
      }
      res.status(201).send(newPost);
    })
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

router.put("/:id/like", async (req, res, next) => {
  var postId = req.params.id;
  var userId = req.session.user._id;

  var isLiked = req.session.user.likes?.includes(postId);
  var option = isLiked ? "$pull" : "$addToSet";

  req.session.user = await User.findByIdAndUpdate(
    userId,
    { [option]: { likes: postId } },
    { new: true }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  var post = await Post.findByIdAndUpdate(
    postId,
    { [option]: { likes: userId } },
    { new: true }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  if (post.replyTo !== undefined) {
    await Post.findByIdAndUpdate(
      post.originalPost,
      { [option]: { likes: userId } },
      { new: true }
    ).catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
  }

  if (!isLiked) {
    await Notification.insertNotification(
      post.postedBy,
      userId,
      "postLike",
      post._id
    );
  }

  res.send(post);
});

router.put("/:id/optionOne", async (req, res, next) => {
  var postId = req.params.id;
  var userId = req.session.user._id;

  var postCheck = await Post.find({ _id: postId })
    .populate("originalPost")
    .populate("replyTo");

  if (postCheck[0]?.replyTo?._id !== undefined) {
    const objectId = postCheck[0].originalPost._id;
    postId = objectId.toString();
  }

  var isOptionOne = req.session.user.optionOne?.includes(postId);
  var isNeutral = req.session.user.neutral?.includes(postId);
  var isOptionTwo = req.session.user.optionTwo?.includes(postId);

  await removeOption(isOptionOne, isNeutral, isOptionTwo, req, postId, userId);

  var option = isOptionOne ? "$pull" : "$addToSet";
  req.session.user = await User.findByIdAndUpdate(
    userId,
    { [option]: { optionOne: postId } },
    { new: true }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });
  var post = await Post.findByIdAndUpdate(
    postId,
    { [option]: { optionOne: userId } },
    { new: true }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });
  res.status(200).send(post);
});
router.put("/:id/neutral", async (req, res, next) => {
  var postId = req.params.id;
  var userId = req.session.user._id;

  var postCheck = await Post.find({ _id: postId })
    .populate("originalPost")
    .populate("replyTo");

  if (postCheck[0]?.replyTo?._id !== undefined) {
    const objectId = postCheck[0].originalPost._id;
    postId = objectId.toString();
  }

  var isOptionOne = req.session.user.optionOne?.includes(postId);
  var isNeutral = req.session.user.neutral?.includes(postId);
  var isOptionTwo = req.session.user.optionTwo?.includes(postId);

  await removeOption(isOptionOne, isNeutral, isOptionTwo, req, postId, userId);

  var option = isNeutral ? "$pull" : "$addToSet";
  req.session.user = await User.findByIdAndUpdate(
    userId,
    { [option]: { neutral: postId } },
    { new: true }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });
  var post = await Post.findByIdAndUpdate(
    postId,
    { [option]: { neutral: userId } },
    { new: true }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });
  res.status(200).send(post);
});
router.put("/:id/optionTwo", async (req, res, next) => {
  var postId = req.params.id;
  var userId = req.session.user._id;

  var postCheck = await Post.find({ _id: postId })
    .populate("originalPost")
    .populate("replyTo");

  if (postCheck[0]?.replyTo?._id !== undefined) {
    const objectId = postCheck[0].originalPost._id;
    postId = objectId.toString();
  }

  var isOptionOne = req.session.user.optionOne?.includes(postId);
  var isNeutral = req.session.user.neutral?.includes(postId);
  var isOptionTwo = req.session.user.optionTwo?.includes(postId);

  await removeOption(isOptionOne, isNeutral, isOptionTwo, req, postId, userId);

  var option = isOptionTwo ? "$pull" : "$addToSet";
  req.session.user = await User.findByIdAndUpdate(
    userId,
    { [option]: { optionTwo: postId } },
    { new: true }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });
  var post = await Post.findByIdAndUpdate(
    postId,
    { [option]: { optionTwo: userId } },
    { new: true }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });
  res.status(200).send(post);
});

router.post("/:id/retweet", async (req, res, next) => {
  var postId = req.params.id;
  var userId = req.session.user._id;

  var deletedPost = await Post.findOneAndDelete({
    postedBy: userId,
    retweetData: postId,
  }).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });
  var option = deletedPost != null ? "$pull" : "$addToSet";

  // var postCheck = await Post.findOne({
  //   _id: postId,
  // }).catch((error) => {
  //   console.log(error);
  //   res.sendStatus(400);
  // });
  // var originalPost;
  // if (postCheck.originalPost !== undefined) {
  //   originalPost = postCheck.originalPost;
  // } else {
  //   originalPost = postCheck._id;
  // }

  var repost = deletedPost;

  if (repost == null) {
    repost = await Post.create({
      postedBy: userId,
      retweetData: postId,
      // originalPost: originalPost,
    }).catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
  }

  req.session.user = await User.findByIdAndUpdate(
    userId,
    { [option]: { retweets: repost._id } },
    { new: true }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  var post = await Post.findByIdAndUpdate(
    postId,
    { [option]: { retweetUsers: userId, retweets: repost._id } },
    { new: true }
  ).catch((error) => {
    console.log(error);
    res.sendStatus(400);
  });

  if (!deletedPost) {
    await Notification.insertNotification(
      post.postedBy,
      userId,
      "retweet",
      post._id
    );
  }

  res.send(post);
});

router.delete("/:id", async (req, res, next) => {
  var deletedPost = await Post.findByIdAndDelete(req.params.id);

  await deleteReplies(deletedPost.replies, deletedPost.retweets);
  res.sendStatus(202);
});

async function deleteReplies(replyIds, retweetIds) {
  if (replyIds.length > 0 || retweetIds.length > 0) {
    var deletedPostsReplies = await Post.find({ _id: { $in: replyIds } });
    var deletedPostsRetweets = await Post.find({ _id: { $in: retweetIds } });

    const deletedReplies = await Post.deleteMany({ _id: { $in: replyIds } });
    const deletedRetweets = await Post.deleteMany({ _id: { $in: retweetIds } });

    const nestedReplyIds = deletedPostsReplies.flatMap(
      (reply) => reply.replies
    );
    const nestedRetweetIds = deletedPostsReplies.flatMap(
      (reply) => reply.retweets
    );
    await deleteReplies(nestedReplyIds, nestedRetweetIds);
  }
}

router.put("/:id", async (req, res, next) => {
  if (req.body.pinned !== undefined) {
    await Post.updateMany(
      { postedBy: req.session.user },
      { pinned: false }
    ).catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
  }
  Post.findByIdAndUpdate(req.params.id, req.body)
    .then(() => res.sendStatus(204))
    .catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
});

router.put(
  "/:id/photo",
  upload.single("croppedImage"),
  async (req, res, next) => {
    if (!req.file) {
      console.log("No file uploaded with ajax request.");
      return res.sendStatus(400);
    }
    var tempPath = req.file.path;

    var result = await cloudinary.uploader.upload(
      tempPath,
      (err, result) => {}
    );

    await Post.findByIdAndUpdate(req.params.id, {
      postPic: result.secure_url,
    }).catch((error) => {
      console.log(error);
      res.sendStatus(400);
    });
  }
);

async function removeOption(
  isOptionOne,
  isNeutral,
  isOptionTwo,
  req,
  postId,
  userId
) {
  if (isOptionOne || isNeutral || isOptionTwo) {
    if (isOptionOne) {
      req.session.user = await User.findByIdAndUpdate(
        userId,
        { $pull: { optionOne: postId } },
        { new: true }
      ).catch((error) => {
        console.log(error);
        res.sendStatus(400);
      });
      var post = await Post.findByIdAndUpdate(
        postId,
        { $pull: { optionOne: userId } },
        { new: true }
      ).catch((error) => {
        console.log(error);
        res.sendStatus(400);
      });
    }
    if (isNeutral) {
      req.session.user = await User.findByIdAndUpdate(
        userId,
        { $pull: { neutral: postId } },
        { new: true }
      ).catch((error) => {
        console.log(error);
        res.sendStatus(400);
      });
      var post = await Post.findByIdAndUpdate(
        postId,
        { $pull: { neutral: userId } },
        { new: true }
      ).catch((error) => {
        console.log(error);
        res.sendStatus(400);
      });
    }
    if (isOptionTwo) {
      req.session.user = await User.findByIdAndUpdate(
        userId,
        { $pull: { optionTwo: postId } },
        { new: true }
      ).catch((error) => {
        console.log(error);
        res.sendStatus(400);
      });
      var post = await Post.findByIdAndUpdate(
        postId,
        { $pull: { optionTwo: userId } },
        { new: true }
      ).catch((error) => {
        console.log(error);
        res.sendStatus(400);
      });
    }
  }
}

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

module.exports = router;
