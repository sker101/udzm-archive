# UDSM Journal Archive - Full Stack

A full-stack implementation of the UDSM Journal Archive, featuring real-time tracking, granular geolocation, and a comprehensive admin dashboard.

## Tech Stack
-   **Backend**: Node.js, Express, Socket.IO
-   **Database**: SQLite (via Sequelize)
-   **Frontend**: Vanilla JS, Leaflet.js
-   **Real-time**: Socket.IO

## Prerequisites
-   Node.js (v18+)
-   NPM

## Installation

1.  **Dependencies**:
    ```bash
    cd server
    npm install
    ```

2.  **Run**:
    ```bash
    # From the server directory
    npm start
    ```
    The server will start on `http://localhost:3000`.

## Features
-   **Live Heatmap**: See readers in real-time on `details.html`.
-   **Admin Panel**: Monitor uploads, downloads, and active regions in `admin.html`.
-   **API**: REST API for managing books and analytics.

## API Endpoints
-   `GET /api/books` - List all books.
-   `GET /api/access` - Log activity.
-   `GET /api/analytics` - View aggregated stats.
