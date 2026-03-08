import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Array "mo:core/Array";

module {
  type OldUser = {
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

  type OldVideo = {
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

  type OldComment = {
    id : Nat;
    videoId : Nat;
    author : Principal;
    text : Text;
    likeCount : Nat;
    createdAt : Int;
  };

  type OldActor = {
    users : Map.Map<Principal, OldUser>;
    videos : Map.Map<Nat, OldVideo>;
    comments : Map.Map<Nat, OldComment>;
    videoLikes : Map.Map<Nat, Set.Set<Principal>>;
    videoBookmarks : Map.Map<Nat, Set.Set<Principal>>;
    allUserIds : [Principal];
    // ... (other old state fields)
  };

  type NewUser = {
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

  type NewVideo = {
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

  type NewComment = {
    id : Nat;
    videoId : Nat;
    author : Principal;
    text : Text;
    likeCount : Nat;
    replyToId : ?Nat;
    createdAt : Int;
  };

  type NewActor = {
    users : Map.Map<Principal, NewUser>;
    videos : Map.Map<Nat, NewVideo>;
    comments : Map.Map<Nat, NewComment>;
    videoLikes : Map.Map<Nat, Set.Set<Principal>>;
    videoBookmarks : Map.Map<Nat, Set.Set<Principal>>;
    commentLikes : Map.Map<Nat, Set.Set<Principal>>;
    allUserIds : [Principal];
    // ... (other new state fields)
  };

  public func run(old : OldActor) : NewActor {
    // Add default privacy to Videos
    let newVideos = old.videos.map<Nat, OldVideo, NewVideo>(
      func(_key, video) {
        { video with privacy = "everyone" };
      }
    );

    // Add default empty pinnedVideoIds to users
    let newUsers = old.users.map<Principal, OldUser, NewUser>(
      func(_key, user) {
        { user with pinnedVideoIds = [] };
      }
    );

    // Add default empty replyToId for comments
    let newComments = old.comments.map<Nat, OldComment, NewComment>(
      func(_key, comment) {
        { comment with replyToId = null };
      }
    );

    let newVideoLikes = old.videoLikes.map<Nat, Set.Set<Principal>, Set.Set<Principal>>(
      func(_key, value) {
        value;
      }
    );
    let newVideoBookmarks = old.videoBookmarks.map<Nat, Set.Set<Principal>, Set.Set<Principal>>(
      func(_key, value) {
        value;
      }
    );

    {
      users = newUsers;
      videos = newVideos;
      comments = newComments;
      videoLikes = newVideoLikes;
      videoBookmarks = newVideoBookmarks;
      commentLikes = Map.empty<Nat, Set.Set<Principal>>();
      allUserIds = old.allUserIds;
      // ... (other new state fields)
    };
  };
};
