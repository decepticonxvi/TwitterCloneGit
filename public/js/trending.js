$(document).ready(() => {
  $.get("/api/posts", (results) => {
    const RANKING_FACTORS = {
      ENGAGEMENT: 0.6,
      RECENCY: 0.3,
      RELEVANCE: 0.1,
    };

    function calculateScore(content) {
      const engagementScore =
        content.likes.length * 0.5 + content.retweetUsers.length * 0.5;
      const recencyScore =
        (Date.now() - Date.parse(content.createdAt)) / 86400000; // number of days since content was posted
      const relevanceScore = 0.5; // dummy value for illustration purposes
      return (
        engagementScore * RANKING_FACTORS.ENGAGEMENT +
        recencyScore * RANKING_FACTORS.RECENCY +
        relevanceScore * RANKING_FACTORS.RELEVANCE
      );
    }

    results.sort(function (a, b) {
      return calculateScore(b) - calculateScore(a);
    });

    const currentDate = new Date();
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(currentDate);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const selectedTab = document
      .getElementById("tabID")
      .getAttribute("data-selectedTab");

    if (selectedTab == "today") {
      const todayPosts = results.filter((obj) => {
        const date = new Date(obj.createdAt);
        const formattedDate = date.toISOString().substring(0, 10);
        return formattedDate === getFormattedDate(currentDate);
      });
      console.log(todayPosts);
      outputPosts(todayPosts, $(".postsContainer"));
    } else if (selectedTab == "yestarday") {
      const yestardayPosts = results.filter((obj) => {
        const date = new Date(obj.createdAt);
        const formattedDate = date.toISOString().substring(0, 10);
        return formattedDate === getFormattedDate(yesterday);
      });
      outputPosts(yestardayPosts, $(".postsContainer"));
    } else {
      const twoDaysAgoPosts = results.filter((obj) => {
        const date = new Date(obj.createdAt);
        const formattedDate = date.toISOString().substring(0, 10);
        return formattedDate === getFormattedDate(twoDaysAgo);
      });
      outputPosts(twoDaysAgoPosts, $(".postsContainer"));
    }
  });
});

function getFormattedDate(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}
