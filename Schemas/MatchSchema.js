const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const MatchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId },
    postId: { type: Schema.Types.ObjectId },
    rank: { type: String, trim: true },
    gameMode: { type: String, trim: true },
    region: { type: String, trim: true },
    availability: Boolean,
    inMatch: Boolean,
  },
  { timestamps: true }
);

module.exports = mongoose.models.Match || mongoose.model("Match", MatchSchema);
