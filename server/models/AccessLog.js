const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const AccessLog = sequelize.define('AccessLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    book_id: {
        type: DataTypes.UUID,
        allowNull: true // Allow null for page-level tracking
    },
    book_title: { // Redundant but useful for quick analytics without joining every time
        type: DataTypes.STRING,
        allowNull: false
    },
    action: {
        type: DataTypes.ENUM('VIEW', 'DOWNLOAD', 'READ', 'CLICK', 'PAGE_VIEW', 'CITATION'),
        allowNull: false
    },
    country: {
        type: DataTypes.STRING,
        allowNull: true
    },
    region: { // Granular location
        type: DataTypes.STRING,
        allowNull: true
    },
    ip_hash: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true,
    updatedAt: false,
    indexes: [
        {
            fields: ['book_id']
        },
        {
            fields: ['action']
        }
    ]
});

module.exports = AccessLog;
