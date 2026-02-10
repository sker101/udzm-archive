const { Sequelize } = require('sequelize');
const path = require('path');

// Use PostgreSQL in production (Render), SQLite locally
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

let sequelize;

if (isProduction && databaseUrl) {
    // Production: PostgreSQL
    sequelize = new Sequelize(databaseUrl, {
        dialect: 'postgres',
        protocol: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false
    });
    console.log('✓ Using PostgreSQL database');
} else {
    // Development: SQLite
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, 'database.sqlite'),
        logging: false
    });
    console.log('✓ Using SQLite database');
}

module.exports = sequelize;
