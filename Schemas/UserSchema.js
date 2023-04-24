const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true, unique: true },
    email: { type: String, required: true, trim: true, unique: true },
    password: { type: String, required: true },
    profilePic: { type: String, default: "/images/profilePic.jpeg" },
    coverPhoto: { type: String },
    likes: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    optionOne: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    neutral: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    optionTwo: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    retweets: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    history: [{ type: Schema.Types.ObjectId, ref: "Chat" }],
    gameStatus: Boolean,
    isOnline: Boolean,
    autoMatch: Boolean,
    lastGameMode: { type: String },
    rank: { type: Number, default: 0 },
  },
  { timestamps: true }
);

//Rank system
// games, wins, losses,details, fastest win, level

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
