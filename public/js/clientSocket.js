var connected = false;

var socket = io("https://warsofdesire-decepticonxvi3.onrender.com/");
socket.emit("setup", userLoggedIn);

socket.on("connected", () => (connected = true));
socket.on("message received", (newMessage) => messageReceived(newMessage));

socket.on("notification received", (newNotification) => {
  $.get("/api/notifications/latest", (notificationData) => {
    showNotificationPopup(notificationData);
    refreshNotificationsBadge();
  });
});
function emitNotification(userId) {
  if (userId == userLoggedIn._id) return;

  socket.emit("notification received", userId);
}
