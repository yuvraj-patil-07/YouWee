# Security Specification - YouWe<3

## Data Invariants
1. A user can only manage their own profile and liked tracks.
2. Only the host (creator) of a room can modify its active state or metadata.
3. Users must be authenticated and email-verified for most write operations.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a room with a different user as the host.
2. **PII Leak**: Attempt to read private user info of another user.
3. **Ghost Field**: Adding `isAdmin: true` to a user profile update.
4. **State Shortcutting**: Skipping room activation steps.
5. **Resource Poisoning**: Using a 2MB string as a room ID.
6. **Self-Assigned Role**: Setting `role: 'admin'` on user creation.
7. **Orphaned Write**: Creating a liked track for a non-existent user.
8. **Update Gap**: Modifying `createdAt` on an existing document.
9. **Blanket Read**: Querying all user documents without filtering.
10. **ID Poisoning**: Using a path variable with junk characters.
11. **Immortal Field**: Changing `userId` on a `LikedTrack`.
12. **Temporal Integrity**: Setting `likedAt` to a future date from the client.

## The Test Runner
A `firestore.rules.test.ts` will be implemented to verify these denials.
