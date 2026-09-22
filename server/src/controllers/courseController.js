const db = require('../config/database');
const crypto = require('crypto');

function generateId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

exports.create = (req, res) => {
  const { username, courseName, color } = req.body;

  if (!username || !courseName) {
    return res.status(400).json({ error: 'username and courseName are required' });
  }
  if (courseName.trim().length === 0) {
    return res.status(400).json({ error: 'Course name is required' });
  }
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return res.status(400).json({ error: 'Invalid course color' });
  }

  try {
    const student = db.prepare('SELECT * FROM students WHERE username = ?').get(username);
    if (!student) {
      return res.status(404).json({ error: 'User does not exist' });
    }

    const courseId = generateId('course');
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO courses (id, courseId, username, courseName, color)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, courseId, username, courseName.trim(), color || null);

    res.status(201).json({
      courseId,
      userId: username,
      courseName: courseName.trim(),
      color: color || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAll = (req, res) => {
  try {
    const courses = db.prepare(`
      SELECT courseId, username AS userId, courseName, color
      FROM courses
      ORDER BY courseName
    `).all();
    
    res.json({ courses });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getById = (req, res) => {
  const { id } = req.params;

  try {
    const course = db.prepare(`
      SELECT courseId, username AS userId, courseName, color
      FROM courses
      WHERE courseId = ?
    `).get(id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ course });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = (req, res) => {
  const { id } = req.params;
  const { courseName, color } = req.body;

  try {
    const course = db.prepare('SELECT * FROM courses WHERE courseId = ?').get(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (courseName !== undefined && courseName.trim().length === 0) {
      return res.status(400).json({ error: 'Course name is required' });
    }
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({ error: 'Invalid course color' });
    }

    db.prepare(`
      UPDATE courses SET courseName = ?, color = ? WHERE courseId = ?
    `).run(
      courseName !== undefined ? courseName.trim() : course.courseName,
      color !== undefined ? color : course.color,
      id
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.delete = (req, res) => {
  const { id } = req.params;

  try {
    const course = db.prepare('SELECT * FROM courses WHERE courseId = ?').get(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    db.prepare('DELETE FROM tasks WHERE courseId = ?').run(id);
    db.prepare('DELETE FROM courses WHERE courseId = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
