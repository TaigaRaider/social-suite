import { Router } from 'express';
import { auth } from '../auth.js';
import { query, queryOne, run } from '../db.js';

const router = Router();

router.get('/', auth, (req, res) => {
  try {
    const groups = query(`
      SELECT g.*, gm.role,
        (SELECT content FROM messages WHERE groupId = g.id ORDER BY createdAt DESC LIMIT 1) as lastMessage,
        (SELECT u.username FROM messages m JOIN users u ON m.senderId = u.id WHERE m.groupId = g.id ORDER BY m.createdAt DESC LIMIT 1) as lastMessageSender,
        (SELECT createdAt FROM messages WHERE groupId = g.id ORDER BY createdAt DESC LIMIT 1) as lastMessageTime,
        (SELECT COUNT(*) FROM messages WHERE groupId = g.id AND read = 0 AND senderId != ?) as unreadCount,
        (SELECT COUNT(*) FROM group_members WHERE groupId = g.id) as memberCount
      FROM groups g
      JOIN group_members gm ON g.id = gm.groupId
      WHERE gm.userId = ?
      ORDER BY lastMessageTime DESC NULLS LAST
    `, [req.user.id, req.user.id]);
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required' });

    const result = run('INSERT INTO groups (name, description, createdBy) VALUES (?, ?, ?)', [name, description || '', req.user.id]);
    const groupId = result.lastId;

    run('INSERT INTO group_members (groupId, userId, role) VALUES (?, ?, ?)', [groupId, req.user.id, 'admin']);

    if (memberIds && memberIds.length > 0) {
      const uniqueIds = [...new Set(memberIds.filter(id => id !== req.user.id))];
      for (const userId of uniqueIds) {
        run('INSERT OR IGNORE INTO group_members (groupId, userId, role) VALUES (?, ?, ?)', [groupId, userId, 'member']);
      }
    }

    const group = queryOne('SELECT * FROM groups WHERE id = ?', [groupId]);
    const members = query(`
      SELECT u.id, u.username, u.firstName, u.lastName, u.avatar, gm.role, gm.joinedAt
      FROM group_members gm JOIN users u ON gm.userId = u.id WHERE gm.groupId = ?
    `, [groupId]);

    res.json({ ...group, members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, (req, res) => {
  try {
    const membership = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ?', [req.params.id, req.user.id]);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    const group = queryOne('SELECT * FROM groups WHERE id = ?', [req.params.id]);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const members = query(`
      SELECT u.id, u.username, u.firstName, u.lastName, u.avatar, u.status, gm.role, gm.joinedAt
      FROM group_members gm JOIN users u ON gm.userId = u.id WHERE gm.groupId = ?
    `, [req.params.id]);

    res.json({ ...group, members, role: membership.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, (req, res) => {
  try {
    const membership = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ?', [req.params.id, req.user.id]);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update the group' });
    }
    const { name, description } = req.body;
    run(
      'UPDATE groups SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
      [name, description, req.params.id]
    );
    const group = queryOne('SELECT * FROM groups WHERE id = ?', [req.params.id]);
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/members', auth, (req, res) => {
  try {
    const membership = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ?', [req.params.id, req.user.id]);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    run('INSERT OR IGNORE INTO group_members (groupId, userId, role) VALUES (?, ?, ?)', [req.params.id, userId, 'member']);

    const member = queryOne(`
      SELECT u.id, u.username, u.firstName, u.lastName, u.avatar, u.status, gm.role, gm.joinedAt
      FROM group_members gm JOIN users u ON gm.userId = u.id WHERE gm.groupId = ? AND gm.userId = ?
    `, [req.params.id, userId]);

    run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)', [userId, req.user.id, 'added_to_group', req.params.id]);

    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/members/:userId', auth, (req, res) => {
  try {
    const membership = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ?', [req.params.id, req.user.id]);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    if (membership.role !== 'admin' && parseInt(req.params.userId) !== req.user.id) {
      return res.status(403).json({ error: 'Only admins can remove others' });
    }

    run('DELETE FROM group_members WHERE groupId = ? AND userId = ?', [req.params.id, req.params.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, (req, res) => {
  try {
    const membership = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ?', [req.params.id, req.user.id]);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete the group' });
    }
    run('DELETE FROM messages WHERE groupId = ?', [req.params.id]);
    run('DELETE FROM group_members WHERE groupId = ?', [req.params.id]);
    run('DELETE FROM groups WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
