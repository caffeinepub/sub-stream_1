import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
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
export interface FileMetadata {
    id: bigint;
    creator: Principal;
    contentType: string;
    externalBlob: ExternalBlob;
    fileName: string;
    fileSize: bigint;
    uploadedAt: bigint;
}
export interface Comment {
    id: bigint;
    likeCount: bigint;
    createdAt: bigint;
    text: string;
    author: Principal;
    videoId: bigint;
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
export interface Story {
    id: bigint;
    creator: Principal;
    expiresAt: bigint;
    createdAt: bigint;
    mediaUrl: string;
    textOverlay: string;
    mediaType: string;
    viewerCount: bigint;
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
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(videoId: bigint, text: string): Promise<void>;
    addStory(mediaUrl: string, mediaType: string, textOverlay: string): Promise<bigint>;
    addVideo(title: string, caption: string, videoUrl: string, thumbnailUrl: string, hashtags: Array<string>): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteStory(storyId: bigint): Promise<void>;
    follow(userId: Principal): Promise<void>;
    getActiveStories(): Promise<Array<Story>>;
    getAllFiles(): Promise<Array<FileMetadata>>;
    getAllUserids(): Promise<Array<Principal>>;
    getAllVideos(): Promise<Array<Video>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComments(videoId: bigint): Promise<Array<Comment>>;
    getFileById(fileId: bigint): Promise<FileMetadata | null>;
    getFilesByCreator(creator: Principal): Promise<Array<FileMetadata>>;
    getFollowers(userId: Principal): Promise<Array<Principal>>;
    getFollowing(userId: Principal): Promise<Array<Principal>>;
    getMyStories(): Promise<Array<Story>>;
    getOnlineStatus(userIds: Array<Principal>): Promise<Array<boolean>>;
    getStoriesByUser(userId: Principal): Promise<Array<Story>>;
    getStoryViewCount(storyId: bigint): Promise<bigint>;
    getUser(id: Principal): Promise<User | null>;
    getUserByEmail(email: string): Promise<User | null>;
    getUserPresenceStatus(): Promise<boolean>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUsersWithActiveStories(): Promise<Array<Principal>>;
    getVideosByCreator(creator: Principal): Promise<Array<Video>>;
    hasViewedStory(storyId: bigint): Promise<boolean>;
    incrementViewCount(videoId: bigint): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(userId: Principal): Promise<boolean | null>;
    likeVideo(videoId: bigint): Promise<void>;
    markStoryViewed(storyId: bigint): Promise<void>;
    registerUser(name: string, email: string, passwordHash: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    unfollow(userId: Principal): Promise<void>;
    unlikeVideo(videoId: bigint): Promise<void>;
    updateOnlineStatus(isOnline: boolean): Promise<void>;
    updateUserProfile(name: string, bio: string, avatarUrl: string): Promise<void>;
    uploadFile(fileName: string, contentType: string, fileSize: bigint, externalBlob: ExternalBlob): Promise<FileMetadata>;
}
