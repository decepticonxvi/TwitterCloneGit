var cropper;
var timer;
var selectedUsers = [];

$(document).ready(() => {
  socket.on("recieve reload", (newChat) => {
    console.log("about to reload");
    window.location.href = `/messages/${newChat._id}`;
  });

  refreshMessagesBadge();
  refreshNotificationsBadge();
});

$("#postTextareaMain,#postTextareaOne,#postTextareaTwo").keyup((event) => {
  var textbox = $(event.target);
  var value = textbox.val().trim();

  var isModal = textbox.parents(".modal").length == 1;
  var submitButton = isModal ? $("#submitReplyButton") : $("#submitPostButton");

  if (submitButton.length == 0) return alert("No submit button found");

  if (value == "") {
    submitButton.prop("disabled", true);
    return;
  }
  var ptm =
    document.querySelector("textarea#postTextareaMain").value.trim() === "";
  var pto =
    document.querySelector("textarea#postTextareaOne").value.trim() === "";
  var ptt =
    document.querySelector("textarea#postTextareaTwo").value.trim() === "";

  if (!ptm && !pto && !ptt) {
    submitButton.prop("disabled", false);
  } else {
    submitButton.prop("disabled", true);
  }

  // submitButton.prop("disabled", false);
});

$("#replyTextarea").keyup((event) => {
  var textbox = $(event.target);
  var value = textbox.val().trim();

  var isModal = textbox.parents(".modal").length == 1;
  var submitButton = isModal ? $("#submitReplyButton") : $("#submitPostButton");

  if (submitButton.length == 0) return alert("No submit button found");

  if (value == "") {
    submitButton.prop("disabled", true);
    return;
  }

  submitButton.prop("disabled", false);
});

$("#submitPostButton,#submitReplyButton").click(() => {
  var button = $(event.target);

  var isModal = button.parents(".modal").length == 1;
  var textbox = isModal ? $("#replyTextarea") : $("#postTextareaMain");

  var data = {
    content: textbox.val(),
  };

  if (isModal) {
    var id = button.data().id;
    if (id == null) return alert("Button id is null");
    data.replyTo = id;
  }
  if (!isModal) {
    data.oneContent = $("#postTextareaOne").val();
    data.twoContent = $("#postTextareaTwo").val();
  }

  $.post("/api/posts", data, (postData, status, xhr) => {
    console.log(postData);
    if (postData.replyTo) {
      emitNotification(postData.replyTo.postedBy);
      location.reload();
    } else {
      var canvas = cropper?.getCroppedCanvas();

      if (canvas !== undefined) {
        canvas.toBlob((blob) => {
          var formData = new FormData();
          formData.append("croppedImage", blob);
          $.ajax({
            url: `/api/posts/${postData._id}/photo`,
            type: "PUT",
            data: formData,
            processData: false,
            contentType: false,
            success: () => {},
          });
        });
      }

      var html = createPostHtml(postData);
      $(".postsContainer").prepend(html);
      textbox.val("");
      button.prop("disabled", true);
      location.reload();
    }
  });
});

$("#replyModal").on("show.bs.modal", (event) => {
  var button = $(event.relatedTarget);
  var postId = getPostIdFromElement(button);

  $("#submitReplyButton").data("id", postId);

  $.get("/api/posts/" + postId, (results) => {
    outputPosts(results.postData, $("#originalPostContainer"));
  });
});

$("#replyModal").on("hidden.bs.modal", () =>
  $("#originalPostContainer").html("")
);

$("#deletePostModal").on("show.bs.modal", (event) => {
  var button = $(event.relatedTarget);
  var postId = getPostIdFromElement(button);
  $("#deletePostButton").data("id", postId);
});

$("#deletePostButton").click((event) => {
  var postId = $(event.target).data("id");

  $.ajax({
    url: `/api/posts/${postId}`,
    type: "DELETE",
    success: (data, status, xhr) => {
      if (xhr.status != 202) {
        alert("could not delete post");
        return;
      }
      location.reload();
    },
  });
});

$("#confirmPinModal").on("show.bs.modal", (event) => {
  var button = $(event.relatedTarget);
  var postId = getPostIdFromElement(button);

  $("#pinPostButton").data("id", postId);
});

