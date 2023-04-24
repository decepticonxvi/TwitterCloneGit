const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NotificationSchema = new Schema(
  {
    userTo: { type: Schema.Types.ObjectId, ref: "User" },
    userFrom: { type: Schema.Types.ObjectId, ref: "User" },
    notificationType: String,
    opened: { type: Boolean, default: false },
    entityId: Schema.Types.ObjectId,
    gameMode: String,
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

NotificationSchema.statics.insertNotification = async (
  userTo,
  userFrom,
  notificationType,
  entityId,
  gameMode
) => {
  var data = {
    userTo: userTo,
    userFrom: userFrom,
    notificationType: notificationType,
    entityId: entityId,
    gameMode: gameMode,
  };
  await Notification.deleteOne(data).catch((error) => console.log(error));
  return Notification.create(data).catch((error) => console.log(error));
};

var Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;
