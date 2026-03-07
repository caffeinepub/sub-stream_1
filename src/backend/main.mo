import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Type
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
  };

  // UserProfile Type (for frontend integration)
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

  // Video Type
  public type Video = {
    id : Nat;
    creator : Principal;
    title : Text;
    caption : Text;
    videoUrl : Text;
    thumbnailUrl : Text;
    hashtags : [Text];
    likeCount : Nat;
    commentCount : Nat;
    shareCount : Nat;
    viewCount : Nat;
    createdAt : Int;
  };

  // Comment Type
  public type Comment = {
    id : Nat;
    videoId : Nat;
    author : Principal;
    text : Text;
    likeCount : Nat;
    createdAt : Int;
  };

  // Follows
  let followMap = Map.empty<Principal, Set.Set<Principal>>();
  var allUserIds : [Principal] = [];
  let users = Map.empty<Principal, User>();

  // Store Videos
  let videos = Map.empty<Nat, Video>();
  var videoIdCounter : Nat = 0;

  // Store Comments
  let comments = Map.empty<Nat, Comment>();
  var commentIdCounter : Nat = 0;

  // Helper function to convert User to UserProfile
  private func userToProfile(user : User) : UserProfile {
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

  // Frontend-required profile functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their profile");
    };
    switch (users.get(caller)) {
      case (null) { null };
      case (?user) { ?userToProfile(user) };
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

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile or be an admin");
    };
    switch (users.get(user)) {
      case (null) { null };
      case (?u) { ?userToProfile(u) };
    };
  };

  // Videos
  // Add video record
  public shared ({ caller }) func addVideo(title : Text, caption : Text, videoUrl : Text, thumbnailUrl : Text, hashtags : [Text]) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload videos");
    };

    if (not (users.containsKey(caller))) {
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

  public query ({ caller }) func getAllUserids() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access user list");
    };
    allUserIds;
  };

  public query ({ caller }) func getAllVideos() : async [Video] {
    let iter = videos.values();
    let array = iter.toArray();
    array;
  };

  public query ({ caller }) func getVideosByCreator(creator : Principal) : async [Video] {
    let iter = videos.values();
    let filtered = iter.filter(func(video) { video.creator == creator });
    filtered.toArray();
  };

  public shared ({ caller }) func likeVideo(videoId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like videos");
    };

    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        let updatedVideo = { video with likeCount = video.likeCount + 1 };
        videos.add(videoId, updatedVideo);
      };
    };
  };

  public shared ({ caller }) func unlikeVideo(videoId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike videos");
    };

    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        if (video.likeCount > 0) {
          let updatedVideo = { video with likeCount = (video.likeCount - 1 : Nat) };
          videos.add(videoId, updatedVideo);
        };
      };
    };
  };

  public shared ({ caller }) func incrementViewCount(videoId : Nat) : async () {
    // Public function - anyone can increment view count (including guests)
    switch (videos.get(videoId)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        let updatedVideo = { video with viewCount = video.viewCount + 1 };
        videos.add(videoId, updatedVideo);
      };
    };
  };

  // Comments
  public shared ({ caller }) func addComment(videoId : Nat, text : Text) : async () {
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
          likeCount = 0;
          createdAt = Time.now();
        };

        comments.add(commentIdCounter, newComment);
        commentIdCounter += 1;

        // Update video comment count
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
    // Public query - anyone can view comments
    let commentValues = comments.values().toArray();
    commentValues.filter(func(comment) { comment.videoId == videoId });
  };

  // Follows
  public shared ({ caller }) func follow(userId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can follow others");
    };

    if (not users.containsKey(userId)) {
      Runtime.trap("User not found");
    };

    let followed = switch (followMap.get(caller)) {
      case (null) { Set.empty<Principal>() };
      case (?followers) { followers };
    };

    followed.add(userId);
    followMap.add(caller, followed);
  };

  public shared ({ caller }) func unfollow(userId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unfollow others");
    };

    switch (followMap.get(caller)) {
      case (null) { Runtime.trap("User is not following anyone") };
      case (?followers) {
        if (followers.contains(userId)) {
          followers.remove(userId);
          followMap.add(caller, followers);
        } else { Runtime.trap("Not following this user") };
      };
    };
  };

  public query ({ caller }) func isFollowing(userId : Principal) : async ?Bool {
    // Public query - anyone can check follow status
    followMap.get(caller).map(func(s) { s.contains(userId) });
  };

  public query ({ caller }) func getFollowers(userId : Principal) : async [Principal] {
    // Public query - anyone can view followers
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
    // Public query - anyone can view following list
    switch (followMap.get(userId)) {
      case (null) { [] };
      case (?followings) { followings.toArray() };
    };
  };

  // User Presence (Heartbeat)
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
    // Public query - anyone can check online status
    userIds.map(
      func(id) {
        switch (users.get(id)) {
          case (null) { false };
          case (?user) { user.isOnline };
        };
      }
    );
  };

  // User Management
  public shared ({ caller }) func registerUser(name : Text, email : Text, passwordHash : Text) : async () {
    // Public function - guests can register (no auth check needed)
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
    };

    users.add(caller, newUser);

    allUserIds := allUserIds.concat([caller]);
  };

  public query ({ caller }) func getUser(id : Principal) : async ?User {
    // Public query - anyone can view user profiles
    users.get(id);
  };

  public query ({ caller }) func getUserByEmail(email : Text) : async ?User {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can lookup users by email");
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

  public query ({ caller }) func getUserPresenceStatus() : async Bool {
    // Public query - anyone can check presence status
    switch (users.get(caller)) {
      case (null) { false };
      case (?user) { user.isOnline };
    };
  };
};
