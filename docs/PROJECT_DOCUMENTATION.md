# Real-Time Event Synchronization Engine

## Complete Project Documentation

---

## Table of Contents

1. [What Is a Real-Time Event Synchronization Engine?](#1-what-is-a-real-time-event-synchronization-engine)
2. [Real-World Use Cases](#2-real-world-use-cases)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Client-Server Flow](#4-client-server-flow)
5. [Database Interaction Flow](#5-database-interaction-flow)
6. [Database Schema Design](#6-database-schema-design)
7. [Project Folder Structure](#7-project-folder-structure)
8. [Backend Implementation Details](#8-backend-implementation-details)
9. [Frontend Implementation Details](#9-frontend-implementation-details)
10. [Real-Time Synchronization Logic](#10-real-time-synchronization-logic)
11. [Installation & Setup Guide](#11-installation--setup-guide)
12. [Testing Instructions](#12-testing-instructions)
13. [Screenshot Descriptions](#13-screenshot-descriptions)
14. [Viva Questions & Answers](#14-viva-questions--answers)
15. [How to Explain This Project in an Interview](#15-how-to-explain-this-project-in-an-interview)
16. [Future Enhancements](#16-future-enhancements)

---

## 1. What Is a Real-Time Event Synchronization Engine?

A **Real-Time Event Synchronization Engine** is a full-stack web application that ensures **all connected clients see identical, up-to-date event data at every moment**. When any user creates, modifies, or deletes an event, the change is:

1. **Persisted** in a MySQL database via a REST API.
2. **Broadcast instantly** to every other connected browser through WebSockets (Socket.io).
3. **Rendered dynamically** on all dashboards — without any page refresh.

The word **"synchronization"** means that every browser tab, on any device, converges to the same state within milliseconds of a change. The word **"engine"** signifies that the core real-time broadcasting mechanism is generic and can be reused for many domains (calendars, task boards, scoreboards, etc.).

### Key Concepts Demonstrated

| Concept | Implementation |
|---|---|
| Dynamic Page Generation | Event cards rendered from database data via DOM manipulation |
| Database Query Integration | Parameterized SQL queries via mysql2/promise |
| Real-Time Updates | Socket.io WebSocket broadcasts without page refresh |
| REST API | Express.js CRUD endpoints with JSON responses |
| MVC Architecture | Separate models, controllers, routes |

---

## 2. Real-World Use Cases

| Use Case | How This Engine Applies |
|---|---|
| **Google Calendar** | Multiple users see meeting changes in real time |
| **Trello / Jira Boards** | Tasks move between columns and everyone sees instantly |
| **Live Sports Scoreboard** | Score changes broadcast to thousands of viewers |
| **Stock Trading Dashboard** | Price ticks pushed to all connected traders |
| **Chat Applications** | Messages appear on all participants' screens |
| **IoT Monitoring** | Sensor events update dashboards across control rooms |
| **Collaborative Document Editing** | Edits propagate to all editors (Google Docs model) |
| **E-Commerce Flash Sales** | Inventory count updates in real time for all shoppers |

---

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────────────┐   │
│  │ index.html│   │ style.css│   │  api.js  │   │   socket.js   │   │
│  │ (Layout) │   │ (Design) │   │(Fetch API│   │(Socket.io     │   │
│  │          │   │          │   │  CRUD)   │   │ Client)       │   │
│  └──────────┘   └──────────┘   └────┬─────┘   └───────┬───────┘   │
│                                      │                  │           │
│                     ┌────────────────┐│                  │           │
│                     │    app.js      ││                  │           │
│                     │ (DOM Render,   ├┘                  │           │
│                     │  Form Logic,   │◄─────────────────┘           │
│                     │  Real-time     │                               │
│                     │  Listeners)    │                               │
│                     └────────────────┘                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │  HTTP REST + WebSocket (ws://)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVER (Node.js)                               │
│  ┌───────────┐   ┌──────────────┐   ┌───────────────────────────┐  │
│  │ server.js │   │   Express     │   │      Socket.io Server     │  │
│  │ (Entry)   │──▶│   Middleware  │   │  ┌─────────────────────┐  │  │
│  │           │   │  ┌──────────┐ │   │  │   syncHandler.js    │  │  │
│  │           │   │  │  CORS    │ │   │  │ • connection mgmt   │  │  │
│  │           │   │  │  JSON    │ │   │  │ • full-sync request │  │  │
│  │           │   │  │  Static  │ │   │  │ • client count      │  │  │
│  │           │   │  └──────────┘ │   │  └─────────────────────┘  │  │
│  └───────────┘   └──────┬───────┘   └───────────────────────────┘  │
│                          │                                          │
│              ┌───────────▼───────────┐                              │
│              │    routes/events.js   │                              │
│              │    GET / POST / PUT   │                              │
│              │    DELETE             │                              │
│              └───────────┬───────────┘                              │
│                          │                                          │
│              ┌───────────▼───────────┐                              │
│              │ controllers/          │                              │
│              │  eventController.js   │──▶ Broadcasts via Socket.io │
│              └───────────┬───────────┘                              │
│                          │                                          │
│              ┌───────────▼───────────┐                              │
│              │  models/eventModel.js │                              │
│              │  (SQL Query Layer)    │                              │
│              └───────────┬───────────┘                              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  mysql2/promise
                           ▼
              ┌────────────────────────┐
              │     MySQL Database     │
              │  ┌──────────────────┐  │
              │  │ users            │  │
              │  │ events           │  │
              │  │ event_participants│ │
              │  │ sync_log         │  │
              │  └──────────────────┘  │
              └────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML5, CSS3, ES6 JavaScript | UI layout, styling, client logic |
| Real-Time | Socket.io (WebSocket) | Bidirectional real-time communication |
| Backend | Node.js + Express.js | REST API server, static file serving |
| Database | MySQL 8.x | Persistent relational data storage |
| ORM/Driver | mysql2/promise | Async MySQL queries with connection pooling |

---

## 4. Client-Server Flow

### Flow 1: Initial Page Load

```
Browser                          Server                       MySQL
  │                                │                            │
  │──── GET / ────────────────────▶│                            │
  │◀─── index.html + CSS + JS ────│                            │
  │                                │                            │
  │──── WebSocket connect ────────▶│                            │
  │◀─── sync:clients {count} ─────│                            │
  │                                │                            │
  │──── GET /api/events ──────────▶│                            │
  │                                │── SELECT * FROM events ──▶│
  │                                │◀── rows ──────────────────│
  │◀─── JSON {success, data} ─────│                            │
  │                                │                            │
  │  [app.js renders event cards]  │                            │
```

### Flow 2: Create Event (Real-Time Sync)

```
Browser A                        Server                      Browser B
  │                                │                            │
  │── POST /api/events ──────────▶│                            │
  │                                │── INSERT INTO events ────▶ MySQL
  │                                │◀── insertId ────────────── MySQL
  │◀── JSON {success, data} ──────│                            │
  │                                │                            │
  │                                │── io.emit('event:created')─┤
  │◀── event:created ─────────────│──── event:created ────────▶│
  │                                │                            │
  │  [card appears + toast]        │        [card appears + toast]
```

### Flow 3: Delete Event (Real-Time Sync)

```
Browser A                        Server                      Browser B
  │                                │                            │
  │── DELETE /api/events/5 ───────▶│                            │
  │                                │── DELETE FROM events ────▶ MySQL
  │◀── JSON {success, data} ──────│                            │
  │                                │── io.emit('event:deleted')─┤
  │◀── event:deleted ─────────────│──── event:deleted ────────▶│
  │                                │                            │
  │  [card removed + toast]        │        [card removed + toast]
```

---

## 5. Database Interaction Flow

```
Client Request          Controller                  Model                    MySQL
     │                      │                         │                       │
     │── HTTP request ─────▶│                         │                       │
     │                      │── await model.method() ▶│                       │
     │                      │                         │── pool.query(SQL) ───▶│
     │                      │                         │◀── ResultSet ─────────│
     │                      │◀── JavaScript Object ───│                       │
     │                      │                         │                       │
     │                      │── await logSync() ─────▶│                       │
     │                      │                         │── INSERT sync_log ──▶│
     │                      │                         │◀── OK ───────────────│
     │                      │                         │                       │
     │                      │── io.emit(broadcast) ───┤ (to all clients)     │
     │◀── JSON response ───│                         │                       │
```

### Query Types Used

| Operation | SQL | Method |
|---|---|---|
| List all events | `SELECT e.*, u.username FROM events e LEFT JOIN users u ON ...` | `EventModel.getAll()` |
| Get single event | `SELECT ... WHERE e.id = ?` | `EventModel.getById(id)` |
| Create event | `INSERT INTO events (...) VALUES (?, ?, ...)` | `EventModel.create(data)` |
| Update event | `UPDATE events SET title=?, ... WHERE id=?` | `EventModel.update(id, data)` |
| Delete event | `DELETE FROM events WHERE id=?` | `EventModel.delete(id)` |
| Log sync | `INSERT INTO sync_log (...) VALUES (?, ?, ?, ?)` | `EventModel.logSync(data)` |

All queries use **parameterized placeholders** (`?`) to prevent SQL injection.

---

## 6. Database Schema Design

### Entity-Relationship Diagram

```
┌──────────────┐       ┌──────────────────────┐       ┌───────────────────┐
│    users     │       │       events          │       │    sync_log       │
├──────────────┤       ├──────────────────────┤       ├───────────────────┤
│ PK id        │◄──┐   │ PK id                │   ┌──▶│ PK id             │
│ username     │   │   │ title                │   │   │ FK event_id       │
│ email        │   │   │ description          │   │   │ action (ENUM)     │
│ avatar_color │   ├───│ FK created_by        │   │   │ changed_data (JSON│
│ created_at   │   │   │ event_date           │───┘   │ FK performed_by   │
└──────┬───────┘   │   │ event_time           │       │ created_at        │
       │           │   │ location             │       └───────────────────┘
       │           │   │ priority (ENUM)      │
       │           │   │ status (ENUM)        │
       │           │   │ created_at           │
       │           │   │ updated_at           │
       │           │   └──────────┬───────────┘
       │           │              │
       │     ┌─────┴──────────────┴─────┐
       │     │   event_participants     │
       │     ├──────────────────────────┤
       └────▶│ PK,FK event_id          │
             │ PK,FK user_id           │
             │ rsvp_status (ENUM)      │
             │ joined_at              │
             └──────────────────────────┘
```

### Normalization

- **1NF**: All columns are atomic (no repeating groups).
- **2NF**: Non-key columns depend on the entire primary key (especially in `event_participants` with composite PK).
- **3NF**: No transitive dependencies — `creator_name` is fetched via JOIN, not stored in `events`.

### Tables Summary

| Table | Purpose | Primary Key | Foreign Keys |
|---|---|---|---|
| `users` | User accounts | `id` (AUTO_INCREMENT) | — |
| `events` | Core event data | `id` (AUTO_INCREMENT) | `created_by → users.id` |
| `event_participants` | Many-to-many mapping | `(event_id, user_id)` composite | `event_id → events.id`, `user_id → users.id` |
| `sync_log` | Audit trail of changes | `id` (AUTO_INCREMENT) | `event_id → events.id`, `performed_by → users.id` |

### Indexes

| Index | Table | Column(s) | Purpose |
|---|---|---|---|
| `idx_events_date` | events | event_date | Fast date-range queries |
| `idx_events_status` | events | status | Filter by status |
| `idx_events_priority` | events | priority | Filter by priority |
| `idx_sync_event` | sync_log | event_id | Lookup history for an event |
| `idx_sync_action` | sync_log | action | Filter by action type |
| `idx_users_username` | users | username | Username lookups |
| `idx_users_email` | users | email | Email lookups |

---

## 7. Project Folder Structure

```
Real-Time Event Synchronization Engine/
│
├── server.js                     # Express + Socket.io entry point
├── package.json                  # Dependencies & scripts
├── .env                          # Environment variables (DB config)
│
├── config/
│   └── db.js                     # MySQL connection pool (mysql2/promise)
│
├── middleware/
│   └── errorHandler.js           # Global Express error handler
│
├── routes/
│   └── events.js                 # REST API route definitions
│
├── controllers/
│   └── eventController.js        # Route handlers (CRUD + broadcast)
│
├── models/
│   └── eventModel.js             # SQL query functions (data layer)
│
├── sockets/
│   └── syncHandler.js            # Socket.io connection/sync logic
│
├── database/
│   └── schema.sql                # DDL + seed data
│
├── public/                       # Static files served by Express
│   ├── index.html                # Main HTML page
│   ├── css/
│   │   └── style.css             # Dark glassmorphism stylesheet
│   └── js/
│       ├── app.js                # Main client logic (DOM, forms, listeners)
│       ├── api.js                # Fetch API wrapper
│       └── socket.js             # Socket.io client wrapper
│
├── docs/
│   └── PROJECT_DOCUMENTATION.md  # This file
│
└── node_modules/                 # Installed packages (auto-generated)
```

---

## 8. Backend Implementation Details

### 8.1 Server Setup (`server.js`)

The entry point creates an Express app wrapped in an HTTP server, then attaches Socket.io:

```javascript
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
app.set('io', io);  // Store for controllers to access
```

**Why `http.createServer(app)`?** Socket.io requires the raw HTTP server, not just the Express app.

### 8.2 Middleware Stack

| Middleware | Purpose |
|---|---|
| `cors()` | Allows cross-origin requests during development |
| `express.json()` | Parses JSON request bodies |
| `express.urlencoded()` | Parses form-encoded bodies |
| `express.static('public')` | Serves HTML/CSS/JS files |
| `errorHandler` | Catches unhandled errors and returns JSON |

### 8.3 Database Connection (`config/db.js`)

Uses `mysql2/promise` with a connection pool for performance:

```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  connectionLimit: 10,
  // ...
});
```

**Connection pooling** avoids creating/destroying connections per request, improving throughput.

### 8.4 REST API Endpoints

| Method | Endpoint | Controller | Description |
|---|---|---|---|
| GET | `/api/events` | `getAll` | Fetch all events with creator info |
| GET | `/api/events/:id` | `getById` | Fetch single event |
| POST | `/api/events` | `create` | Create new event |
| PUT | `/api/events/:id` | `update` | Update existing event |
| DELETE | `/api/events/:id` | `delete` | Remove event |
| GET | `/api/events/sync/log` | `getSyncLog` | Get recent sync history |
| GET | `/api/health` | (inline) | Server health check |

### 8.5 Controller Pattern

Each mutation controller follows the same pattern:
1. Validate input
2. Perform database operation via Model
3. Log to `sync_log`
4. **Broadcast via Socket.io** to all clients
5. Return JSON response

```javascript
// Example: create
const newEvent = await EventModel.create(req.body);
await EventModel.logSync({ event_id: newEvent.id, action: 'CREATE', ... });
broadcast(req, 'event:created', newEvent);  // ← Real-time push
res.status(201).json({ success: true, data: newEvent });
```

### 8.6 Model Layer (`eventModel.js`)

All SQL queries use **parameterized placeholders** to prevent SQL injection:

```javascript
await pool.query('SELECT * FROM events WHERE id = ?', [id]);
```

The model also supports **dynamic UPDATE** — only fields present in the request body are updated:

```javascript
for (const [key, value] of Object.entries(data)) {
  if (allowedFields.includes(key)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
}
```

### 8.7 WebSocket Handler (`syncHandler.js`)

| Socket Event | Direction | Purpose |
|---|---|---|
| `connection` | Client → Server | New client connected |
| `disconnect` | Client → Server | Client left |
| `event:request-sync` | Client → Server | Client requests full data refresh |
| `sync:clients` | Server → All | Broadcast connected count |
| `event:full-sync` | Server → Client | Send all events to requesting client |
| `event:created` | Server → All | New event broadcast |
| `event:updated` | Server → All | Updated event broadcast |
| `event:deleted` | Server → All | Deleted event broadcast |

---

## 9. Frontend Implementation Details

### 9.1 HTML Layout (`index.html`)

Semantic HTML5 structure:

- `<header>` — Logo, live connection indicator, connected client count
- `<aside>` (sidebar) — Event creation/edit form + sync activity log
- `<section>` (dashboard) — Search bar, filters, stats chips, event card grid
- `<div>` (modal) — Delete confirmation dialog

### 9.2 CSS Design System (`style.css`)

**Design Philosophy**: Dark-themed glassmorphism with vibrant accent colors.

| Feature | Implementation |
|---|---|
| Color System | CSS custom properties (`--accent`, `--success`, `--danger`, etc.) |
| Glass Effect | `backdrop-filter: blur(18px) saturate(140%)` |
| Typography | Inter font from Google Fonts |
| Layout | CSS Grid (sidebar + dashboard), auto-fill event grid |
| Animations | `fadeSlideUp` (card entry), `pulse` (live dot), `cardFlash` (real-time update), `spin` (loader) |
| Responsive | Breakpoints at 960px (stack layout) and 600px (mobile) |
| Badges | Color-coded status and priority indicators |
| Toast Notifications | Slide-in from right, auto-dismiss |

### 9.3 JavaScript Architecture

```
app.js (Main Orchestrator)
  ├── Calls Api.fetchEvents() ──▶ api.js (Fetch wrapper)
  ├── Listens to SyncSocket.on() ──▶ socket.js (Socket.io client)
  ├── Renders DOM (event cards, stats, sync log)
  ├── Handles form submit (create / edit)
  ├── Handles search & filter
  └── Shows toast notifications
```

### 9.4 Key JavaScript Features

| Feature | Details |
|---|---|
| **Fetch API** | `api.js` wraps all REST calls with proper headers and error handling |
| **DOM Manipulation** | `innerHTML` template literals for card rendering, `createElement` for sync log entries |
| **Event Delegation** | Single click listener on `eventGrid` handles all edit/delete buttons |
| **Real-Time Rendering** | Socket listeners update the `events` array and re-render without page refresh |
| **XSS Prevention** | `escapeHtml()` sanitizes all user-generated content before rendering |
| **Search & Filter** | Client-side filtering by title/description/location, priority, and status |
| **Flash Animation** | Newly synced cards get a glowing border pulse via `.flash` class |

---

## 10. Real-Time Synchronization Logic

### How It Works

1. **Client connects** → Socket.io establishes a persistent WebSocket channel.
2. **Client creates/updates/deletes** → REST API call to Express server.
3. **Server persists** → MySQL database updated.
4. **Server broadcasts** → `io.emit('event:created/updated/deleted', data)` sent to ALL connected sockets.
5. **All clients receive** → Socket listener fires, updates local `events[]` array, re-renders DOM.
6. **Visual feedback** → Toast notification appears + card flashes with glow animation.

### Why WebSockets over Polling?

| Feature | HTTP Polling | WebSockets (Socket.io) |
|---|---|---|
| Latency | 1–5 seconds (polling interval) | < 50ms (instant push) |
| Bandwidth | High (repeated full requests) | Low (only changes sent) |
| Server Load | High (constant requests) | Low (event-driven) |
| Bidirectional | No (client→server only) | Yes (both directions) |
| Connection | New connection per request | Persistent single connection |

### Socket.io Fallback

Socket.io automatically falls back to **HTTP long-polling** if WebSockets are unavailable (corporate firewalls, older browsers), ensuring universal compatibility.

---

## 11. Installation & Setup Guide

### Prerequisites

- **Node.js** v18+ — [Download](https://nodejs.org/)
- **MySQL** 8.x — via XAMPP, WAMP, MySQL Installer, or Docker
- **Web Browser** — Chrome, Firefox, or Edge (modern)

### Step 1: Clone or copy the project

```bash
# Navigate to the project directory
cd "Real-Time Event Synchronization Engine"
```

### Step 2: Install Node.js dependencies

```bash
npm install
```

This installs: `express`, `socket.io`, `mysql2`, `dotenv`, `cors`

### Step 3: Set up MySQL Database

#### Option A: Using XAMPP

1. Start **Apache** and **MySQL** from XAMPP Control Panel.
2. Open **phpMyAdmin** at `http://localhost/phpmyadmin`.
3. Click **Import** → Choose `database/schema.sql` → Click **Go**.

#### Option B: Using MySQL Command Line

```bash
mysql -u root -p < database/schema.sql
```

#### Option C: Using MySQL Workbench

1. Open MySQL Workbench → Connect to your server.
2. File → Open SQL Script → Select `database/schema.sql`.
3. Execute (⚡ button).

### Step 4: Configure environment variables

Edit `.env` file in the project root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=          # Your MySQL password (blank for XAMPP default)
DB_NAME=event_sync_engine
DB_PORT=3306
PORT=3000
```

### Step 5: Start the server

```bash
npm start
```

You should see:

```
✅  MySQL connected — database: event_sync_engine
🚀  Server running at  http://localhost:3000
📡  WebSocket ready    ws://localhost:3000
📂  Serving frontend   .../public
```

### Step 6: Open in browser

Navigate to **http://localhost:3000**

To test real-time sync, **open a second browser tab** to the same URL.

---

## 12. Testing Instructions

### Test 1: Verify Initial Load

1. Open `http://localhost:3000`.
2. ✅ Dashboard should show 8 pre-seeded event cards.
3. ✅ Stats bar should show totals (8 Total, 6 Upcoming, 1 Ongoing, 1 Completed).
4. ✅ "Live" indicator should be green.
5. ✅ Connected client count should show "1".

### Test 2: Create Event

1. Fill in the form on the left sidebar (Title, Date, Time are required).
2. Click **Create Event**.
3. ✅ New card appears on the dashboard.
4. ✅ Green toast notification: `"Title" created successfully`.
5. ✅ Sync Activity log shows `CREATE` entry.

### Test 3: Real-Time Sync (Most Important!)

1. Open **two browser tabs** both at `http://localhost:3000`.
2. ✅ Both show client count as "2".
3. In Tab 1, create a new event.
4. ✅ The event appears in **Tab 2 automatically** without refresh.
5. ✅ Tab 2 shows a blue info toast: `New event: "Title"`.

### Test 4: Edit Event

1. Click the ✏️ (edit) button on any event card.
2. The form populates with existing data; title changes to "Edit Event".
3. Modify fields and click **Update Event**.
4. ✅ Card updates on all tabs.
5. ✅ Sync log shows `UPDATE` entry.

### Test 5: Delete Event

1. Click the 🗑️ (delete) button on any event card.
2. Confirmation modal appears.
3. Click **Delete**.
4. ✅ Card disappears from all tabs.
5. ✅ Sync log shows `DELETE` entry.

### Test 6: Search & Filter

1. Type in the search box → cards filter by title/description/location.
2. Select a priority or status from dropdowns → cards filter accordingly.
3. ✅ Filters work cumulatively (search + priority + status).

### Test 7: REST API (Direct)

Test endpoints in browser or Postman:

```
GET    http://localhost:3000/api/events
GET    http://localhost:3000/api/events/1
POST   http://localhost:3000/api/events     (JSON body)
PUT    http://localhost:3000/api/events/1    (JSON body)
DELETE http://localhost:3000/api/events/1
GET    http://localhost:3000/api/events/sync/log
GET    http://localhost:3000/api/health
```

---

## 13. Screenshot Descriptions

### Screenshot 1: Dashboard (Full View)
Dark-themed dashboard with a glassmorphism sidebar on the left containing the event creation form and sync activity log. The main area shows a responsive grid of color-coded event cards with priority indicators (left border color), status badges, date/time metadata, and action buttons. A stats bar at the top shows total, upcoming, ongoing, and completed counts. The header features a live connection indicator (green pulse dot + "Live" text) and connected client count.

### Screenshot 2: Real-Time Sync
Two browser windows side by side. A new event "Team Standup" is being created in the left window. The right window shows the same event appearing instantly with a blue info toast notification "New event: Team Standup" and a glowing card border animation.

### Screenshot 3: Edit Mode
The sidebar form is populated with an existing event's data. The form title reads "Edit Event" and the submit button says "Update Event". A "Cancel" button is visible. The corresponding event card on the dashboard is highlighted.

### Screenshot 4: Delete Confirmation
A centered modal dialog with glassmorphism background reads 'Delete "Sprint Planning"? This cannot be undone.' with red "Delete" and ghost "Cancel" buttons. The background is dimmed with a blur overlay.

### Screenshot 5: Mobile Responsive View
The same dashboard on a narrow viewport. The sidebar is stacked above the event grid. Cards display in a single column. The search and filter controls are stacked vertically.

---

## 14. Viva Questions & Answers

### Q1: What is real-time synchronization and why is it needed?
**A:** Real-time synchronization ensures all connected clients display the same data at the same instant. It is needed in collaborative applications (calendars, project boards, chat) where multiple users must see changes immediately without manually refreshing. This is achieved using WebSockets, which maintain a persistent bidirectional connection between client and server.

### Q2: Why did you use WebSockets instead of HTTP polling?
**A:** HTTP polling sends repeated requests at intervals, wasting bandwidth and creating latency. WebSockets maintain a single persistent connection and allow the server to push data to clients instantly. Socket.io adds reliability by auto-reconnecting and falling back to long-polling if WebSockets are unavailable.

### Q3: Explain the MVC architecture in your project.
**A:** **Model** (`eventModel.js`) — handles all database queries. **View** (`index.html` + `app.js`) — renders the UI. **Controller** (`eventController.js`) — contains business logic, validates input, calls models, and triggers broadcasts. **Routes** (`events.js`) — maps HTTP methods/URLs to controller functions. This separation makes the code modular, testable, and maintainable.

### Q4: How does your database schema handle the many-to-many relationship?
**A:** The `event_participants` table is a **junction table** with a composite primary key `(event_id, user_id)`. Each row links one event to one user. Both columns are foreign keys with `ON DELETE CASCADE`, so deleting an event or user automatically removes the participant entries. This is the standard approach for many-to-many relationships in relational databases.

### Q5: What is connection pooling and why do you use it?
**A:** A connection pool pre-creates a set of database connections and reuses them for incoming requests, instead of opening a new connection for each request. This reduces connection overhead and improves performance. We use `mysql2.createPool()` with `connectionLimit: 10`, meaning up to 10 concurrent queries can run simultaneously.

### Q6: How do you prevent SQL injection?
**A:** All SQL queries use **parameterized placeholders** (`?`). The `mysql2` driver automatically escapes values passed as parameters: `pool.query('SELECT * FROM events WHERE id = ?', [id])`. User input is never concatenated directly into SQL strings.

### Q7: What happens when a client disconnects and reconnects?
**A:** Socket.io detects disconnection and automatically attempts to reconnect with exponential backoff. When the connection is re-established, the `connect` event fires on the client, which triggers `event:request-sync` — the server responds with a `event:full-sync` containing all current events, bringing the client back up to date.

### Q8: Explain the real-time broadcast flow after creating an event.
**A:** (1) Client submits form → `fetch POST /api/events`. (2) Server's `eventController.create` validates input, inserts into MySQL, logs to `sync_log`. (3) Controller calls `io.emit('event:created', newEvent)` which sends the event to ALL connected sockets. (4) Every client's `socket.js` receives the event, passes it to `app.js`, which adds it to the `events[]` array and re-renders the DOM. (5) A toast notification appears on all clients.

### Q9: How is your CSS responsive?
**A:** We use CSS Grid with `grid-template-columns: 340px 1fr` for the sidebar-dashboard layout. At 960px, a `@media` query changes it to `1fr` (stacking). Event cards use `grid-template-columns: repeat(auto-fill, minmax(290px, 1fr))` for auto-flowing columns. Forms use `grid-template-columns: 1fr 1fr` which collapses to `1fr` on mobile.

### Q10: What is the sync_log table for?
**A:** The `sync_log` table is an **audit trail** that records every CREATE, UPDATE, and DELETE operation with the event ID, action type, changed data (in JSON format), and the user who performed it. This enables: (1) displaying the sync activity feed in the UI, (2) debugging data issues, (3) implementing undo functionality in the future.

### Q11: What is CORS and why do you enable it?
**A:** CORS (Cross-Origin Resource Sharing) is a browser security mechanism that blocks requests from different origins. We enable it with `cors()` middleware so that during development, the frontend (potentially on a different port) can access the API. In production, you would restrict this to specific allowed origins.

### Q12: What is the purpose of the error-handling middleware?
**A:** The `errorHandler.js` middleware is the last middleware in the Express stack. Any `next(err)` call from route handlers passes the error here. It logs the error, sets the appropriate HTTP status code, and returns a consistent JSON error response `{ success: false, message }`. In development mode, it also includes the stack trace for debugging.

### Q13: How would you add authentication to this project?
**A:** (1) Add a `password_hash` column to the `users` table. (2) Create `/api/auth/register` and `/api/auth/login` endpoints. (3) Use `bcrypt` to hash passwords. (4) Issue a JWT (JSON Web Token) on login. (5) Create an `authMiddleware` that verifies the JWT on protected routes. (6) Pass the authenticated user ID to Socket.io via the handshake.

### Q14: What is the difference between `io.emit()` and `socket.emit()`?
**A:** `io.emit()` sends an event to **all** connected clients (broadcast). `socket.emit()` sends only to the **specific client** that triggered the event. We use `io.emit()` for real-time sync broadcasts (everyone must see changes) and `socket.emit()` for responding to a specific client's sync request.

### Q15: Explain the Fetch API usage in your project.
**A:** The `api.js` file uses the browser's native `fetch()` function for all HTTP requests. For POST/PUT, we set `headers: { 'Content-Type': 'application/json' }` and `body: JSON.stringify(data)`. Each method checks `response.json().success` and throws an error if false, enabling consistent error handling in `app.js` with try/catch blocks.

---

## 15. How to Explain This Project in an Interview

### Elevator Pitch (30 seconds)

> "I built a Real-Time Event Synchronization Engine — a full-stack web app where multiple users can create, edit, and delete calendar events, and all changes appear on everyone's dashboard instantly without page refresh. The backend uses Node.js with Express for REST APIs and Socket.io for WebSocket-based real-time broadcasting, with MySQL for persistence. The frontend is pure HTML5, CSS3 with glassmorphism design, and vanilla ES6 JavaScript."

### Technical Deep Dive (2 minutes)

> "The architecture follows MVC with a clear separation — models handle SQL queries with parameterized placeholders for security, controllers contain business logic and trigger Socket.io broadcasts after each mutation, and routes map HTTP requests to controllers.
>
> The real-time sync works like this: when a client performs a CRUD operation via the REST API, the controller persists the change in MySQL and then calls `io.emit()` to broadcast the change to all connected WebSocket clients. Each client has a Socket.io listener that updates its local state array and re-renders the DOM dynamically.
>
> The database uses 4 normalized tables — users, events, a junction table for many-to-many participant mapping, and a sync_log for audit trails with JSON change data. All tables have proper indexes for query performance.
>
> On the frontend, I used CSS custom properties for theming, CSS Grid for responsive layout, and event delegation for efficient DOM event handling. The app also includes search/filter, toast notifications, and connection status indicators."

### Key Differentiators to Highlight

1. **Real-time without refresh** — the most impressive feature to demo live.
2. **Proper architecture** — MVC, separation of concerns, parameterized queries.
3. **Sync audit log** — shows enterprise-level thinking.
4. **No framework overhead** — pure vanilla JS demonstrates core competency.
5. **Error handling** — global middleware, form validation, graceful disconnection recovery.

---

## 16. Future Enhancements

| Enhancement | Complexity | Description |
|---|---|---|
| **User Authentication** | Medium | JWT-based login/register with bcrypt password hashing |
| **Role-Based Access Control** | Medium | Admin/editor/viewer roles with route-level permissions |
| **Event Reminders** | Medium | Node-cron scheduled notifications before event time |
| **Drag-and-Drop Calendar** | High | FullCalendar.js integration with drag-to-reschedule |
| **File Attachments** | Medium | Multer file upload with cloud storage (AWS S3) |
| **Email Notifications** | Medium | Nodemailer integration for event invitations |
| **Offline Support** | High | Service Worker + IndexedDB for offline queue, sync when back online |
| **Event Recurrence** | Medium | Recurring events (daily/weekly/monthly) with RRULE parsing |
| **Conflict Resolution** | High | Optimistic concurrency with version numbers for simultaneous edits |
| **Mobile App** | High | React Native or Flutter app using the same REST/WebSocket APIs |
| **Analytics Dashboard** | Medium | Charts showing event distribution, user activity, peak times |
| **Dark/Light Theme Toggle** | Low | CSS custom property switching with localStorage persistence |
| **Export to Calendar** | Low | Generate .ics files for Google Calendar / Outlook import |
| **Rate Limiting** | Low | express-rate-limit to prevent API abuse |
| **Docker Deployment** | Medium | Dockerfile + docker-compose for one-command deployment |

---

## License

This project is created for academic/educational purposes as a college milestone project.

---

*Generated as a complete end-to-end Full-Stack Web Application demonstrating dynamic web technologies, database integration, and real-time communication.*