$("#pinPostButton").click((event) => {
  var postId = $(event.target).data("id");

  $.ajax({
    url: `/api/posts/${postId}`,
    type: "PUT",
    data: { pinned: true },
    success: (data, status, xhr) => {
      if (xhr.status != 204) {
        alert("could not delete post");
        return;
      }
      location.reload();
    },
  });
});

$("#unpinModal").on("show.bs.modal", (event) => {
  var button = $(event.relatedTarget);
  var postId = getPostIdFromElement(button);
  $("#unpinPostButton").data("id", postId);
});

$("#unpinPostButton").click((event) => {
  var postId = $(event.target).data("id");

  $.ajax({
    url: `/api/posts/${postId}`,
    type: "PUT",
    data: { pinned: false },
    success: (data, status, xhr) => {
      if (xhr.status != 204) {
        alert("could not delete post");
        return;
      }

      location.reload();
    },
  });
});

$("#filePhoto").change(function () {
  if (this.files && this.files[0]) {
    var reader = new FileReader();
    reader.onload = (e) => {
      var image = document.getElementById("imagePreview");
      image.src = e.target.result;
      if (cropper !== undefined) {
        cropper.destroy();
      }
      cropper = new Cropper(image, {
        aspectRatio: 1 / 1,
        background: false,
      });
    };
    reader.readAsDataURL(this.files[0]);
  }
});

$("#imageUploadButton").click(() => {
  var canvas = cropper.getCroppedCanvas();

  if (canvas == null) {
    alert("Could not upload image. Make sure it is an image file.");
    return;
  }

  canvas.toBlob((blob) => {
    var formData = new FormData();
    formData.append("croppedImage", blob);

    $.ajax({
      url: "/api/users/profilePicture",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: () => location.reload(),
    });
  });
});

$("#coverPhoto").change(function () {
  if (this.files && this.files[0]) {
    var reader = new FileReader();
    reader.onload = (e) => {
      var image = document.getElementById("coverPreview");
      image.src = e.target.result;

      if (cropper !== undefined) {
        cropper.destroy();
      }

      cropper = new Cropper(image, {
        aspectRatio: 16 / 9,
        background: false,
      });
    };
    reader.readAsDataURL(this.files[0]);
  }
});

$("#coverPhotoButton").click(() => {
  var canvas = cropper.getCroppedCanvas();

  if (canvas == null) {
    alert("Could not upload image. Make sure it is an image file.");
    return;
  }

  canvas.toBlob((blob) => {
    var formData = new FormData();
    formData.append("croppedImage", blob);
    $.ajax({
      url: "/api/users/coverPhoto",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: () => location.reload(),
    });
  });
});

$("#inputTag").change(function () {
  if (this.files && this.files[0]) {
    var reader = new FileReader();
    reader.onload = (e) => {
      var image = document.getElementById("imagePreview1");
      image.src = e.target.result;
      if (cropper !== undefined) {
        cropper.destroy();
      }
      cropper = new Cropper(image, {
        aspectRatio: 1 / 0.7,
        background: false,
      });
    };
    reader.readAsDataURL(this.files[0]);
  }
});

$("#userSearchTextbox").keydown((event) => {
  clearTimeout(timer);
  var textbox = $(event.target);
  var value = textbox.val();

  if (value == "" && (event.which == 8 || event.keyCode == 8)) {
    selectedUsers.pop();
    updateSelectedUsersHtml();
    $(".resultsContainer").html("");

    if (selectedUsers.length == 0) {
      $("#createChatButton").prop("disabled", true);
    }

    return;
  }

  timer = setTimeout(() => {
    value = textbox.val().trim();

    if (value == "") {
      $(".resultsContainer").html("");
    } else {
      searchUsers(value);
    }
  }, 1000);
});

$("#createChatButton").click(() => {
  console.log(userLoggedIn._id);
  var data = JSON.stringify(selectedUsers);

  $.post("/api/chats", { users: data }, (chat) => {
    if (!chat || !chat._id) return alert("Invalid response from server.");

    window.location.href = `/messages/${chat._id}`;
  });
});

$(document).on("click", ".likeButton", () => {
  var button = $(event.target);
  var postId = getPostIdFromElement(button);
  console.log(postId);
  if (postId === undefined) return;
  $.ajax({
    url: `/api/posts/${postId}/like`,
    type: "PUT",
    success: (postData) => {
      button.find("span").text(postData.likes.length || "");
      if (postData.likes.includes(userLoggedIn._id)) {
        button.addClass("active");
        emitNotification(postData.postedBy);
      } else {
        button.removeClass("active");
      }
    },
  });
});

