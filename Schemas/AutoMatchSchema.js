const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const AutoMatchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId },
    rank: { type: String, trim: true },
    gameMode: { type: String, trim: true },
    region: { type: String, trim: true },
    availability: Boolean,
    autoMatch: Boolean,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.AutoMatch || mongoose.model("AutoMatch", AutoMatchSchema);
