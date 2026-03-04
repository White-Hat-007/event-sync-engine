# Real-Time Event Synchronization Engine

A high-performance, real-time event management and synchronization system built with Node.js, Express, and Socket.io.

## 🚀 Key Features

- **Real-Time Synchronization**: Instant updates across all connected clients for event creation, RSVPs, and role changes.
- **Robust Authentication**: JWT-based secure login and registration system with role-based access control.
- **Dynamic Event Management**: Create, edit, and delete events with live feedback.
- **Interactive UI**: Premium interface with custom animations, glassmorphism, and dynamic cursors.
- **Permission Management**: Live administrative controls for user roles and permissions.

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Real-Time**: Socket.io
- **Database**: MySQL (via `mysql2`)
- **Authentication**: JWT, `bcryptjs`
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Mailing**: `nodemailer`

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/White-Hat-007/event-sync-engine.git
   cd event-sync-engine
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory and configure the following variables:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=yourpassword
   DB_NAME=event_sync_db
   JWT_SECRET=your_jwt_secret
   ```

4. **Initialize Database**:
   Run the migration script to set up the database schema:
   ```bash
   node migrate.js
   ```

5. **Start the server**:
   ```bash
   npm start
   ```
   For development with hot-reload:
   ```bash
   npm run dev
   ```

## 🤖 Antigravity Kit

This project includes the `.agent/` directory, which contains the specialized AI agents and skills used during development. This allows for seamless collaborative development with AI-agentic assistants like Antigravity.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
