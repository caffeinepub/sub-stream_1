import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  type OldStory = {
    id : Nat;
    creator : Principal;
    mediaUrl : Text;
    mediaType : Text; // "photo" or "video"
    textOverlay : Text;
    expiresAt : Int;
    createdAt : Int;
    viewerCount : Nat;
  };

  type OldActor = {};

  type NewStory = {
    id : Nat;
    creator : Principal;
    mediaUrl : Text;
    mediaType : Text; // "photo" or "video"
    textOverlay : Text;
    expiresAt : Int;
    createdAt : Int;
    viewerCount : Nat;
  };

  type NewActor = {
    stories : Map.Map<Nat, NewStory>;
    storyIdCounter : Nat;
  };

  public func run(_ : OldActor) : NewActor {
    {
      stories = Map.empty<Nat, NewStory>();
      storyIdCounter = 0;
    };
  };
};