$(document).on("click", ".retweetButton", (event) => {
  var button = $(event.target);
  var postId = getPostIdFromElement(button);
  if (postId === undefined) return;

  $.ajax({
    url: `/api/posts/${postId}/retweet`,
    type: "POST",
    success: (postData) => {
      button.find("span").text(postData.retweetUsers.length || "");

      if (postData.retweetUsers.includes(userLoggedIn._id)) {
        button.addClass("active");
        emitNotification(postData.postedBy);
      } else {
        button.removeClass("active");
      }
    },
  });
});

$(document).on("click", ".obutton1", () => {
  var button = $(event.target);
  var postId = getPostIdFromElement(button);
  if (postId === undefined) return;
  $.ajax({
    url: `/api/posts/${postId}/optionOne`,
    type: "PUT",
    success: (postData) => {
      button.find("span").text(postData?.optionOne?.length || "");
      document.getElementsByClassName("spanNeutral")[0].innerHTML = "";
      document.getElementsByClassName("spanOptionTwo")[0].innerHTML = "";
    },
  });
});
$(document).on("click", ".obutton2", () => {
  var button = $(event.target);
  var postId = getPostIdFromElement(button);
  if (postId === undefined) return;
  $.ajax({
    url: `/api/posts/${postId}/neutral`,
    type: "PUT",
    success: (postData) => {
      button.find("span").text(postData?.neutral?.length || "");
      document.getElementsByClassName("spanOptionOne")[0].innerHTML = "";
      document.getElementsByClassName("spanOptionTwo")[0].innerHTML = "";
    },
  });
});
$(document).on("click", ".obutton3", () => {
  var button = $(event.target);
  var postId = getPostIdFromElement(button);
  if (postId === undefined) return;
  $.ajax({
    url: `/api/posts/${postId}/optionTwo`,
    type: "PUT",
    success: (postData) => {
      button.find("span").text(postData?.optionTwo?.length || "");
      document.getElementsByClassName("spanOptionOne")[0].innerHTML = "";
      document.getElementsByClassName("spanNeutral")[0].innerHTML = "";
    },
  });
});

$(document).on("click", ".Match", () => {
  handleMatchButtonClick();

  var button = $(event.target);
  var postId = getPostIdFromElement(button);
  var userId = userLoggedIn._id;

  var users;
  function getUsers(i) {
    console.log("entered");
    setTimeout(() => {
      $.get(`/api/posts/${postId}/${userId}/match`, (results) => {
        console.log("result: " + results.length);
        console.log("result: " + JSON.stringify(results));
        if (results === "select") {
          $(".matchmaking-message").text(
            "Please Select any Option before matching"
          );

          return location.reload();
        }
        if (results.length == 0 && i < 15) {
          getUsers(i + 1);
        } else if (results.length !== 0) {
          var data = JSON.stringify(results);
          $.post("/api/chats", { users: data, gameMode: "ON" }, (chat) => {
            if (!chat || !chat._id)
              return alert("Invalid response from server.");

            socket.emit("send reload", chat);

            window.location.href = `/messages/${chat._id}`;
          });
        }
      });
    }, 1000); // delay for 1 second (1000 milliseconds)
  }

  getUsers(0);
});

$(document).on("click", ".AutoMatch", () => {
  handleMatchButtonClick();

  var userId = userLoggedIn._id;

  var users;
  function getUsers(i) {
    console.log("entered");
    setTimeout(() => {
      $.get(`/api/posts/${userId}/automatch`, (results) => {
        console.log("result: " + results.length);
        console.log("result: " + JSON.stringify(results));
        if (results === "select") {
          $(".matchmaking-message").text(
            "Please Select any Option before matching"
          );

          return location.reload();
        }
        if (results.length == 0 && i < 15) {
          getUsers(i + 1);
        } else if (results.length !== 0) {
          users = results;
          var data = JSON.stringify(users);
          $.post("/api/chats", { users: data, gameMode: "Auto" }, (chat) => {
            if (!chat || !chat._id)
              return alert("Invalid response from server.");

            socket.emit("send reload", chat);

            window.location.href = `/messages/${chat._id}`;
          });
        }
      });
    }, 1000); // delay for 1 second (1000 milliseconds)
  }

  getUsers(0);
});

