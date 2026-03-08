import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Migration "migration";

import MixinAuthorization "authorization/MixinAuthorization";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";

// Enable State Migration via with-clause
(with migration = Migration.run)
actor {
  // Storage
  include MixinStorage();

  // Access Control
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type User = {
    id : Principal;
    name : Text;
    email : Text;
    passwordHash : Text;
    avatarUrl : Text;
    bio : Text;
    followerCount : Nat;
    followingCount : Nat;
    isOnline : Bool;
    lastSeen : Int;
    pinnedVideoIds : [Nat];
  };

  public type UserProfile = {
    name : Text;
    email : Text;
    avatarUrl : Text;
    bio : Text;
    followerCount : Nat;
    followingCount : Nat;
    isOnline : Bool;
    lastSeen : Int;
  };

  public type Video = {
    id : Nat;
    creator : Principal;
    title : Text;
    caption : Text;
    videoUrl : Text;
    thumbnailUrl : Text;
    hashtags : [Text];
    privacy : Text;
    likeCount : Nat;
    commentCount : Nat;
    shareCount : Nat;
    viewCount : Nat;
    createdAt : Int;
  };

  public type FileMetadata = {
    id : Nat;
    creator : Principal;
    fileName : Text;
    contentType : Text;
    fileSize : Nat;
    externalBlob : Storage.ExternalBlob;
    uploadedAt : Int;
  };

  public type Comment = {
    id : Nat;
    videoId : Nat;
    author : Principal;
    text : Text;
    likeCount : Nat;
    replyToId : ?Nat;
    createdAt : Int;
  };

  public type Story = {
    id : Nat;
    creator : Principal;
    mediaUrl : Text;
    mediaType : Text;
    textOverlay : Text;
    expiresAt : Int;
    createdAt : Int;
    viewerCount : Nat;
  };

  public type DirectMessage = {
    id : Nat;
    fromUser : Principal;
    toUser : Principal;
    text : Text;
    createdAt : Int;
    isRead : Bool;
  };

  public type ConversationSummary = {
    otherUser : Principal;
    lastMessage : Text;
    lastMessageAt : Int;
    unreadCount : Nat;
  };

  public type VideoInteractionState = {
    liked : Bool;
    bookmarked : Bool;
    likeCount : Nat;
    commentCount : Nat;
    shareCount : Nat;
  };

  let users = Map.empty<Principal, User>();
  let videos = Map.empty<Nat, Video>();
  let fileMetadata = Map.empty<Nat, FileMetadata>();
  let comments = Map.empty<Nat, Comment>();
  let stories = Map.empty<Nat, Story>();
  let storyViews = Map.empty<Nat, Set.Set<Principal>>();
  let directMessages = Map.empty<Nat, DirectMessage>();

  let followMap = Map.empty<Principal, Set.Set<Principal>>();
  var allUserIds : [Principal] = [];
  var videoIdCounter = 0;
  var fileMetadataIdCounter = 0;
  var commentIdCounter = 0;
  var storyIdCounter = 0;
  var messageIdCounter = 0;

  // New interaction tracking maps
  let videoLikes = Map.empty<Nat, Set.Set<Principal>>();
  let videoBookmarks = Map.empty<Nat, Set.Set<Principal>>();
  let commentLikes = Map.empty<Nat, Set.Set<Principal>>();

  func userToProfile(user : User) : UserProfile {
    {
      name = user.name;
      email = user.email;
      avatarUrl = user.avatarUrl;
      bio = user.bio;
      followerCount = user.followerCount;
      followingCount = user.followingCount;
      isOnline = user.isOnline;
      lastSeen = user.lastSeen;
    };
  };

  // File Upload
  public shared ({ caller }) func uploadFile(
    fileName : Text,
    contentType : Text,
    fileSize : Nat,
    externalBlob : Storage.ExternalBlob,
  ) : async FileMetadata {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload files");
    };

    if (not users.containsKey(caller)) {
      Runtime.trap("User not registered");
    };

    let newFile : FileMetadata = {
      id = fileMetadataIdCounter;
      creator = caller;
      fileName;
      contentType;
      fileSize;
      externalBlob;
      uploadedAt = Time.now();
    };

    fileMetadata.add(fileMetadataIdCounter, newFile);
    fileMetadataIdCounter += 1;
    newFile;
  };

  public query ({ caller }) func getAllFiles() : async [FileMetadata] {
    let iter = fileMetadata.values();
    let array = iter.toArray();
    array;
  };

  public query ({ caller }) func getFilesByCreator(creator : Principal) : async [FileMetadata] {
    let iter = fileMetadata.values();
    let filtered = iter.filter(func(file) { file.creator == creator });
    filtered.toArray();
  };

  public query ({ caller }) func getFileById(fileId : Nat) : async ?FileMetadata {
    fileMetadata.get(fileId);
  };

  // Video CRUD
  public shared ({ caller }) func addVideo(
    title : Text,
    caption : Text,
    videoUrl : Text,
    thumbnailUrl : Text,
    hashtags : [Text],
    privacy : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload videos");
    };

    if (not users.containsKey(caller)) {
      Runtime.trap("User not registered");
    };

    let newVideo : Video = {
      id = videoIdCounter;
      creator = caller;
      title;
      caption;
      videoUrl;
      thumbnailUrl;
      hashtags;
      privacy;
      likeCount = 0;
      commentCount = 0;
      shareCount = 0;
      viewCount = 0;
      createdAt = Time.now();
    };

    videos.add(videoIdCounter, newVideo);
    videoIdCounter += 1;

    newVideo.id;
  };

  public query ({ caller }) func getAllVideos() : async [Video] {
    let iter = videos.values();
    let array = iter.toArray();
    array.sort(
      func(a, b) {
        if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else {
        #equal;
        };
      }
    );
  };

  public query ({ caller }) func getVideosByCreator(creator : Principal) : async [Video] {
    let iter = videos.values();
    let filtered = iter.filter(func(video) { video.creator == creator });
    let filteredArray = filtered.toArray();
    filteredArray.sort(
      func(a, b) {
        if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else {
        #equal;
        };
      }
    );
  };

  public query ({ caller }) func getUserVideos(userId : Principal) : async [Video] {
    let iter = videos.values();
    let filtered = iter.filter(func(video) { video.creator == userId });
    let filteredArray = filtered.toArray();
    filteredArray.sort(
      func(a, b) {
        if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else {
        #equal;
        };
      }
    );
  };

  // Core like logic with deduplication
  public shared ({ caller }) func toggleLikeVideo(videoId : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like videos");
    };

    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        let currentLikes = switch (videoLikes.get(videoId)) {
          case (null) {
            let newSet = Set.empty<Principal>();
            videoLikes.add(videoId, newSet);
            newSet;
          };
          case (?likes) { likes };
        };

        let isLiked = currentLikes.contains(caller);

        if (isLiked) {
          // Unlike scenario
          currentLikes.remove(caller);
          let updatedVideo = {
            video with
            likeCount = if (video.likeCount > 0) { video.likeCount - 1 : Nat } else { 0 };
          };
          videos.add(videoId, updatedVideo);
        } else {
          // New like scenario
          currentLikes.add(caller);
          let updatedVideo = {
            video with
            likeCount = video.likeCount + 1;
          };
          videos.add(videoId, updatedVideo);
        };
        not isLiked;
      };
    };
  };

  // Backwards compatible likeVideo using core deduplication logic
  public shared ({ caller }) func likeVideo(videoId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like videos");
    };

    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        let currentLikes = switch (videoLikes.get(videoId)) {
          case (null) {
            let newSet = Set.empty<Principal>();
            videoLikes.add(videoId, newSet);
            newSet;
          };
          case (?likes) { likes };
        };

        // Only increment if not already liked
        if (not currentLikes.contains(caller)) {
          currentLikes.add(caller);
          let updatedVideo = {
            video with
            likeCount = video.likeCount + 1;
          };
          videos.add(videoId, updatedVideo);
        };
      };
    };
  };

  // Backwards compatible unlikeVideo using core deduplication logic
  public shared ({ caller }) func unlikeVideo(videoId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike videos");
    };

    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        let currentLikes = switch (videoLikes.get(videoId)) {
          case (null) {
            let newSet = Set.empty<Principal>();
            videoLikes.add(videoId, newSet);
            newSet;
          };
          case (?likes) { likes };
        };

        // Only decrement if currently liked
        if (currentLikes.contains(caller)) {
          currentLikes.remove(caller);
          let updatedVideo = {
            video with
            likeCount = if (video.likeCount > 0) { video.likeCount - 1 : Nat } else { 0 };
          };
          videos.add(videoId, updatedVideo);
        };
      };
    };
  };

  // Bookmark logic with deduplication
  public shared ({ caller }) func toggleBookmarkVideo(videoId : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can bookmark videos");
    };

    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?_) {
        let currentBookmarks = switch (videoBookmarks.get(videoId)) {
          case (null) {
            let newSet = Set.empty<Principal>();
            videoBookmarks.add(videoId, newSet);
            newSet;
          };
          case (?bookmarks) { bookmarks };
        };

        let isBookmarked = currentBookmarks.contains(caller);

        if (isBookmarked) {
          // Removing bookmark scenario
          currentBookmarks.remove(caller);
        } else {
          // Adding bookmark scenario
          currentBookmarks.add(caller);
        };
        not isBookmarked;
      };
    };
  };

  // Record share action for videos
  public shared ({ caller }) func recordShare(videoId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record shares");
    };

    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?v) {
        let updatedVideo = { v with shareCount = v.shareCount + 1 };
        videos.add(videoId, updatedVideo);
      };
    };
  };

  // Get comprehensive interaction state for a video
  public query ({ caller }) func getVideoInteractionState(videoId : Nat) : async ?VideoInteractionState {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get video interaction state");
    };

    switch (videos.get(videoId)) {
      case (null) { null };
      case (?video) {
        let isLiked = switch (videoLikes.get(videoId)) {
          case (null) { false };
          case (?likes) { likes.contains(caller) };
        };

        let isBookmarked = switch (videoBookmarks.get(videoId)) {
          case (null) { false };
          case (?bookmarks) { bookmarks.contains(caller) };
        };

        ?{
          liked = isLiked;
          bookmarked = isBookmarked;
          likeCount = video.likeCount;
          commentCount = video.commentCount;
          shareCount = video.shareCount;
        };
      };
    };
  };

  // Retrieve all videos bookmarked by the caller
  public query ({ caller }) func getUserBookmarks() : async [Video] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get their bookmarks");
    };

    let bookmarkedVideos = videos.values().toArray().filter(
      func(video) {
        switch (videoBookmarks.get(video.id)) {
          case (null) { false };
          case (?bookmarks) { bookmarks.contains(caller) };
        };
      }
    );
    bookmarkedVideos;
  };

  public shared ({ caller }) func incrementViewCount(videoId : Nat) : async () {
    // No authorization required - anyone can increment view count (including guests)
    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        let updatedVideo = { video with viewCount = video.viewCount + 1 };
        videos.add(videoId, updatedVideo);
      };
    };
  };

  public shared ({ caller }) func addComment(videoId : Nat, text : Text, replyToId : ?Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add comments");
    };

    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?_) {
        let newComment : Comment = {
          id = commentIdCounter;
          videoId;
          author = caller;
          text;
          replyToId;
          likeCount = 0;
          createdAt = Time.now();
        };

        comments.add(commentIdCounter, newComment);
        commentIdCounter += 1;

        switch (videos.get(videoId)) {
          case (null) {};
          case (?video) {
            let updatedVideo = { video with commentCount = video.commentCount + 1 };
            videos.add(videoId, updatedVideo);
          };
        };
      };
    };
  };

  public query ({ caller }) func getComments(videoId : Nat) : async [Comment] {
    let commentValues = comments.values().toArray();
    commentValues.filter(func(comment) { comment.videoId == videoId });
  };

  public shared ({ caller }) func follow(userId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can follow others");
    };

    if (caller == userId) {
      Runtime.trap("Cannot follow yourself");
    };

    if (not users.containsKey(userId)) {
      Runtime.trap("User not found");
    };

    let followed = switch (followMap.get(caller)) {
      case (null) { Set.empty<Principal>() };
      case (?followers) { followers };
    };

    if (not followed.contains(userId)) {
      followed.add(userId);
      followMap.add(caller, followed);
    };
  };

  public shared ({ caller }) func unfollow(userId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unfollow others");
    };

    if (caller == userId) {
      Runtime.trap("Cannot unfollow yourself");
    };

    switch (followMap.get(caller)) {
      case (null) {};
      case (?followers) {
        if (followers.contains(userId)) {
          followers.remove(userId);
          followMap.add(caller, followers);
        };
      };
    };
  };

  public query ({ caller }) func getFollowers(userId : Principal) : async [Principal] {
    let followers = allUserIds.filter(
      func(follower) {
        switch (followMap.get(follower)) {
          case (null) { false };
          case (?followings) { followings.contains(userId) };
        };
      }
    );
    followers;
  };

  public query ({ caller }) func getFollowing(userId : Principal) : async [Principal] {
    switch (followMap.get(userId)) {
      case (null) { [] };
      case (?followings) { followings.toArray() };
    };
  };

  public query ({ caller }) func isFollowing(userId : Principal) : async Bool {
    switch (followMap.get(caller)) {
      case (null) { false };
      case (?followers) { followers.contains(userId) };
    };
  };

  public query ({ caller }) func getFollowerCount(userId : Principal) : async Nat {
    var count = 0;
    for (follower in allUserIds.values()) {
      switch (followMap.get(follower)) {
        case (?followings) {
          if (followings.contains(userId)) {
            count += 1;
          };
        };
        case (null) {};
      };
    };
    count;
  };

  public query ({ caller }) func getVideoCount(userId : Principal) : async Nat {
    let iter = videos.values();
    let filtered = iter.filter(func(video) { video.creator == userId });
    var count = 0;
    while (filtered.next() != null) { count += 1 };
    count;
  };

  public shared ({ caller }) func addStory(
    mediaUrl : Text,
    mediaType : Text,
    textOverlay : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload stories");
    };

    let newStory : Story = {
      id = storyIdCounter;
      creator = caller;
      mediaUrl;
      mediaType;
      textOverlay;
      expiresAt = Time.now() + (24 * 60 * 60 * 1000 * 1_000_000 : Int);
      createdAt = Time.now();
      viewerCount = 0;
    };

    stories.add(storyIdCounter, newStory);
    storyIdCounter += 1;
    newStory.id;
  };

  public query ({ caller }) func getActiveStories() : async [Story] {
    let currentTime = Time.now();
    let activeStories = stories.values().toArray().filter(func(story) { story.expiresAt > currentTime });
    activeStories;
  };

  public query ({ caller }) func getMyStories() : async [Story] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get their own stories");
    };

    let currentTime = Time.now();
    let myStories = stories.values().toArray().filter(
      func(story) {
        story.creator == caller and story.expiresAt > currentTime
      }
    );
    myStories;
  };

  public query ({ caller }) func getStoriesByUser(userId : Principal) : async [Story] {
    let currentTime = Time.now();
    let userStories = stories.values().toArray().filter(
      func(story) {
        story.creator == userId and story.expiresAt > currentTime
      }
    );
    userStories;
  };

  public shared ({ caller }) func deleteStory(storyId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete stories");
    };

    switch (stories.get(storyId)) {
      case (null) { Runtime.trap("Story not found") };
      case (?story) {
        if (story.creator != caller) {
          Runtime.trap("Unauthorized: Cannot delete other user's story");
        };
        stories.remove(storyId);
      };
    };
  };

  public shared ({ caller }) func markStoryViewed(storyId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark stories as viewed");
    };

    switch (stories.get(storyId)) {
      case (null) { Runtime.trap("Story not found") };
      case (?story) {
        let viewers = switch (storyViews.get(storyId)) {
          case (null) { Set.empty<Principal>() };
          case (?v) { v };
        };

        // Only count if not already in viewers
        if (not viewers.contains(caller)) {
          viewers.add(caller);

          storyViews.add(storyId, viewers);

          let updatedStory = { story with viewerCount = story.viewerCount + 1 };
          stories.add(storyId, updatedStory);
        };
      };
    };
  };

  public query ({ caller }) func hasViewedStory(storyId : Nat) : async Bool {
    switch (storyViews.get(storyId)) {
      case (null) { false };
      case (?viewers) { viewers.contains(caller) };
    };
  };

  public query ({ caller }) func getStoryViewCount(storyId : Nat) : async Nat {
    switch (stories.get(storyId)) {
      case (null) { 0 };
      case (?story) { story.viewerCount };
    };
  };

  public query ({ caller }) func getUsersWithActiveStories() : async [Principal] {
    let currentTime = Time.now();
    let activeStories = stories.values().toArray().filter(
      func(story) { story.expiresAt > currentTime }
    );
    let uniqueUsers = Set.empty<Principal>();

    for (story in activeStories.values()) {
      uniqueUsers.add(story.creator);
    };

    uniqueUsers.toArray();
  };

  public shared ({ caller }) func updateOnlineStatus(isOnline : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update online status");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) {
        let updatedUser = {
          user with
          isOnline;
          lastSeen = Time.now();
        };
        users.add(caller, updatedUser);
      };
    };
  };

  public query ({ caller }) func getOnlineStatus(userIds : [Principal]) : async [Bool] {
    userIds.map(
      func(id) {
        switch (users.get(id)) {
          case (null) { false };
          case (?user) { user.isOnline };
        };
      }
    );
  };

  public query ({ caller }) func getUserPresenceStatus(userId : Principal) : async ?{ isOnline : Bool; lastSeen : Int } {
    switch (users.get(userId)) {
      case (null) { null };
      case (?user) { ?{ isOnline = user.isOnline; lastSeen = user.lastSeen } };
    };
  };

  public shared ({ caller }) func registerUser(name : Text, email : Text, passwordHash : Text) : async () {
    // No authorization required - guests can register to become users
    if (users.containsKey(caller)) {
      Runtime.trap("User already exists");
    };

    let newUser : User = {
      id = caller;
      name;
      email;
      passwordHash;
      avatarUrl = "";
      bio = "";
      followerCount = 0;
      followingCount = 0;
      isOnline = false;
      lastSeen = Time.now();
      pinnedVideoIds = [];
    };

    users.add(caller, newUser);

    allUserIds := allUserIds.concat([caller]);
  };

  public query ({ caller }) func getUser(id : Principal) : async ?User {
    if (caller != id and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own full user data");
    };
    users.get(id);
  };

  public query ({ caller }) func getUserByEmail(email : Text) : async ?User {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can search users by email");
    };
    let iter = users.values();
    let result = iter.find(func(user) { user.email == email });
    result;
  };

  public shared ({ caller }) func updateUserProfile(name : Text, bio : Text, avatarUrl : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update their profile");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) {
        let updatedUser = {
          user with
          name;
          bio;
          avatarUrl;
        };
        users.add(caller, updatedUser);
      };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) {
        let updatedUser = {
          user with
          name = profile.name;
          email = profile.email;
          avatarUrl = profile.avatarUrl;
          bio = profile.bio;
        };
        users.add(caller, updatedUser);
      };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their profile");
    };

    switch (users.get(caller)) {
      case (null) { null };
      case (?user) { ?userToProfile(user) };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Public profiles - anyone can view
    switch (users.get(user)) {
      case (null) { null };
      case (?u) { ?userToProfile(u) };
    };
  };

  public query ({ caller }) func getAllUserids() : async [Principal] {
    allUserIds;
  };

  public shared ({ caller }) func sendMessage(toUser : Principal, text : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    if (not users.containsKey(caller)) {
      Runtime.trap("Sender not registered");
    };

    if (not users.containsKey(toUser)) {
      Runtime.trap("Recipient not registered");
    };

    let newMessage : DirectMessage = {
      id = messageIdCounter;
      fromUser = caller;
      toUser;
      text;
      createdAt = Time.now();
      isRead = false;
    };

    directMessages.add(messageIdCounter, newMessage);
    messageIdCounter += 1;
    newMessage.id;
  };

  public query ({ caller }) func getConversation(otherUser : Principal) : async [DirectMessage] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access conversations");
    };

    if (not users.containsKey(caller)) {
      Runtime.trap("User not registered");
    };

    let allMessages = directMessages.values().toArray();
    let filteredMessages = allMessages.filter(
      func(m) {
        (m.fromUser == caller and m.toUser == otherUser) or (m.fromUser == otherUser and m.toUser == caller);
      }
    );

    let sortedMessages = filteredMessages.sort(
      func(a, b) {
        if (a.createdAt < b.createdAt) { #less } else if (a.createdAt > b.createdAt) { #greater } else {
        #equal;
        };
      }
    );

    sortedMessages;
  };

  public query ({ caller }) func getConversations() : async [ConversationSummary] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access conversations");
    };

    if (not users.containsKey(caller)) {
      Runtime.trap("User not registered");
    };

    let allMessages = directMessages.values().toArray();
    let conversations = Map.empty<Principal, ?DirectMessage>();

    for (message in allMessages.values()) {
      if (message.fromUser == caller or message.toUser == caller) {
        let otherUser = if (message.fromUser == caller) {
          message.toUser;
        } else {
          message.fromUser;
        };

        switch (conversations.get(otherUser)) {
          case (null) {
            conversations.add(otherUser, ?message);
          };
          case (?existing) {
            switch (existing) {
              case (null) {
                conversations.add(otherUser, ?message);
              };
              case (?existingMessage) {
                if (message.createdAt > existingMessage.createdAt) {
                  conversations.add(otherUser, ?message);
                };
              };
            };
          };
        };
      };
    };

    let summaries = conversations.toArray().map(
      func((otherUser, latestMessageOpt)) {
        switch (latestMessageOpt) {
          case (null) { {
            otherUser;
            lastMessage = "";
            lastMessageAt = 0;
            unreadCount = 0;
          } };
          case (?latestMessage) {
            let unreadCount = allMessages.filter(
              func(m) { m.fromUser == otherUser and m.toUser == caller and not m.isRead }).size();
            {
              otherUser;
              lastMessage = latestMessage.text;
              lastMessageAt = latestMessage.createdAt;
              unreadCount;
            };
          };
        };
      }
    );
    summaries;
  };

  public shared ({ caller }) func markConversationRead(otherUser : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark conversations as read");
    };

    if (not users.containsKey(caller)) {
      Runtime.trap("User not registered");
    };

    let messages = directMessages.values().toArray();
    for (message in messages.values()) {
      if (message.fromUser == otherUser and message.toUser == caller and not message.isRead) {
        let updatedMessage = { message with isRead = true };
        directMessages.add(message.id, updatedMessage);
      };
    };
  };

  // PIN VIDEO FEATURE
  public shared ({ caller }) func pinVideo(videoId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can pin videos");
    };

    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        if (video.creator != caller) {
          Runtime.trap("Unauthorized: Only video creator can pin their own video");
        };

        switch (users.get(caller)) {
          case (null) { Runtime.trap("User not registered") };
          case (?user) {
            let isAlreadyPinned = user.pinnedVideoIds.any(
              func(id) { id == videoId }
            );

            if (not isAlreadyPinned) {
              let updatedPinnedVideos = user.pinnedVideoIds.concat([videoId]);
              let updatedUser = { user with pinnedVideoIds = updatedPinnedVideos };
              users.add(caller, updatedUser);
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func unpinVideo(videoId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unpin videos");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User not registered") };
      case (?user) {
        let updatedPinnedVideos = user.pinnedVideoIds.filter(
          func(id) { id != videoId }
        );
        let updatedUser = { user with pinnedVideoIds = updatedPinnedVideos };
        users.add(caller, updatedUser);
      };
    };
  };

  public query ({ caller }) func getPinnedVideos(userId : Principal) : async [Video] {
    switch (users.get(userId)) {
      case (null) { [] };
      case (?user) {
        let pinnedVideos = user.pinnedVideoIds.map(
          func(videoId) {
            switch (videos.get(videoId)) {
              case (null) { null };
              case (?video) { ?video };
            };
          }
        );

        let nonNullVideos = pinnedVideos.filter(
          func(optVideo) {
            switch (optVideo) {
              case (null) { false };
              case (?_) { true };
            };
          }
        );

        let resultVideos = nonNullVideos.map(
          func(optVideo) {
            switch (optVideo) {
              case (null) { Runtime.unreachable() };
              case (?video) { video };
            };
          }
        );
        resultVideos;
      };
    };
  };

  // VIDEO MANAGEMENT
  public shared ({ caller }) func updateVideo(
    videoId : Nat,
    caption : Text,
    hashtags : [Text],
    privacy : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update videos");
    };

    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        if (video.creator != caller) {
          Runtime.trap("Unauthorized: Only creator can update video");
        };
        let updatedVideo = {
          video with
          caption;
          hashtags;
          privacy;
        };
        videos.add(videoId, updatedVideo);
      };
    };
  };

  public shared ({ caller }) func deleteVideo(videoId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete videos");
    };

    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        if (video.creator != caller) {
          Runtime.trap("Unauthorized: Only creator can delete video");
        };
        videos.remove(videoId);
      };
    };
  };

  // COMMENT ENHANCEMENTS
  public shared ({ caller }) func likeComment(commentId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like comments");
    };

    switch (comments.get(commentId)) {
      case (null) { Runtime.trap("Comment not found") };
      case (?comment) {
        let currentLikes = switch (commentLikes.get(commentId)) {
          case (null) {
            let newSet = Set.empty<Principal>();
            commentLikes.add(commentId, newSet);
            newSet;
          };
          case (?likes) { likes };
        };

        if (not currentLikes.contains(caller)) {
          currentLikes.add(caller);
          let updatedComment = {
            comment with
            likeCount = comment.likeCount + 1;
          };
          comments.add(commentId, updatedComment);
        };
      };
    };
  };

  public shared ({ caller }) func unlikeComment(commentId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike comments");
    };

    switch (comments.get(commentId)) {
      case (null) { Runtime.trap("Comment not found") };
      case (?comment) {
        let currentLikes = switch (commentLikes.get(commentId)) {
          case (null) {
            let newSet = Set.empty<Principal>();
            commentLikes.add(commentId, newSet);
            newSet;
          };
          case (?likes) { likes };
        };

        if (currentLikes.contains(caller)) {
          currentLikes.remove(caller);
          let updatedComment = {
            comment with
            likeCount = if (comment.likeCount > 0) { comment.likeCount - 1 } else { 0 };
          };
          comments.add(commentId, updatedComment);
        };
      };
    };
  };
};
