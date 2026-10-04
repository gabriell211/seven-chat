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