function handleMatchButtonClick() {
  $(".matchmaking-overlay").show();
  var countdown = 30;
  var countdownInterval = setInterval(() => {
    countdown--;
    $(".matchmaking-countdown").text(countdown);
    if (countdown == 0) {
      clearInterval(countdownInterval);
      $(".matchmaking-overlay").hide();
    }
    if (countdown == 2) {
      $(".matchmaking-message").text("Server Error");
    }
  }, 1000);

  const popup = document.querySelector(".matchmaking-popup");
  $(".matchmaking-popup").css("visibility", "visible");

  // Disable all clickable elements on the page
  const clickableElements = document.querySelectorAll(
    'a, button, input[type="submit"], input[type="button"]'
  );
  clickableElements.forEach(function (element) {
    element.disabled = true;
  });

  // Set a timeout to hide the popup and re-enable clickable elements after 30 seconds
  setTimeout(function () {
    $(".matchmaking-popup").css("visibility", "hidden");

    clickableElements.forEach(function (element) {
      element.disabled = false;
    });
  }, 30000); // 30 seconds
}

$(document).on("click", ".buttonOne", (event) => {
  const chatContainer = document.querySelector(".chatContainer");
  const chatId = chatContainer.getAttribute("data-room");

  $.get(`/api/chats/${chatId}`, (chat) => {
    var allUsers = [...chat.userOne, ...chat.userTwo];

    const alreadyVoted = allUsers.some((user) => user === userLoggedIn._id);

    if (!alreadyVoted) {
      $.ajax({
        url: "/api/chats/" + chatId,
        type: "PUT",
        data: { optionOne: true },
        success: (data, status, xhr) => {
          if (xhr.status != 200) {
            alert("could not update");
          } else {
            if (data.userOne.length == 2) {
              $.ajax({
                url: `/api/users/${chatId}`,
                type: "PUT",
                data: { changeGameMode: true },
                success: (chat, status, xhr) => {
                  socket.emit("send reload", chat);
                  window.location.href = `/messages/${chat._id}`;
                },
              });
            } else if (data.userOne.length == 1 && data.userTwo.length == 1) {
              $.ajax({
                url: `/api/users/${chatId}`,
                type: "PUT",
                data: { changeGameMode: true },
                success: (chat, status, xhr) => {
                  socket.emit("send reload", chat);
                  window.location.href = `/messages/${chat._id}`;
                },
              });
            }
          }
        },
      });
    }
  });
});
$(document).on("click", ".buttonTwo", (event) => {
  const chatContainer = document.querySelector(".chatContainer");
  const chatId = chatContainer.getAttribute("data-room");

  $.get(`/api/chats/${chatId}`, (chat) => {
    var allUsers = [...chat.userOne, ...chat.userTwo];

    const alreadyVoted = allUsers.some((user) => user === userLoggedIn._id);

    if (!alreadyVoted) {
      $.ajax({
        url: "/api/chats/" + chatId,
        type: "PUT",
        data: { optionTwo: true },
        success: (data, status, xhr) => {
          if (xhr.status != 200) {
            alert("could not update");
          } else {
            if (data.userTwo.length == 2) {
              $.ajax({
                url: `/api/users/${chatId}`,
                type: "PUT",
                data: { changeGameMode: true },
                success: (data, status, xhr) => {},
              });
            } else if (data.userOne.length == 1 && data.userTwo.length == 1) {
              $.ajax({
                url: `/api/users/${chatId}`,
                type: "PUT",
                data: { changeGameMode: true },
                success: (data, status, xhr) => {},
              });
            }
            // location.reload();
          }
        },
      });
    }
  });
});

$(document).on("click", ".post", (event) => {
  var element = $(event.target);
  var postId = getPostIdFromElement(element);

  if (postId !== undefined && !element.is("button")) {
    window.location.href = "/posts/" + postId;
  }
});

