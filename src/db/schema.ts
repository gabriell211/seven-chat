import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const accountStatus = pgEnum("account_status", ["pending_verification","active","restricted","suspended","banned","deactivated","deletion_pending","deleted"]);
export const postVisibility = pgEnum("post_visibility", ["public","followers","private"]);
export const conversationType = pgEnum("conversation_type", ["direct","group"]);
export const messageType = pgEnum("message_type", ["text","image","video","audio","file","system","gift"]);
export const ledgerDirection = pgEnum("ledger_direction", ["debit","credit"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  username: text("username").notNull(),
  passwordHash: text("password_hash"),
  birthDate: timestamp("birth_date", { withTimezone: true }).notNull(),
  status: accountStatus("status").notNull().default("pending_verification"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  uniqueIndex("users_email_uq").on(t.email),
  uniqueIndex("users_username_uq").on(t.username),
  index("users_status_idx").on(t.status)
]);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  gender: text("gender"),
  region: text("region"),
  languages: text("languages").array().notNull().default([]),
  interests: text("interests").array().notNull().default([]),
  isPrivate: boolean("is_private").notNull().default(false),
  isVip: boolean("is_vip").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const follows = pgTable("follows", {
  followerId: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: uuid("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  primaryKey({ columns: [t.followerId, t.followingId] }),
  index("follows_following_idx").on(t.followingId, t.createdAt)
]);

export const blocks = pgTable("blocks", {
  blockerId: uuid("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedId: uuid("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })]);

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull().default(""),
  media: jsonb("media").notNull().default([]),
  visibility: postVisibility("visibility").notNull().default("public"),
  commentsEnabled: boolean("comments_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  index("posts_author_created_idx").on(t.authorId, t.createdAt),
  index("posts_created_idx").on(t.createdAt)
]);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("comments_post_created_idx").on(t.postId, t.createdAt)]);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: conversationType("type").notNull(),
  title: text("title"),
  ownerId: uuid("owner_id").references(() => users.id),
  isPrivate: boolean("is_private").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const conversationMembers = pgTable("conversation_members", {
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  primaryKey({ columns: [t.conversationId, t.userId] }),
  index("conversation_members_user_idx").on(t.userId, t.conversationId)
]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: messageType("type").notNull().default("text"),
  body: text("body"),
  mediaUrl: text("media_url"),
  mediaAssetId: uuid("media_asset_id"),
  viewOnce: boolean("view_once").notNull().default(false),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
}, (t) => [index("messages_conversation_created_idx").on(t.conversationId, t.createdAt)]);

export const ledgerAccounts = pgTable("ledger_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
  ownerType: text("owner_type").notNull(),
  asset: text("asset").notNull().default("diamonds"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [uniqueIndex("ledger_owner_asset_uq").on(t.ownerType, t.ownerId, t.asset)]);

export const ledgerTransactions = pgTable("ledger_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  referenceType: text("reference_type"),
  referenceId: uuid("reference_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").notNull().default("posted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [uniqueIndex("ledger_idempotency_uq").on(t.idempotencyKey)]);

export const ledgerEntries = pgTable("ledger_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").notNull().references(() => ledgerTransactions.id, { onDelete: "restrict" }),
  accountId: uuid("account_id").notNull().references(() => ledgerAccounts.id, { onDelete: "restrict" }),
  direction: ledgerDirection("direction").notNull(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  index("ledger_entries_transaction_idx").on(t.transactionId),
  index("ledger_entries_account_created_idx").on(t.accountId, t.createdAt)
]);

export const gifts = pgTable("gifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  priceDiamonds: integer("price_diamonds").notNull(),
  animationType: text("animation_type").notNull().default("static"),
  assetUrl: text("asset_url"),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").notNull().default({})
}, (t) => [uniqueIndex("gifts_slug_uq").on(t.slug)]);

export const giftTransactions = pgTable("gift_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  receiverId: uuid("receiver_id").notNull().references(() => users.id),
  giftId: uuid("gift_id").notNull().references(() => gifts.id),
  ledgerTransactionId: uuid("ledger_transaction_id").notNull().references(() => ledgerTransactions.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  index("gift_tx_sender_idx").on(t.senderId, t.createdAt),
  index("gift_tx_receiver_idx").on(t.receiverId, t.createdAt)
]);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").notNull().references(() => users.id),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("open"),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("reports_status_priority_idx").on(t.status, t.priority, t.createdAt)]);


export const stories = pgTable("stories", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  textContent: text("text_content"),
  mediaUrl: text("media_url"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("stories_author_created_idx").on(t.authorId, t.createdAt), index("stories_expires_idx").on(t.expiresAt)]);

export const storyViews = pgTable("story_views", {
  storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  viewerId: uuid("viewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.storyId, t.viewerId] })]);

export const reels = pgTable("reels", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  caption: text("caption").notNull().default(""),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  durationMs: integer("duration_ms").notNull(),
  visibility: postVisibility("visibility").notNull().default("public"),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("reels_author_created_idx").on(t.authorId, t.createdAt), index("reels_created_idx").on(t.createdAt)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  payload: jsonb("payload").notNull().default({}),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("notifications_user_read_created_idx").on(t.userId, t.readAt, t.createdAt)]);

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  visibility: text("visibility").notNull().default("public"),
  passwordHash: text("password_hash"),
  vipOnly: boolean("vip_only").notNull().default(false),
  stageLimit: integer("stage_limit").notNull().default(10),
  status: text("status").notNull().default("active"),
  rtcRoomName: text("rtc_room_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true })
}, (t) => [index("rooms_status_created_idx").on(t.status, t.createdAt)]);

export const roomMembers = pgTable("room_members", {
  roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("listener"),
  muted: boolean("muted").notNull().default(false),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.roomId, t.userId] }), index("room_members_user_idx").on(t.userId)]);

