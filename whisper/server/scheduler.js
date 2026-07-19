import { run, query, saveDB } from './db.js';
import logger from './logger.js';

const CHECK_INTERVAL = 60 * 1000;

export function startScheduler() {
  setInterval(() => {
    try {
      const scheduledPosts = query(
        "SELECT id, userId, content FROM posts WHERE scheduledAt IS NOT NULL AND scheduledAt <= datetime('now')"
      );

      for (const post of scheduledPosts) {
        run("UPDATE posts SET scheduledAt = NULL WHERE id = ?", [post.id]);
        logger.info({ postId: post.id, userId: post.userId }, 'Published scheduled post');
      }

      if (scheduledPosts.length > 0) {
        saveDB();
        logger.info({ count: scheduledPosts.length }, 'Published scheduled posts');
      }
    } catch (err) {
      logger.error({ err }, 'Scheduler error');
    }
  }, CHECK_INTERVAL);

  logger.info('Scheduler started');
}
