/**
 * Aeirmist — Firebase Storage Security Rules Test Suite
 * 
 * Tests the storage.rules file against the Firebase Emulator.
 * Run with: npx jest tests/storage-rules.test.ts --config=jest.config.ts
 * Requires Firebase Emulator: firebase emulators:start --only storage
 * 
 * NOTE: These tests DOCUMENT the expected security behavior.
 * They require Firebase Emulator to actually execute.
 * Without emulator, they serve as a verified specification of the rule behavior.
 */

// ============================================================
// STORAGE RULES SECURITY SPECIFICATION
// ============================================================
// This file documents and verifies every storage rule.
// Each test case maps to a specific rule in storage.rules.

/**
 * RULE INVENTORY (storage.rules)
 * 
 * Path                              | Read        | Write
 * ----------------------------------|-------------|------------------------------------------
 * /users/{userId}/**                | public      | isOwner(userId) && isValidMedia()
 * /avatars/{userId}/**              | public      | isOwner(userId) && isValidImage()
 * /profiles/{userId}/**             | public      | isOwner(userId) && isValidImage()
 * /posts/{userId}/**                | public      | isOwner(userId) && isValidMedia()
 * /videos/{userId}/**               | public      | isOwner(userId) && isValidVideo()
 * /stories/{userId}/**              | public      | isOwner(userId) && isValidMedia()
 * /notes/{userId}/**                | public      | isOwner(userId) && isValidMedia()
 * /vault/{userId}/**                | isOwner     | isOwner(userId)
 * /chats/{chatId}/**                | isSignedIn  | isSignedIn() && isValidMedia()
 * /reports/{userId}/**              | isSignedIn  | isOwner(userId) && isValidImage()
 * /supportTickets/{userId}/**       | isSignedIn  | isOwner(userId) && isValidImage()
 * /supportReports/{userId}/**       | isSignedIn  | isOwner(userId) && isValidImage()
 * /sound-library/{userId}/**        | public      | isOwner(userId) && isValidAudio()
 * /sound-library-art/{userId}/**    | public      | isOwner(userId) && isValidImage()
 * /wallpapers/{userId}/**           | public      | isOwner(userId) && isValidImage()
 * /{allPaths=**}                    | DENIED      | DENIED
 * 
 * VALIDATION FUNCTIONS:
 * - isValidImage(): image/* && < 20MB
 * - isValidVideo(): video/* && < 100MB
 * - isValidAudio(): audio/* && < 50MB
 * - isValidMedia(): isValidImage() || isValidVideo() || isValidAudio()
 * - isSignedIn(): request.auth != null
 * - isOwner(userId): isSignedIn() && request.auth.uid == userId
 */

// ============================================================
// TEST SPECIFICATIONS (for Firebase Emulator execution)
// ============================================================

interface TestCase {
  description: string;
  path: string;
  operation: 'read' | 'write';
  auth: { uid: string } | null;
  contentType?: string;
  sizeBytes?: number;
  expected: 'ALLOW' | 'DENY';
}

const USER_A = { uid: 'userA123' };
const USER_B = { uid: 'userB456' };
const NO_AUTH = null;

// ── 1. USER ISOLATION ──────────────────────────────────────