$(document).on("click", ".followButton", (e) => {
  var button = $(e.target);
  var userId = button.data().user;

  $.ajax({
    url: `/api/users/${userId}/follow`,
    type: "PUT",
    success: (data, status, xhr) => {
      if (xhr.status == 404) {
        alert("user not found");
        return;
      }
      var difference = 1;
      if (data.following && data.following.includes(userId)) {
        button.addClass("following");
        button.text("Following");
        emitNotification(userId);
      } else {
        button.removeClass("following");
        button.text("Follow");
        difference = -1;
      }
      var followersLabel = $("#followersValue");
      if (followersLabel.length != 0) {
        var followersText = followersLabel.text();
        followersText = parseInt(followersText);
        followersLabel.text(followersText + difference);
      }
    },
  });
});

$(document).on("click", ".notification.active", (e) => {
  var container = $(e.target);
  var notificationId = container.data().id;

  var href = container.attr("href");
  e.preventDefault();

  var callback = () => (window.location = href);
  markNotificationsAsOpened(notificationId, callback);
});

function getPostIdFromElement(element) {
  var isRoot = element.hasClass("post");
  var rootElement = isRoot == true ? element : element.closest(".post");
  var postId = rootElement.data().id;

  if (postId === undefined) return alert("Post id undefined");

  return postId;
}

function createPostHtml(postData, largeFont = false) {
  var showOptionOne = "";
  var showOptionTwo = "";
  if (!postData.replyTo) {
    showOptionOne = postData.oneContent;
    showOptionTwo = postData.twoContent;
  }

  if (postData == null) return alert("post object is null");
  var isRetweet = postData.retweetData !== undefined;
  var retweetedBy = isRetweet ? postData.postedBy.username : null;
  postData = isRetweet ? postData.retweetData : postData;

  if (isRetweet) {
    showOptionOne = postData.oneContent;
    showOptionTwo = postData.twoContent;
  }

  var postedBy = postData.postedBy;
  if (postedBy._id === undefined) {
    return console.log("User object not populated");
  }
  var displayName = postedBy.firstName + " " + postedBy.lastName;

  var timestamp = timeDifference(new Date(), new Date(postData.createdAt));

  var likeButtonActiveClass = postData.likes.includes(userLoggedIn._id)
    ? "active"
    : "";
  var optionOneActiveClass = postData.optionOne.includes(userLoggedIn._id)
    ? "active"
    : "";
  var neutralActiveClass = postData.neutral.includes(userLoggedIn._id)
    ? "active"
    : "";
  var optionTwoActiveClass = postData.optionTwo.includes(userLoggedIn._id)
    ? "active"
    : "";

  var retweetButtonActiveClass = postData.retweetUsers.includes(
    userLoggedIn._id
  )
    ? "active"
    : "";

  var largeFontClass = largeFont ? "largeFont" : "";

  var retweetText = "";
  if (isRetweet) {
    retweetText = `<span>
                          <i class='fas fa-retweet'></i>
                          Retweeted by <a href='/profile/${retweetedBy}'>@${retweetedBy}</a>    
                      </span>`;
  }

  var replyFlag = "";
  if (postData.replyTo && postData.replyTo._id) {
    if (!postData.replyTo._id) {
      return alert("Reply to is not populated");
    } else if (!postData.replyTo.postedBy._id) {
      return alert("Posted by is not populated");
    }

    showOptionOne = postData.originalPost.oneContent;
    showOptionTwo = postData.originalPost.twoContent;

    var replyToUsername = postData.replyTo.postedBy.username;
    replyFlag = `<div class='replyFlag'>
                        Replying to <a href='/profile/${replyToUsername}'>@${replyToUsername}<a>
                    </div>`;
  }
  var buttons = "";
  var pinnedPostText = "";
  if (postData.postedBy._id == userLoggedIn._id) {
    var pinnedClass = "";
    var dataTarget = "#confirmPinModal";

    if (postData.pinned === true) {
      pinnedClass = "active";
      dataTarget = "#unpinModal";
      pinnedPostText =
        "<i class='fas fa-thumbtack'></i> <span>Pinned post</span>";
    }
    var deleteButton = "";
    if (!isRetweet) {
      var deleteButton = `<button data-id="${postData._id}" data-toggle="modal" data-target="#deletePostModal"><i class='fas fa-times'></i></button>`;
    }

    buttons = `<button class='pinButton ${pinnedClass}' data-id="${postData._id}" data-toggle="modal" data-target="${dataTarget}"><i class='fas fa-thumbtack'></i></button>
              ${deleteButton}`;
  }
  var postImagePreview = "";
  if (postData.postPic !== "null") {
    postImagePreview = `<img src="${postData.postPic}"/>`;
  }

  return `<div class='post ${largeFontClass}' data-id='${postData._id}'>
            <div class='postActionContainer'>
              ${retweetText}
            </div>
            <div class='mainContentContainer'>
              <div class='userImageContainer'>
                <img src='${postedBy.profilePic}'>
              </div>
              <div class='postContentContainer'>
                <div class='pinnedPostText'>${pinnedPostText}</div>
                <div class='header'>
                  <a href='/profile/${
                    postedBy.username
                  }' class='displayName'>${displayName}</a>
                  <span class='username'>@${postedBy.username}</span>
                  <span class='date'>${timestamp}</span>
                  ${buttons}
                </div>
                ${replyFlag}
                <div class='postBody'>
                  <span>${postData.content}</span>
                </div>
                <div class='postImagePreview'>
                  ${postImagePreview}
                </div>
                <div class='postFooter'>
                  <div class="topButtons">
                    <div id="idOptionOne" class="optionButton ">
                      <button class="obutton1 ${optionOneActiveClass}" >
                      <span class="spanOptionOne">${
                        postData?.optionOne?.length || ""
                      }</span>
                      </span>${showOptionOne}</span>
                      </button>
                    </div>
                    <div id="idNeutral" class="optionButton ">
                      <button class="obutton2 ${neutralActiveClass}">
                      <span class="spanNeutral">${
                        postData?.neutral?.length || ""
                      }</span>
                      </span>Uncertain</span>
                      </button>
                    </div>
                    <div id="idOptionTwo" class="optionButton ">
                      <button class="obutton3 ${optionTwoActiveClass}">
                      <span class="spanOptionTwo">${
                        postData?.optionTwo?.length || ""
                      }</span>
                      </span>${showOptionTwo}</span>
                      </button>
                    </div>
                  </div>
                  <div class="bottomButtons">
                    <div class="postButtonContainer">
                      <button data-toggle="modal" data-target="#replyModal">
                        <i class="far fa-comment"></i>
                        <span>${postData.replies.length || ""}</span>
                      </button>
                    </div>
                    <div class="postButtonContainer green">
                      <button class="retweetButton ${retweetButtonActiveClass}">
                        <i class="fas fa-retweet"></i>
                        <span>${postData.retweetUsers.length || ""}</span>  
                      </button>
                    </div>
                    <div class="postButtonContainer red">
                      <button class="likeButton ${likeButtonActiveClass}">
                        <i class="far fa-heart"></i>
                        <span>${postData.likes.length || ""}</span>
                      </button>
                    </div>
                    <div class="Match">
                      <button class="obutton">
                        <span>Match</span>
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>`;
}

