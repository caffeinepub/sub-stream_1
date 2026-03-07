import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Video {
    id: bigint;
    title: string;
    creator: Principal;
    likeCount: bigint;
    thumbnailUrl: string;
    hashtags: Array<string>;
    createdAt: bigint;
    shareCount: bigint;
    viewCount: bigint;
    caption: string;
    commentCount: bigint;
    videoUrl: string;
}
export interface Comment {
    id: bigint;
    likeCount: bigint;
    createdAt: bigint;
    text: string;
    author: Principal;
    videoId: bigint;
}
export interface UserProfile {
    bio: string;
    name: string;
    isOnline: boolean;
    email: string;
    avatarUrl: string;
    followerCount: bigint;
    followingCount: bigint;
    lastSeen: bigint;
}
export interface User {
    id: Principal;
    bio: string;
    name: string;
    isOnline: boolean;
    email: string;
    avatarUrl: string;
    followerCount: bigint;
    passwordHash: string;
    followingCount: bigint;
    lastSeen: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(videoId: bigint, text: string): Promise<void>;
    addVideo(title: string, caption: string, videoUrl: string, thumbnailUrl: string, hashtags: Array<string>): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    follow(userId: Principal): Promise<void>;
    getAllUserids(): Promise<Array<Principal>>;
    getAllVideos(): Promise<Array<Video>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComments(videoId: bigint): Promise<Array<Comment>>;
    getFollowers(userId: Principal): Promise<Array<Principal>>;
    getFollowing(userId: Principal): Promise<Array<Principal>>;
    getOnlineStatus(userIds: Array<Principal>): Promise<Array<boolean>>;
    getUser(id: Principal): Promise<User | null>;
    getUserByEmail(email: string): Promise<User | null>;
    getUserPresenceStatus(): Promise<boolean>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVideosByCreator(creator: Principal): Promise<Array<Video>>;
    incrementViewCount(videoId: bigint): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(userId: Principal): Promise<boolean | null>;
    likeVideo(videoId: bigint): Promise<void>;
    registerUser(name: string, email: string, passwordHash: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    unfollow(userId: Principal): Promise<void>;
    unlikeVideo(videoId: bigint): Promise<void>;
    updateOnlineStatus(isOnline: boolean): Promise<void>;
    updateUserProfile(name: string, bio: string, avatarUrl: string): Promise<void>;
}
