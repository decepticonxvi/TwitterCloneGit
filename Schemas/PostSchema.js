const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const PostSchema = new Schema(
  {
    content: { type: String, trim: true },
    oneContent: { type: String, trim: true },
    vsContent: { type: String, default: "Uncertain" },
    twoContent: { type: String, trim: true },
    postedBy: { type: Schema.Types.ObjectId, ref: "User" },
    postPic: { type: String, default: "null" },
    likes: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    retweetUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    retweetData: { type: Schema.Types.ObjectId, ref: "Post" },
    optionOne: [{ type: Schema.Types.ObjectId, ref: "User" }],
    neutral: [{ type: Schema.Types.ObjectId, ref: "User" }],
    optionTwo: [{ type: Schema.Types.ObjectId, ref: "User" }],
    replyTo: { type: Schema.Types.ObjectId, ref: "Post" },
    pinned: Boolean,
    originalPost: { type: Schema.Types.ObjectId, ref: "Post" },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    retweets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  },
  { timestamps: true }
);

module.exports = mongoose.models.Post || mongoose.model("Post", PostSchema);
