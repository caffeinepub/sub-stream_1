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
    privacy: string;
    viewCount: bigint;
    caption: string;
    commentCount: bigint;
    videoUrl: string;
}
export interface DirectMessage {
    id: bigint;
    createdAt: bigint;
    text: string;
    isRead: boolean;
    toUser: Principal;
    fromUser: Principal;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
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
    replyToId?: bigint;
    videoId: bigint;
}
export interface User {
    id: Principal;
    bio: string;
    name: string;
    isOnline: boolean;
    pinnedVideoIds: Array<bigint>;
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
export interface VideoInteractionState {
    likeCount: bigint;
    liked: boolean;
    shareCount: bigint;
    commentCount: bigint;
    bookmarked: boolean;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface ConversationSummary {
    lastMessageAt: bigint;
    lastMessage: string;
    otherUser: Principal;
    unreadCount: bigint;
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
    addComment(videoId: bigint, text: string, replyToId: bigint | null): Promise<void>;
    addStory(mediaUrl: string, mediaType: string, textOverlay: string): Promise<bigint>;
    addVideo(title: string, caption: string, videoUrl: string, thumbnailUrl: string, hashtags: Array<string>, privacy: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    deleteStory(storyId: bigint): Promise<void>;
    deleteVideo(videoId: bigint): Promise<void>;
    follow(userId: Principal): Promise<void>;
    getActiveStories(): Promise<Array<Story>>;
    getAllFiles(): Promise<Array<FileMetadata>>;
    getAllUserids(): Promise<Array<Principal>>;
    getAllVideos(): Promise<Array<Video>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComments(videoId: bigint): Promise<Array<Comment>>;
    getConversation(otherUser: Principal): Promise<Array<DirectMessage>>;
    getConversations(): Promise<Array<ConversationSummary>>;
    getFileById(fileId: bigint): Promise<FileMetadata | null>;
    getFilesByCreator(creator: Principal): Promise<Array<FileMetadata>>;
    getFollowerCount(userId: Principal): Promise<bigint>;
    getFollowers(userId: Principal): Promise<Array<Principal>>;
    getFollowing(userId: Principal): Promise<Array<Principal>>;
    getFollowingCount(userId: Principal): Promise<bigint>;
    getMyStories(): Promise<Array<Story>>;
    getOnlineStatus(userIds: Array<Principal>): Promise<Array<boolean>>;
    getPinnedVideos(userId: Principal): Promise<Array<Video>>;
    getStoriesByUser(userId: Principal): Promise<Array<Story>>;
    getStoryViewCount(storyId: bigint): Promise<bigint>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUser(id: Principal): Promise<User | null>;
    getUserBookmarks(): Promise<Array<Video>>;
    getUserByEmail(email: string): Promise<User | null>;
    getUserPresenceStatus(userId: Principal): Promise<{
        isOnline: boolean;
        lastSeen: bigint;
    } | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserVideos(userId: Principal): Promise<Array<Video>>;
    getUsersWithActiveStories(): Promise<Array<Principal>>;
    getVideoCount(userId: Principal): Promise<bigint>;
    getVideoInteractionState(videoId: bigint): Promise<VideoInteractionState | null>;
    getVideosByCreator(creator: Principal): Promise<Array<Video>>;
    hasViewedStory(storyId: bigint): Promise<boolean>;
    incrementViewCount(videoId: bigint): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(userId: Principal): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    likeComment(commentId: bigint): Promise<void>;
    likeVideo(videoId: bigint): Promise<void>;
    markConversationRead(otherUser: Principal): Promise<void>;
    markStoryViewed(storyId: bigint): Promise<void>;
    pinVideo(videoId: bigint): Promise<void>;
    recordShare(videoId: bigint): Promise<void>;
    registerUser(name: string, email: string, passwordHash: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendMessage(toUser: Principal, text: string): Promise<bigint>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    toggleBookmarkVideo(videoId: bigint): Promise<boolean>;
    toggleLikeVideo(videoId: bigint): Promise<boolean>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    unfollow(userId: Principal): Promise<void>;
    unlikeComment(commentId: bigint): Promise<void>;
    unlikeVideo(videoId: bigint): Promise<void>;
    unpinVideo(videoId: bigint): Promise<void>;
    updateOnlineStatus(isOnline: boolean): Promise<void>;
    updateUserProfile(name: string, bio: string, avatarUrl: string): Promise<void>;
    updateVideo(videoId: bigint, caption: string, hashtags: Array<string>, privacy: string): Promise<void>;
    uploadFile(fileName: string, contentType: string, fileSize: bigint, externalBlob: ExternalBlob): Promise<FileMetadata>;
}