function outputPosts(results, container) {
  container.html("");

  if (!Array.isArray(results)) {
    results = [results];
  }

  results.forEach((result) => {
    var html = createPostHtml(result);
    container.append(html);
  });

  if (results.length == 0) {
    container.append("<div class='noResults'></div>");
  }
}

function outputPostsWithReplies(results, container) {
  container.html("");

  if (results.replyTo !== undefined && results.replyTo._id !== undefined) {
    var html = createPostHtml(results.replyTo);
    container.append(html);
  }
  var mainPostHtml = createPostHtml(results.postData, true);
  container.append(mainPostHtml);

  results.replies.forEach((result) => {
    var html = createPostHtml(result);
    container.append(html);
  });
}

function outputUsers(results, container) {
  container.html("");

  results.forEach((result) => {
    var html = createUserHtml(result, true);
    container.append(html);
  });

  if (results.length == 0) {
    container.append("<div class='noResults'></div>");
  }
}

function createUserHtml(userData, showFollowButton) {
  var name = userData.firstName + " " + userData.lastName;

  var isFollowing =
    userLoggedIn.following && userLoggedIn.following.includes(userData._id);
  var text = isFollowing ? "Following" : "Follow";
  var buttonClass = isFollowing ? "followButton following" : "followButton";

  var followButton = "";
  if (showFollowButton && userLoggedIn._id != userData._id) {
    followButton = `<div class='followButtonContainer'>
                            <button class='${buttonClass}' data-user='${userData._id}'>${text}</button>
                        </div>`;
  }

  return `<div class='user'>
            <div class='userImageContainer'>
                <img src='${userData.profilePic}'>
            </div>
            <div class='userDetailsContainer'>
                <div class='header'>
                    <a href='/profile/${userData.username}'>${name}</a>
                    <span class='username'>@${userData.username}</span>
                </div>
            </div>
            ${followButton}
          </div>`;
}

