const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const AccessLog = require('../models/AccessLog');
const sequelize = require('../database');
const { Op } = require('sequelize');

module.exports = (io) => {

    // --- Books API ---

    // GET /api/books - List all books (with search and category filter)
    router.get('/books', async (req, res) => {
        try {
            const { q, category } = req.query;
            const where = {};

            // Search filter (case-insensitive)
            if (q) {
                where[Op.or] = [
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('title')),
                        'LIKE',
                        `%${q.toLowerCase()}%`
                    ),
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('author')),
                        'LIKE',
                        `%${q.toLowerCase()}%`
                    ),
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('abstract')),
                        'LIKE',
                        `%${q.toLowerCase()}%`
                    )
                ];
            }

            // Category filter
            if (category && category !== 'all') {
                where.category = category;
            }

            const books = await Book.findAll({ where, order: [['created_at', 'DESC']] });
            res.json(books);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server Error' });
        }
    });

    // GET /api/books/:id - Details
    router.get('/books/:id', async (req, res) => {
        try {
            const book = await Book.findByPk(req.params.id);
            if (!book) return res.status(404).json({ error: 'Book not found' });
            res.json(book);
        } catch (err) {
            res.status(500).json({ error: 'Server Error' });
        }
    });

    // GET /api/books/:id/activity - Recent activity for a book
    router.get('/books/:id/activity', async (req, res) => {
        try {
            const activity = await AccessLog.findAll({
                where: { book_id: req.params.id },
                limit: 10,
                order: [['createdAt', 'DESC']]
            });
            res.json(activity);
        } catch (err) {
            res.status(500).json({ error: 'Server Error' });
        }
    });

    // POST /api/books/:id/cite - Track citation
    router.post('/books/:id/cite', async (req, res) => {
        try {
            const book = await Book.findByPk(req.params.id);
            if (!book) return res.status(404).json({ error: 'Book not found' });

            // Increment citation count
            book.citations = (book.citations || 0) + 1;
            await book.save();

            // Log citation activity
            const { country, region } = req.body;
            await AccessLog.create({
                book_id: book.id,
                book_title: book.title,
                action: 'CITATION',
                country: country || 'Unknown',
                region: region || 'Unknown',
                ip_hash: 'cite-' + Date.now()
            });

            // Broadcast citation event
            io.emit('new_activity', {
                action: 'CITATION',
                book: book.title,
                book_id: book.id,
                location: region && country ? `${region}, ${country}` : (country || 'Unknown'),
                country,
                region,
                timestamp: new Date()
            });

            res.json({ citations: book.citations });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server Error' });
        }
    });

    // POST /api/books - Add new book (With File Upload)
    const { upload } = require('../middleware/upload');
    router.post('/books', upload.single('file'), async (req, res) => {
        try {
            const bookData = {
                title: req.body.title,
                author: req.body.author,
                isbn: req.body.isbn,
                publication_year: req.body.publication_year,
                type: req.body.type,
                category: req.body.category,
                abstract: req.body.abstract,
                file_url: req.file ? `/uploads/${req.file.filename}` : null
            };

            const book = await Book.create(bookData);

            // Broadcast new book arrival
            io.emit('new_activity', {
                action: 'UPLOAD',
                book: book.title,
                location: 'Library',
                timestamp: new Date()
            });

            res.json(book);
        } catch (err) {
            console.error(err);
            res.status(400).json({ error: 'Validation Error' });
        }
    });

    // --- Analytics / Access Tracking ---

    // POST /api/access - Log an action
    router.post('/access', async (req, res) => {
        try {
            const { book_id, book_title, action, country, region, ip_hash } = req.body;

            // 1. Create Log
            const log = await AccessLog.create({
                book_id,
                book_title,
                action, // 'VIEW' or 'DOWNLOAD'
                country: country || 'Unknown',
                region,
                ip_hash
            });

            // 2. Emit Real-time Event
            io.emit('new_activity', {
                id: log.id,
                book_id: log.book_id,
                action: log.action,
                book: book_title,
                location: region ? `${region}, ${country}` : country,
                timestamp: new Date()
            });

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Logging Failed' });
        }
    });

    // GET /api/analytics - Aggregated Data
    router.get('/analytics', async (req, res) => {
        try {
            // Count DOWNLOAD and READ as "Reads"
            const totalReads = await AccessLog.count({
                where: {
                    action: ['READ', 'DOWNLOAD']
                }
            });

            // Total Views
            const totalViews = await AccessLog.count({
                where: {
                    action: 'VIEW'
                }
            });

            // Category Statistics
            const [categoryStats] = await sequelize.query(`
                SELECT 
                    b.category,
                    COUNT(DISTINCT b.id) as book_count,
                    COUNT(CASE WHEN a.action IN ('READ', 'DOWNLOAD') THEN 1 END) as reads,
                    COUNT(CASE WHEN a.action = 'VIEW' THEN 1 END) as views
                FROM "Books" b
                LEFT JOIN "AccessLogs" a ON b.id = a.book_id
                GROUP BY b.category
                ORDER BY book_count DESC
            `);

            // Regional Statistics - PostgreSQL compatible
            const [accessByRegion] = await sequelize.query(`
                SELECT 
                    country,
                    region,
                    COUNT(*) as total_access,
                    COUNT(CASE WHEN action IN ('READ', 'DOWNLOAD') THEN 1 END) as reads,
                    COUNT(CASE WHEN action = 'VIEW' THEN 1 END) as views
                FROM "AccessLogs"
                WHERE country != 'Unknown' AND country IS NOT NULL
                GROUP BY country, region
                ORDER BY total_access DESC
                LIMIT 20
            `);

            // Recent Activity
            const recent = await AccessLog.findAll({
                limit: 10,
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'book_title', 'action', 'country', 'region', 'createdAt']
            });

            res.json({
                totalBooks,
                totalReads,
                totalViews,
                limit: 500,
                order: [['createdAt', 'DESC']]
            })
        });
} catch (err) {
    res.status(500).json({ error: 'Analytics Error' });
}
    });

return router;
};
