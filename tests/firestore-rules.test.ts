/**
 * Aeirmist — Firestore Security Rules Test Suite & Specification
 * 
 * Maps and documents automated security test cases for firestore.rules.
 * Run with Firebase Emulator: firebase emulators:start --only firestore
 */

export interface FirestoreTestCase {
  category: string;
  description: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email?: string; token?: Record<string, any> } | null;
  existingData?: Record<string, any>;
  incomingData?: Record<string, any>;
  expected: 'ALLOW' | 'DENY';
}

const USER_A = { uid: 'user_a_123' };
const USER_B = { uid: 'user_b_456' };
const ADMIN = { uid: 'admin_master', token: { admin: true, role: 'admin' } };
const MODERATOR = { uid: 'mod_user', token: { role: 'moderator' } };
const NO_AUTH = null;

export const FIRESTORE_TEST_SUITE: FirestoreTestCase[] = [
  // ── 1. USERS COLLECTION ──────────────────────────────────────
  {
    category: 'Users',
    description: 'User A can read own private user document',
    collectionPath: 'users/user_a_123',
    operation: 'get',
    auth: USER_A,
    expected: 'ALLOW',
  },
  {
    category: 'Users',
    description: 'User B CANNOT read User A private user document',
    collectionPath: 'users/user_a_123',
    operation: 'get',
    auth: USER_B,
    expected: 'DENY',
  },
  {
    category: 'Users',
    description: 'Unauthenticated user CANNOT read user document',
    collectionPath: 'users/user_a_123',
    operation: 'get',
    auth: NO_AUTH,
    expected: 'DENY',
  },
  {
    category: 'Users',
    description: 'User A can create own user document with matching uid',
    collectionPath: 'users/user_a_123',
    operation: 'create',
    auth: USER_A,
    incomingData: { uid: 'user_a_123', username: 'usera' },
    expected: 'ALLOW',
  },
  {
    category: 'Users',
    description: 'User A CANNOT create user document claiming User B path',
    collectionPath: 'users/user_b_456',
    operation: 'create',
    auth: USER_A,
    incomingData: { uid: 'user_a_123' },
    expected: 'DENY',
  },
  {
    category: 'Users',
    description: 'User A CANNOT create user document with mismatched uid field',
    collectionPath: 'users/user_a_123',
    operation: 'create',
    auth: USER_A,
    incomingData: { uid: 'user_b_456' },
    expected: 'DENY',
  },
  {
    category: 'Users',
    description: 'User A CANNOT mutate immutable uid on update',
    collectionPath: 'users/user_a_123',
    operation: 'update',
    auth: USER_A,
    existingData: { uid: 'user_a_123', username: 'usera' },
    incomingData: { uid: 'user_b_456', username: 'usera' },
    expected: 'DENY',
  },

  // ── 2. PROFILES & SUBCOLLECTIONS ─────────────────────────────
  {
    category: 'Profiles',
    description: 'Authenticated user can read public profile',
    collectionPath: 'profiles/profile_user_a_123',
    operation: 'get',
    auth: USER_B,
    expected: 'ALLOW',
  },
  {
    category: 'Profiles',
    description: 'User A can create own profile',
    collectionPath: 'profiles/profile_user_a_123',
    operation: 'create',
    auth: USER_A,
    incomingData: { ownerUid: 'user_a_123', username: 'usera' },
    expected: 'ALLOW',
  },
  {
    category: 'Profiles',
    description: 'User A CANNOT create profile for User B',
    collectionPath: 'profiles/profile_user_b_456',
    operation: 'create',
    auth: USER_A,
    incomingData: { ownerUid: 'user_a_123' },
    expected: 'DENY',
  },
  {
    category: 'Profiles',
    description: 'User A CANNOT forge ownerUid field on profile create',
    collectionPath: 'profiles/profile_user_a_123',
    operation: 'create',
    auth: USER_A,
    incomingData: { ownerUid: 'user_b_456' },
    expected: 'DENY',
  },
  {
    category: 'Profiles',
    description: 'User A CANNOT change ownerUid on profile update',
    collectionPath: 'profiles/profile_user_a_123',
    operation: 'update',
    auth: USER_A,
    existingData: { ownerUid: 'user_a_123', displayName: 'Old' },
    incomingData: { ownerUid: 'user_b_456', displayName: 'Old' },
    expected: 'DENY',
  },
  {
    category: 'Profiles',
    description: 'User A can read own private profile vault subcollection',
    collectionPath: 'profiles/profile_user_a_123/vault/doc1',
    operation: 'get',
    auth: USER_A,
    expected: 'ALLOW',
  },
  {
    category: 'Profiles',
    description: 'User B CANNOT read User A profile vault subcollection',
    collectionPath: 'profiles/profile_user_a_123/vault/doc1',
    operation: 'get',
    auth: USER_B,
    expected: 'DENY',
  },
  {
    category: 'Profiles',
    description: 'User B CANNOT read User A profile settings subcollection',
    collectionPath: 'profiles/profile_user_a_123/settings/privacy',
    operation: 'get',
    auth: USER_B,
    expected: 'DENY',
  },

  // ── 3. POSTS & INTERACTIONS ──────────────────────────────────
  {
    category: 'Posts',
    description: 'Public unauthenticated can read posts',
    collectionPath: 'posts/post_1',
    operation: 'get',
    auth: NO_AUTH,
    expected: 'ALLOW',
  },
  {
    category: 'Posts',
    description: 'Author can update post content',
    collectionPath: 'posts/post_1',
    operation: 'update',
    auth: USER_A,
    existingData: { authorUid: 'user_a_123', caption: 'Hello' },
    incomingData: { authorUid: 'user_a_123', caption: 'Updated' },
    expected: 'ALLOW',
  },
  {
    category: 'Posts',
    description: 'Non-author CANNOT update post caption',
    collectionPath: 'posts/post_1',
    operation: 'update',
    auth: USER_B,
    existingData: { authorUid: 'user_a_123', caption: 'Hello' },
    incomingData: { authorUid: 'user_a_123', caption: 'Hacked' },
    expected: 'DENY',
  },
  {
    category: 'Posts',
    description: 'Non-author CAN like post (allowed interaction key)',
    collectionPath: 'posts/post_1',
    operation: 'update',
    auth: USER_B,
    existingData: { authorUid: 'user_a_123', likesCount: 0, likedBy: [] },
    incomingData: { authorUid: 'user_a_123', likesCount: 1, likedBy: ['user_b_456'] },
    expected: 'ALLOW',
  },

  // ── 4. CONVERSATIONS & MESSAGING ─────────────────────────────
  {
    category: 'Messaging',
    description: 'Conversation participant can read conversation',
    collectionPath: 'conversations/conv_123',
    operation: 'get',
    auth: USER_A,
    existingData: { participants: ['user_a_123', 'user_b_456'] },
    expected: 'ALLOW',
  },
  {
    category: 'Messaging',
    description: 'Non-participant CANNOT read private conversation',
    collectionPath: 'conversations/conv_123',
    operation: 'get',
    auth: { uid: 'uninvited_intruder' },
    existingData: { participants: ['user_a_123', 'user_b_456'] },
    expected: 'DENY',
  },
  {
    category: 'Messaging',
    description: 'Participant can send message in conversation with own senderId',
    collectionPath: 'conversations/conv_123/messages/msg_1',
    operation: 'create',
    auth: USER_A,
    incomingData: { senderId: 'user_a_123', text: 'Hey' },
    expected: 'ALLOW',
  },
  {
    category: 'Messaging',
    description: 'Participant CANNOT forge senderId to pretend to be other participant',
    collectionPath: 'conversations/conv_123/messages/msg_2',
    operation: 'create',
    auth: USER_A,
    incomingData: { senderId: 'user_b_456', text: 'Impersonated' },
    expected: 'DENY',
  },

  // ── 5. POST ANALYTICS & VIEWS ────────────────────────────────
  {
    category: 'Analytics',
    description: 'User can create post_view with own viewerUid',
    collectionPath: 'post_views/view_1',
    operation: 'create',
    auth: USER_A,
    incomingData: { viewerUid: 'user_a_123', postId: 'post_1' },
    expected: 'ALLOW',
  },
  {
    category: 'Analytics',
    description: 'User CANNOT forge viewerUid of another user on post_view',
    collectionPath: 'post_views/view_1',
    operation: 'create',
    auth: USER_A,
    incomingData: { viewerUid: 'user_b_456', postId: 'post_1' },
    expected: 'DENY',
  },
  {
    category: 'Analytics',
    description: 'Normal user CANNOT delete post_views (immutable audit log)',
    collectionPath: 'post_views/view_1',
    operation: 'delete',
    auth: USER_A,
    expected: 'DENY',
  },

  // ── 6. MARKETPLACE ORDERS ────────────────────────────────────
  {
    category: 'Marketplace',
    description: 'Buyer can read own order',
    collectionPath: 'orders/order_1',
    operation: 'get',
    auth: USER_A,
    existingData: { buyerUid: 'user_a_123', sellerUid: 'seller_999' },
    expected: 'ALLOW',
  },
  {
    category: 'Marketplace',
    description: 'Unrelated user CANNOT read other user order',
    collectionPath: 'orders/order_1',
    operation: 'get',
    auth: USER_B,
    existingData: { buyerUid: 'user_a_123', sellerUid: 'seller_999' },
    expected: 'DENY',
  },
  {
    category: 'Marketplace',
    description: 'Buyer or seller CANNOT alter price or payment amounts on update',
    collectionPath: 'orders/order_1',
    operation: 'update',
    auth: USER_A,
    existingData: { buyerUid: 'user_a_123', total: 100 },
    incomingData: { buyerUid: 'user_a_123', total: 1 },
    expected: 'DENY',
  },

  // ── 7. VAULT FOLDERS ─────────────────────────────────────────
  {
    category: 'Vault',
    description: 'Owner can read own vault folder',
    collectionPath: 'vault_folders/f1',
    operation: 'get',
    auth: USER_A,
    existingData: { userId: 'profile_user_a_123' },
    expected: 'ALLOW',
  },
  {
    category: 'Vault',
    description: 'User B CANNOT read User A vault folder',
    collectionPath: 'vault_folders/f1',
    operation: 'get',
    auth: USER_B,
    existingData: { userId: 'profile_user_a_123' },
    expected: 'DENY',
  },

  // ── 8. ADMIN & ROLE POLICIES ─────────────────────────────────
  {
    category: 'Admin',
    description: 'Normal user CANNOT write to admin collections',
    collectionPath: 'admins/user_a_123',
    operation: 'create',
    auth: USER_A,
    incomingData: { role: 'admin' },
    expected: 'DENY',
  },
  {
    category: 'Admin',
    description: 'Normal user CANNOT modify audit logs',
    collectionPath: 'audit_logs/log_1',
    operation: 'create',
    auth: USER_A,
    incomingData: { event: 'hacked' },
    expected: 'DENY',
  },

  // ── 9. DEFAULT DENY ──────────────────────────────────────────
  {
    category: 'DefaultDeny',
    description: 'Unknown collection is DENIED read by default',
    collectionPath: 'unknown_secret_collection/doc_1',
    operation: 'get',
    auth: USER_A,
    expected: 'DENY',
  },
  {
    category: 'DefaultDeny',
    description: 'Unknown collection is DENIED write by default',
    collectionPath: 'unknown_secret_collection/doc_1',
    operation: 'create',
    auth: USER_A,
    incomingData: { evil: true },
    expected: 'DENY',
  },
];
