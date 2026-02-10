const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize SQLite Database
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false, // Set to console.log to see SQL queries
});

module.exports = sequelize;