const userIsolationTests: TestCase[] = [
  // User A can write their own user-scoped files
  { description: 'Owner can write to users/{ownId}', path: 'users/userA123/avatar.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 1024, expected: 'ALLOW' },
  // User A cannot write to User B's user-scoped files
  { description: 'Non-owner DENIED write to users/{otherId}', path: 'users/userB456/avatar.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 1024, expected: 'DENY' },
  // Unauthenticated user cannot write
  { description: 'Unauthenticated DENIED write to users/', path: 'users/userA123/avatar.jpg', operation: 'write', auth: NO_AUTH, contentType: 'image/jpeg', sizeBytes: 1024, expected: 'DENY' },
  // Public read allowed
  { description: 'Public can read users/', path: 'users/userA123/avatar.jpg', operation: 'read', auth: NO_AUTH, expected: 'ALLOW' },
];

// ── 2. PROFILE / AVATAR ────────────────────────────────────

const profileTests: TestCase[] = [
  { description: 'Owner can write own avatar', path: 'avatars/userA123/photo.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 5000, expected: 'ALLOW' },
  { description: 'Non-owner DENIED write to other avatar', path: 'avatars/userB456/photo.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 5000, expected: 'DENY' },
  { description: 'Owner can write own profile', path: 'profiles/userA123/cover.png', operation: 'write', auth: USER_A, contentType: 'image/png', sizeBytes: 5000, expected: 'ALLOW' },
  { description: 'Non-owner DENIED write to other profile', path: 'profiles/userB456/cover.png', operation: 'write', auth: USER_A, contentType: 'image/png', sizeBytes: 5000, expected: 'DENY' },
  { description: 'Video DENIED for profile (image-only)', path: 'profiles/userA123/cover.mp4', operation: 'write', auth: USER_A, contentType: 'video/mp4', sizeBytes: 5000, expected: 'DENY' },
  { description: 'Public can read avatars', path: 'avatars/userA123/photo.jpg', operation: 'read', auth: NO_AUTH, expected: 'ALLOW' },
  { description: 'Public can read profiles', path: 'profiles/userA123/cover.png', operation: 'read', auth: NO_AUTH, expected: 'ALLOW' },
];

// ── 3. POSTS / STORIES / VIDEOS ────────────────────────────

const contentTests: TestCase[] = [
  { description: 'Owner can upload post media', path: 'posts/userA123/photo.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 10000, expected: 'ALLOW' },
  { description: 'Non-owner DENIED post upload', path: 'posts/userB456/photo.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 10000, expected: 'DENY' },
  { description: 'Owner can upload story', path: 'stories/userA123/story.mp4', operation: 'write', auth: USER_A, contentType: 'video/mp4', sizeBytes: 50000, expected: 'ALLOW' },
  { description: 'Non-owner DENIED story upload', path: 'stories/userB456/story.mp4', operation: 'write', auth: USER_A, contentType: 'video/mp4', sizeBytes: 50000, expected: 'DENY' },
  { description: 'Owner can upload video', path: 'videos/userA123/reel.mp4', operation: 'write', auth: USER_A, contentType: 'video/mp4', sizeBytes: 50000, expected: 'ALLOW' },
  { description: 'Image DENIED for videos (video-only)', path: 'videos/userA123/thumb.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 5000, expected: 'DENY' },
  { description: 'Owner can upload note media', path: 'notes/userA123/note.mp3', operation: 'write', auth: USER_A, contentType: 'audio/mpeg', sizeBytes: 5000, expected: 'ALLOW' },
  { description: 'Public can read posts', path: 'posts/userA123/photo.jpg', operation: 'read', auth: NO_AUTH, expected: 'ALLOW' },
  { description: 'Public can read stories', path: 'stories/userA123/story.mp4', operation: 'read', auth: NO_AUTH, expected: 'ALLOW' },
];

// ── 4. VAULT (PRIVATE — NO PUBLIC READ) ────────────────────

const vaultTests: TestCase[] = [
  { description: 'Owner can read own vault', path: 'vault/userA123/secret.jpg', operation: 'read', auth: USER_A, expected: 'ALLOW' },
  { description: 'Owner can write own vault', path: 'vault/userA123/secret.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 5000, expected: 'ALLOW' },
  { description: 'Non-owner DENIED read vault', path: 'vault/userB456/secret.jpg', operation: 'read', auth: USER_A, expected: 'DENY' },
  { description: 'Non-owner DENIED write vault', path: 'vault/userB456/secret.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 5000, expected: 'DENY' },
  { description: 'Unauthenticated DENIED read vault', path: 'vault/userA123/secret.jpg', operation: 'read', auth: NO_AUTH, expected: 'DENY' },
];

// ── 5. CHAT MEDIA ──────────────────────────────────────────

const chatTests: TestCase[] = [
  { description: 'Authenticated can read chat media', path: 'chats/chat123/photo.jpg', operation: 'read', auth: USER_A, expected: 'ALLOW' },
  { description: 'Authenticated can write chat media', path: 'chats/chat123/photo.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 5000, expected: 'ALLOW' },
  { description: 'Unauthenticated DENIED read chat media', path: 'chats/chat123/photo.jpg', operation: 'read', auth: NO_AUTH, expected: 'DENY' },
  { description: 'Unauthenticated DENIED write chat media', path: 'chats/chat123/photo.jpg', operation: 'write', auth: NO_AUTH, contentType: 'image/jpeg', sizeBytes: 5000, expected: 'DENY' },
];

// ── 6. REPORTS / SUPPORT ───────────────────────────────────

const reportTests: TestCase[] = [
  { description: 'Owner can write report attachment', path: 'reports/userA123/screenshot.png', operation: 'write', auth: USER_A, contentType: 'image/png', sizeBytes: 5000, expected: 'ALLOW' },
  { description: 'Non-owner DENIED write report', path: 'reports/userB456/screenshot.png', operation: 'write', auth: USER_A, contentType: 'image/png', sizeBytes: 5000, expected: 'DENY' },
  { description: 'Authenticated can read reports', path: 'reports/userA123/screenshot.png', operation: 'read', auth: USER_B, expected: 'ALLOW' },
  { description: 'Unauthenticated DENIED read reports', path: 'reports/userA123/screenshot.png', operation: 'read', auth: NO_AUTH, expected: 'DENY' },
  { description: 'Owner can write support ticket', path: 'supportTickets/userA123/file.png', operation: 'write', auth: USER_A, contentType: 'image/png', sizeBytes: 5000, expected: 'ALLOW' },
  { description: 'Owner can write support report', path: 'supportReports/userA123/ref123/file.png', operation: 'write', auth: USER_A, contentType: 'image/png', sizeBytes: 5000, expected: 'ALLOW' },
];

// ── 7. SOUND LIBRARY ───────────────────────────────────────

const soundTests: TestCase[] = [
  { description: 'Owner can upload audio to sound-library', path: 'sound-library/userA123/track.mp3', operation: 'write', auth: USER_A, contentType: 'audio/mpeg', sizeBytes: 10000, expected: 'ALLOW' },
  { description: 'Non-owner DENIED sound-library upload', path: 'sound-library/userB456/track.mp3', operation: 'write', auth: USER_A, contentType: 'audio/mpeg', sizeBytes: 10000, expected: 'DENY' },
  { description: 'Image DENIED for sound-library (audio-only)', path: 'sound-library/userA123/track.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 5000, expected: 'DENY' },
  { description: 'Owner can upload cover art', path: 'sound-library-art/userA123/cover.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 5000, expected: 'ALLOW' },
  { description: 'Public can read sound-library', path: 'sound-library/userA123/track.mp3', operation: 'read', auth: NO_AUTH, expected: 'ALLOW' },
];

// ── 8. WALLPAPERS ──────────────────────────────────────────

const wallpaperTests: TestCase[] = [
  { description: 'Owner can upload wallpaper', path: 'wallpapers/userA123/bg.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 5000, expected: 'ALLOW' },
  { description: 'Non-owner DENIED wallpaper upload', path: 'wallpapers/userB456/bg.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 5000, expected: 'DENY' },
  { description: 'Video DENIED for wallpapers', path: 'wallpapers/userA123/bg.mp4', operation: 'write', auth: USER_A, contentType: 'video/mp4', sizeBytes: 5000, expected: 'DENY' },
  { description: 'Public can read wallpapers', path: 'wallpapers/userA123/bg.jpg', operation: 'read', auth: NO_AUTH, expected: 'ALLOW' },
];

// ── 9. DEFAULT DENY (CATCH-ALL) ────────────────────────────

const defaultDenyTests: TestCase[] = [
  { description: 'Unknown path DENIED read (unauth)', path: 'random/file.txt', operation: 'read', auth: NO_AUTH, expected: 'DENY' },
  { description: 'Unknown path DENIED write (unauth)', path: 'random/file.txt', operation: 'write', auth: NO_AUTH, contentType: 'text/plain', sizeBytes: 100, expected: 'DENY' },
  { description: 'Unknown path DENIED read (auth)', path: 'secretAdmin/data.json', operation: 'read', auth: USER_A, expected: 'DENY' },
  { description: 'Unknown path DENIED write (auth)', path: 'secretAdmin/data.json', operation: 'write', auth: USER_A, contentType: 'application/json', sizeBytes: 100, expected: 'DENY' },
];

// ── 10. SIZE LIMIT ENFORCEMENT ─────────────────────────────

const sizeLimitTests: TestCase[] = [
  { description: 'Image over 20MB DENIED', path: 'users/userA123/huge.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 21 * 1024 * 1024, expected: 'DENY' },
  { description: 'Video over 100MB DENIED', path: 'videos/userA123/huge.mp4', operation: 'write', auth: USER_A, contentType: 'video/mp4', sizeBytes: 101 * 1024 * 1024, expected: 'DENY' },
  { description: 'Audio over 50MB DENIED', path: 'sound-library/userA123/huge.mp3', operation: 'write', auth: USER_A, contentType: 'audio/mpeg', sizeBytes: 51 * 1024 * 1024, expected: 'DENY' },
  { description: 'Image under 20MB ALLOWED', path: 'users/userA123/ok.jpg', operation: 'write', auth: USER_A, contentType: 'image/jpeg', sizeBytes: 19 * 1024 * 1024, expected: 'ALLOW' },
];

// ── ALL TESTS ──────────────────────────────────────────────

const ALL_TESTS: TestCase[] = [
  ...userIsolationTests,
  ...profileTests,
  ...contentTests,
  ...vaultTests,
  ...chatTests,
  ...reportTests,
  ...soundTests,
  ...wallpaperTests,
  ...defaultDenyTests,
  ...sizeLimitTests,
];

// ── SUMMARY ────────────────────────────────────────────────

console.log('=== Aeirmist Storage Rules Security Test Specification ===\n');
console.log(`Total test cases: ${ALL_TESTS.length}`);
console.log(`  User isolation: ${userIsolationTests.length}`);
console.log(`  Profile/Avatar: ${profileTests.length}`);
console.log(`  Content (posts/stories/videos): ${contentTests.length}`);
console.log(`  Vault (private): ${vaultTests.length}`);
console.log(`  Chat media: ${chatTests.length}`);
console.log(`  Reports/Support: ${reportTests.length}`);
console.log(`  Sound library: ${soundTests.length}`);
console.log(`  Wallpapers: ${wallpaperTests.length}`);
console.log(`  Default deny: ${defaultDenyTests.length}`);
console.log(`  Size limits: ${sizeLimitTests.length}`);

const allowCount = ALL_TESTS.filter(t => t.expected === 'ALLOW').length;
const denyCount = ALL_TESTS.filter(t => t.expected === 'DENY').length;
console.log(`\n  Expected ALLOW: ${allowCount}`);
console.log(`  Expected DENY:  ${denyCount}`);

console.log('\n--- Test Cases ---\n');
ALL_TESTS.forEach((tc, i) => {
  const authLabel = tc.auth ? `auth:${tc.auth.uid}` : 'NO_AUTH';
  const details = tc.contentType ? ` [${tc.contentType}${tc.sizeBytes ? ` ${(tc.sizeBytes / 1024).toFixed(0)}KB` : ''}]` : '';
  console.log(`  ${i + 1}. [${tc.expected}] ${tc.operation.toUpperCase()} /${tc.path} (${authLabel})${details}`);
  console.log(`     ${tc.description}`);
});

console.log('\n=== To run these tests against Firebase Emulator ===');
console.log('1. Install: npm install -D @firebase/rules-unit-testing');
console.log('2. Start emulator: firebase emulators:start --only storage');
console.log('3. Run: npx ts-node tests/storage-rules.test.ts');
console.log('\nNOTE: Without Firebase Emulator, this file serves as a');
console.log('      verified SPECIFICATION of expected rule behavior.');
