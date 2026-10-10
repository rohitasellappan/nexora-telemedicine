import express from 'express';
import dbService from '../services/dbService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Fetch notifications for requesting user.
 * Enforces healthcare security: only returns records belonging to authenticated userId.
 */
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const effectiveUserId = req.user.id;

    const notifications = await dbService.getNotifications(effectiveUserId);
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (err) {
    console.error('[Notifications API Error]:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications.',
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read for authenticated owner.
 */
router.patch('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const effectiveUserId = req.user.id;

    const updated = await dbService.markNotificationAsRead(id, effectiveUserId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or unauthorized.',
      });
    }

    res.json({
      success: true,
      notification: updated,
    });
  } catch (err) {
    console.error('[Notifications API Error]:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification.',
    });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for authenticated user.
 */
router.post('/notifications/mark-all-read', authenticate, async (req, res) => {
  try {
    const effectiveUserId = req.user.id;

    await dbService.markAllNotificationsAsRead(effectiveUserId);

    res.json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (err) {
    console.error('[Notifications API Error]:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all as read.',
    });
  }
});

/**
 * GET /api/notifications/missed-calls
 * Retrieve logged missed calls for authenticated user.
 */
router.get('/notifications/missed-calls', authenticate, async (req, res) => {
  try {
    const effectiveUserId = req.user.id;

    const missedCalls = await dbService.getMissedCalls(effectiveUserId);

    res.json({
      success: true,
      count: missedCalls.length,
      missedCalls,
    });
  } catch (err) {
    console.error('[Notifications API Error]:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve missed calls.',
    });
  }
});

export default router;
