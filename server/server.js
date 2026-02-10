const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sequelize = require('./database');
const Book = require('./models/Book');

// Initialize App & Socket
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Static Files (Frontend)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
const apiRoutes = require('./routes/api')(io);
app.use('/api', apiRoutes);

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('New client connected');
    socket.emit('status', { message: 'Connected to UDSM Real-time Server' });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Database Sync & Seeding
const PORT = process.env.PORT || 3000;

// Force sync in production ONCE to create tables (change to false after first deploy)
const shouldForceSync = process.env.FORCE_DB_SYNC === 'true';

sequelize.sync({ force: shouldForceSync, alter: !shouldForceSync }).then(async () => {
    console.log(`Database synced (force: ${shouldForceSync})`);

    // Seed if empty
    const count = await Book.count();
    if (count === 0) {
        console.log('Seeding initial data...');
        await Book.bulkCreate([
            { title: "The Hill Observer: 1970 Edition", type: "Journal", publication_year: 1970, author: "UDSM Press", category: "Social Sciences", citations: 45, abstract: "A collection of student perspectives during the 1970s socialist era." },
            { title: "Evolution of Swahili Press", type: "Book", publication_year: 1998, author: "Prof. M. H. Y.", category: "Social Sciences", citations: 120, abstract: "Tracing the roots of Swahili journalism from colonial times to the present." },
            { title: "Voices of the Struggle", type: "Paper", publication_year: 1985, author: "Student Union", category: "Social Sciences", citations: 30, abstract: "Critical essays on the role of campus media in political liberation." },
            { title: "Tanganyika Standard Vol 1", type: "Book", publication_year: 1964, author: "National Archives", category: "General", citations: 85, abstract: "Archived copies of the Tanganyika Standard from the independence era." },
            { title: "Media Law & Ethics", type: "Book", publication_year: 2005, author: "Dr. J. K.", category: "Social Sciences", citations: 210, abstract: "A comprehensive guide to media laws and ethical standards in East Africa." },
            { title: "Radio Tanzania History", type: "Paper", publication_year: 1990, author: "Dept of Journalism", category: "Social Sciences", citations: 55, abstract: "The impact of Radio Tanzania on national unity and education." },
            { title: "The Campus Voice: 2000", type: "Journal", publication_year: 2000, author: "UDSM Media Corp", category: "General", citations: 12, abstract: "Millennium issue covering the transition to digital media." },
            { title: "Pan-Africanism and Media", type: "Book", publication_year: 1978, author: "Dr. Walter R.", category: "Social Sciences", citations: 340, abstract: "Analyzing the role of media in the Pan-African movement." },
            { title: "Engineering Innovation in TZ", type: "Paper", publication_year: 2020, author: "CoET Faculty", category: "Engineering", citations: 15, abstract: "A review of modern engineering practices at UDSM." },
            { title: "Medical Advancements 2023", type: "Journal", publication_year: 2023, author: "MUHAS/UDSM", category: "Medicine", citations: 8, abstract: "Recent clinical findings in tropical medicine." }
        ]);
    }

    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Clean up the process and try again.`);
            process.exit(1);
        } else {
            throw err;
        }
    });
});