function searchUsers(searchTerm) {
  $.get("/api/users", { search: searchTerm }, (results) => {
    outputSelectableUsers(results, $(".resultsContainer"));
  });
}

function outputSelectableUsers(results, container) {
  container.html("");
  results.forEach((result) => {
    if (
      result._id == userLoggedIn._id ||
      selectedUsers.some((u) => u._id == result._id)
    ) {
      return;
    }
    var html = createUserHtml(result, false);

    var element = $(html);
    element.click(() => userSelected(result));

    container.append(element);
  });
  if (results.length == 0) {
    container.append("<span class='noResults'>No results found</span>");
  }
}

function userSelected(user) {
  selectedUsers.push(user);
  updateSelectedUsersHtml();
  $("#userSearchTextbox").val("").focus();
  $(".resultsContainer").html("");
  $("#createChatButton").prop("disabled", false);
}
function updateSelectedUsersHtml() {
  var elements = [];

  selectedUsers.forEach((user) => {
    var name = user.firstName + " " + user.lastName;
    var userElement = $(`<span class='selectedUser'>${name}</span>`);
    elements.push(userElement);
  });

  $(".selectedUser").remove();
  $("#selectedUsers").prepend(elements);
}

function getChatName(chatData) {
  var chatName = chatData.chatName;

  if (!chatName) {
    var otherChatUsers = getOtherChatUsers(chatData.users);
    var namesArray = otherChatUsers.map(
      (user) => user.firstName + " " + user.lastName
    );
    chatName = namesArray.join(", ");
  }

  return chatName;
}

function getOtherChatUsers(users) {
  if (users.length == 1) return users;

  return users.filter((user) => user._id != userLoggedIn._id);
}

function messageReceived(newMessage) {
  if ($(`[data-room="${newMessage.chat._id}"]`).length == 0) {
    showMessagePopup(newMessage);
  } else {
    addChatMessageHtml(newMessage);
  }

  refreshMessagesBadge();
}

function markNotificationsAsOpened(notificationId = null, callback = null) {
  if (callback == null) callback = () => location.reload();

  var url =
    notificationId != null
      ? `/api/notifications/${notificationId}/markAsOpened`
      : `/api/notifications/markAsOpened`;
  $.ajax({
    url: url,
    type: "PUT",
    success: () => callback(),
  });
}

function refreshMessagesBadge() {
  $.get("/api/chats", { unreadOnly: true }, (data) => {
    var numResults = data.length;

    if (numResults > 0) {
      $("#messagesBadge").text(numResults).addClass("active");
    } else {
      $("#messagesBadge").text("").removeClass("active");
    }
  });
}

function refreshNotificationsBadge() {
  $.get("/api/notifications", { unreadOnly: true }, (data) => {
    var numResults = data.length;

    if (numResults > 0) {
      $("#notificationBadge").text(numResults).addClass("active");
    } else {
      $("#notificationBadge").text("").removeClass("active");
    }
  });
}

function showNotificationPopup(data) {
  var html = createNotificationHtml(data);
  var element = $(html);
  element.hide().prependTo("#notificationList").slideDown("fast");

  setTimeout(() => element.fadeOut(200), 5000);
}

function showMessagePopup(data) {
  if (!data.chat.latestMessage._id) {
    data.chat.latestMessage = data;
  }

  var html = createChatHtml(data.chat);
  var element = $(html);
  element.hide().prependTo("#notificationList").slideDown("fast");

  setTimeout(() => element.fadeOut(400), 5000);
}

function outputNotificationList(notifications, container) {
  notifications.forEach((notification) => {
    var html = createNotificationHtml(notification);
    container.append(html);
  });

  if (notifications.length == 0) {
    container.append("<span class='noResults'></span>");
  }
}

