-- ============================================================
-- Real-Time Event Synchronization Engine — Database Schema
-- MySQL 8.x Compatible
-- ============================================================

CREATE DATABASE IF NOT EXISTS event_sync_engine
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE event_sync_engine;

-- ────────────────────────────────────────────────────────────
-- 1. USERS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)   NOT NULL,
  email         VARCHAR(100)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('admin','user') DEFAULT 'user',
  avatar_color  VARCHAR(7)    DEFAULT '#6C63FF',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_users_username (username),
  INDEX idx_users_email    (email)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
-- 2. EVENTS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(150)  NOT NULL,
  description TEXT,
  event_date  DATE          NOT NULL,
  event_time  TIME          NOT NULL,
  location    VARCHAR(200),
  priority    ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  status      ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
  created_by  INT           NOT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_events_date   (event_date),
  INDEX idx_events_status (status),
  INDEX idx_events_priority (priority)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
-- 3. EVENT PARTICIPANTS (many-to-many)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_participants (
  event_id    INT NOT NULL,
  user_id     INT NOT NULL,
  rsvp_status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  joined_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────────
-- 4. SYNC LOG — audit trail for every mutation
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_log (
  id           INT          AUTO_INCREMENT PRIMARY KEY,
  event_id     INT,
  action       ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  changed_data JSON,
  performed_by INT,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (event_id)     REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES users(id)  ON DELETE SET NULL,

  INDEX idx_sync_event  (event_id),
  INDEX idx_sync_action (action)
) ENGINE=InnoDB;

