/** Column lists sent by browser components, shared with the integration test. */
import { MEMBER_COLUMNS } from "./types";

export const COMMENT_SELECT = `id, parent_id, body, status, is_edited, like_count, created_at, author:profiles!comments_author_id_fkey ( ${MEMBER_COLUMNS} )`;
export const REVIEW_SELECT = `id, rating, body, status, created_at, updated_at, author:profiles!recipe_reviews_author_id_fkey ( ${MEMBER_COLUMNS} )`;
export const COOKED_SELECT = `id, kind, author:profiles!community_posts_author_id_fkey ( ${MEMBER_COLUMNS} ), post_media ( position, media_type, storage_path, youtube_id, alt )`;
export const BLOCKED_SELECT = `created_at, member:profiles!blocks_blocked_id_fkey ( ${MEMBER_COLUMNS} )`;