export const liveSessions = pgTable("live_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  category: text("category"),
  thumbnailUrl: text("thumbnail_url"),
  status: text("status").notNull().default("created"),
  rtcRoomName: text("rtc_room_name").notNull(),
  viewerCount: integer("viewer_count").notNull().default(0),
  peakViewers: integer("peak_viewers").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("live_status_started_idx").on(t.status, t.startedAt)]);

export const liveGuests = pgTable("live_guests", {
  liveId: uuid("live_id").notNull().references(() => liveSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("guest"),
  status: text("status").notNull().default("invited"),
  joinedAt: timestamp("joined_at", { withTimezone: true })
}, (t) => [primaryKey({ columns: [t.liveId, t.userId] })]);

export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  callerId: uuid("caller_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("created"),
  rtcRoomName: text("rtc_room_name").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("calls_conversation_created_idx").on(t.conversationId, t.createdAt)]);

export const vipSubscriptions = pgTable("vip_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  plan: text("plan").notNull(),
  status: text("status").notNull(),
  provider: text("provider").notNull(),
  externalId: text("external_id"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("vip_user_status_idx").on(t.userId, t.status, t.endsAt)]);

export const fanStatuses = pgTable("fan_statuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  fanUserId: uuid("fan_user_id").notNull().references(() => users.id),
  creatorUserId: uuid("creator_user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("active"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  ledgerTransactionId: uuid("ledger_transaction_id").notNull().references(() => ledgerTransactions.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [uniqueIndex("fan_active_period_uq").on(t.fanUserId, t.creatorUserId, t.endsAt)]);

export const moderationActions = pgTable("moderation_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  targetUserId: uuid("target_user_id").references(() => users.id),
  reportId: uuid("report_id").references(() => reports.id),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("moderation_target_created_idx").on(t.targetUserId, t.createdAt)]);


export const oauthAccounts = pgTable("oauth_accounts", {
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  primaryKey({ columns: [t.provider, t.providerAccountId] }),
  uniqueIndex("oauth_provider_user_uq").on(t.provider, t.userId)
]);


export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.userId, t.role] })]);

export const postReactions = pgTable("post_reactions", {
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reaction: text("reaction").notNull().default("like"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.postId, t.userId] })]);

export const savedPosts = pgTable("saved_posts", {
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.postId, t.userId] })]);


export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceName: text("device_name").notNull().default("Unknown device"),
  platform: text("platform").notNull().default("web"),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  index("user_sessions_user_active_idx").on(t.userId, t.revokedAt, t.expiresAt),
  index("user_sessions_expires_idx").on(t.expiresAt)
]);

export const userConsents = pgTable("user_consents", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  document: text("document").notNull(),
  version: text("version").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.userId, t.document, t.version] })]);


export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  objectKey: text("object_key").notNull(),
  purpose: text("purpose").notNull(),
  status: text("status").notNull().default("pending_upload"),
  declaredMime: text("declared_mime").notNull(),
  detectedMime: text("detected_mime"),
  sizeBytes: integer("size_bytes").notNull(),
  checksumSha256: text("checksum_sha256"),
  width: integer("width"),
  height: integer("height"),
  durationMs: integer("duration_ms"),
  moderationStatus: text("moderation_status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  uniqueIndex("media_assets_object_key_uq").on(t.objectKey),
  index("media_assets_owner_created_idx").on(t.ownerId, t.createdAt),
  index("media_assets_status_created_idx").on(t.status, t.createdAt)
]);

export const mediaProcessingJobs = pgTable("media_processing_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  index("media_jobs_queue_idx").on(t.status, t.availableAt)
]);


export const messageReceipts = pgTable("message_receipts", {
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true })
}, (t) => [primaryKey({ columns: [t.messageId, t.userId] }), index("message_receipts_user_idx").on(t.userId, t.readAt)]);

export const messageReactions = pgTable("message_reactions", {
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reaction: text("reaction").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.messageId, t.userId] })]);