function createNotificationHtml(notification) {
  console.log(notification);
  var userFrom = notification.userFrom;
  var text = getNotificationText(notification);
  var href = getNotificationUrl(notification);
  var className = notification.opened ? "" : "active";

  return `<a href='${href}' class='resultListItem notification ${className}' data-id='${notification._id}'>
              <div class='resultsImageContainer'>
                  <img src='${userFrom.profilePic}'>
              </div>
              <div class='resultsDetailsContainer ellipsis'>
                  <span class='ellipsis'>${text}</span>
                  <span class='ellipsis'>Status:${notification.status} User: ${notification.userFrom.firstName}</span>
              </div>
          </a>`;
}

function getNotificationText(notification) {
  var userFrom = notification.userFrom;

  if (!userFrom.firstName || !userFrom.lastName) {
    return alert("user from data not populated");
  }
  var userFromName = `${userFrom.firstName} ${userFrom.lastName}`;
  var text;
  if (notification.notificationType == "retweet") {
    text = `${userFromName} retweeted one of your posts`;
  } else if (notification.notificationType == "postLike") {
    text = `${userFromName} liked one of your posts`;
  } else if (notification.notificationType == "reply") {
    text = `${userFromName} replied to one of your posts`;
  } else if (notification.notificationType == "follow") {
    text = `${userFromName} followed you`;
  } else if (notification.notificationType == "matching") {
    text = `Game Mode ${notification.gameMode} Recruitment`;
  }
  return `<span class='ellipsis'>${text}</span>`;
}

function getNotificationUrl(notification) {
  var url = "#";

  if (
    notification.notificationType == "retweet" ||
    notification.notificationType == "postLike" ||
    notification.notificationType == "reply" ||
    notification.notificationType == "matching"
  ) {
    url = `/posts/${notification.entityId}`;
  } else if (notification.notificationType == "follow") {
    url = `/profile/${notification.entityId}`;
  }
  return url;
}

function createChatHtml(chatData) {
  var chatName = getChatName(chatData);

  var image = getChatImageElements(chatData);

  var latestMessage = getLatestMessage(chatData.latestMessage);

  var activeClass =
    !chatData.latestMessage ||
    chatData.latestMessage.readBy.includes(userLoggedIn._id)
      ? ""
      : "active";

  return `<a href='/messages/${chatData._id}' class='resultListItem ${activeClass}'>
                ${image}
                <div class='resultsDetailsContainer ellipsis'>
                    <span class='heading ellipsis'>${chatName}</span>
                    <span class='subText ellipsis'>${latestMessage}</span>
                </div>
            </a>`;
}

function getLatestMessage(latestMessage) {
  if (latestMessage != null) {
    var sender = latestMessage.sender;
    return `${sender.firstName} ${sender.lastName}: ${latestMessage.content}`;
  }

  return "New chat";
}

function getChatImageElements(chatData) {
  var otherChatUsers = getOtherChatUsers(chatData.users);

  var groupChatClass = "";
  var chatImage = getUserChatImageElement(otherChatUsers[0]);

  if (otherChatUsers.length > 1) {
    groupChatClass = "groupChatImage";
    chatImage += getUserChatImageElement(otherChatUsers[1]);
  }

  return `<div class='resultsImageContainer ${groupChatClass}'>${chatImage}</div>`;
}

function getUserChatImageElement(user) {
  if (!user || !user.profilePic) {
    return alert("User passed into function is invalid");
  }

  return `<img src='${user.profilePic}' alt='User's profile pic'>`;
}

function timeDifference(current, previous) {
  var msPerMinute = 60 * 1000;
  var msPerHour = msPerMinute * 60;
  var msPerDay = msPerHour * 24;
  var msPerMonth = msPerDay * 30;
  var msPerYear = msPerDay * 365;

  var elapsed = current - previous;

  if (elapsed < msPerMinute) {
    if (elapsed / 1000 < 30) return "Just now";

    return Math.round(elapsed / 1000) + " sec ago";
  } else if (elapsed < msPerHour) {
    return Math.round(elapsed / msPerMinute) + " min ago";
  } else if (elapsed < msPerDay) {
    return Math.round(elapsed / msPerHour) + " h ago";
  } else if (elapsed < msPerMonth) {
    return Math.round(elapsed / msPerDay) + " d ago";
  } else if (elapsed < msPerYear) {
    return Math.round(elapsed / msPerMonth) + " m ago";
  } else {
    return Math.round(elapsed / msPerYear) + " y ago";
  }
}
