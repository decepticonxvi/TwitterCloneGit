$(document).ready(() => {
  const selectedTab = document
    .getElementById("notificationID")
    .getAttribute("data-selectedTab");
  const lastGm = document
    .getElementById("notificationID")
    .getAttribute("data-lastGm");
  console.log(lastGm);

  $.get("/api/notifications", (data) => {
    if (selectedTab == "Engagement") {
      const filteredNotifications = data.filter(
        (notification) => notification.notificationType !== "matching"
      );
      outputNotificationList(filteredNotifications, $(".resultsContainer"));
    } else {
      const filteredNotifications = data.filter((notification) => {
        if (lastGm === "spectate") {
          return (
            notification.notificationType === "matching" &&
            notification.gameMode === "ultraWar"
          );
        } else {
          return (
            notification.notificationType === "matching" &&
            notification.gameMode === "spectate"
          );
        }
      });

      outputNotificationList(filteredNotifications, $(".resultsContainer"));
    }
  });
});

$("#markNotificationsAsRead").click(() => markNotificationsAsOpened());
