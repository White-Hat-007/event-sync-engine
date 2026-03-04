# Real-Time Event Synchronization Engine

A high-performance, full-stack event management system designed for seamless data synchronization across multiple clients. This project demonstrates a robust implementation of real-time communication, relational database design, and modular backend architecture.

---

## 🏗️ System Architecture (MVC)

The engine is built on a strict **Model-View-Controller (MVC)** pattern to ensure scalability and maintainable code.

- **Model**: Located in `models/eventModel.js`, it encapsulates all database logic using `mysql2/promise`. It utilizes connection pooling and parameterized queries to ensure data integrity and security.
- **View**: A lightweight frontend in `public/` using Vanilla ES6 JavaScript, semantic HTML5, and premium CSS (glassmorphism). It handles dynamic DOM rendering without the overhead of a framework.
- **Controller**: Found in `controllers/eventController.js`, it manages the business logic, facilitates communication between the model and view, and triggers real-time broadcasts.
- **Routes**: Defined in `routes/events.js`, providing internal REST API endpoints for CRUD operations.

---

## 📡 Real-Time Synchronization Logic

The core of this engine is its bidirectional communication layer powered by **Socket.io (WebSockets)**.

1. **Persistent Connection**: Upon page load, the client establishes a persistent WebSocket connection to the Node.js server.
2. **Mutation Broadcasts**: When a user performs a Create, Update, or Delete operation via the REST API, the server:
   - Persists the change in MySQL.
   - Logs the activity in `sync_log`.
   - Uses `io.emit()` to broadcast the specific event (e.g., `event:created`) to **all** connected clients.
3. **Dynamic State Management**: Clients listen for these broadcasts and update their local state and DOM instantly, providing a "Zero-Refresh" experience.
4. **Resilience**: The system includes automatic reconnection logic and a "full-sync" request mechanism to ensure clients are always up-to-date, even after network interruptions.

---

## 🗄️ Database Design & Normalization

The project utilizes a relational MySQL schema designed for efficiency and data consistency.

- **`users`**: Manages accounts with role-based access control (Admin/User).
- **`events`**: Stores core event metadata (title, timing, location, priority).
- **`event_participants`**: A junction table resolving the many-to-many relationship between users and events.
- **`sync_log`**: An audit trail storing every mutation with high-resolution timestamps and JSON snapshots of changed data.

**Key Technical Implementations:**
- **Foreign Key Constraints**: `ON DELETE CASCADE` ensures referential integrity across related tables.
- **Connection Pooling**: Optimized to handle concurrent queries without overhead.
- **Indexing**: Strategic indexes on `event_date`, `status`, and `priority` for high-speed filtering.

---

## 📂 Project Structure

```plaintext
├── server.js           # Entry point (Express + Socket.io)
├── config/             # Database & Environment configuration
├── controllers/        # Business logic & Broadcast handlers
├── models/             # Data access layer (SQL Queries)
├── routes/             # API Route definitions
├── middleware/         # Centralized error handling
├── sockets/            # WebSocket connection management
├── database/           # Schema (DDL) and initial seed data
└── public/             # Frontend assets (Vanilla JS/CSS)
```

---

## 🔒 Security & Performance

- **SQL Injection Prevention**: 100% usage of parameterized queries.
- **JWT Authentication**: Secure, token-based session management.
- **Error Handling**: Centralized middleware to prevent sensitive data leakage.
- **Glassmorphism UI**: High-end aesthetic utilizing `backdrop-filter` and CSS Grid for a responsive, premium experience.

---

*This project serves as a comprehensive demonstration of full-stack engineering principles, from real-time networking to relational data modeling.*
