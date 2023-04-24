const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatSchema = new Schema(
  {
    chatName: { type: String, trim: true },
    gameMode: { type: String },
    isGroupChat: { type: Boolean, default: false },
    users: [{ type: Schema.Types.ObjectId, ref: "User" }],
    vs: [{ type: Schema.Types.ObjectId, ref: "User" }],
    jd: [{ type: Schema.Types.ObjectId, ref: "User" }],
    userOne: [{ type: Schema.Types.ObjectId, ref: "User" }],
    userTwo: [{ type: Schema.Types.ObjectId, ref: "User" }],
    postId: { type: Schema.Types.ObjectId, ref: "Post" },
    latestMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    winner: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
