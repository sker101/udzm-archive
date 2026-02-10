const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Book = sequelize.define('Book', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isbn: {
        type: DataTypes.STRING,
        allowNull: true
    },
    publication_year: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    type: {
        type: DataTypes.ENUM('Book', 'Journal', 'Paper'),
        defaultValue: 'Book'
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'General'
        // Categories: Engineering, Technology, Science, Medicine, Social Sciences, etc.
    },
    citations: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
        // Track number of times this work has been cited
    },
    abstract: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    file_url: {
        type: DataTypes.STRING,
        allowNull: true
        // In a real app, this would point to S3 or local storage
    }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false // We only care about creation for the archive metadata
});

module.exports = Book;
