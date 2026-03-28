-- Complete database schema for iTECify messaging system
-- MySQL 8.0+ required (uses UUID() as default)

CREATE DATABASE IF NOT EXISTS itecify;
USE itecify;

-- Table: user
CREATE TABLE IF NOT EXISTS `user` (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'human',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- Table: text (stores actual text messages)
CREATE TABLE IF NOT EXISTS `text` (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sender_id CHAR(36) NOT NULL,
    receiver_id CHAR(36) NOT NULL,
    message TEXT,
    send_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_by_sender BOOLEAN DEFAULT FALSE,
    deleted_by_receiver BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (sender_id) REFERENCES `user`(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES `user`(id) ON DELETE CASCADE,
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id)
) ENGINE=InnoDB;

-- Table: chat (connects a text message with an optional code snippet)
CREATE TABLE IF NOT EXISTS `chat` (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    text_id CHAR(36) DEFAULT NULL,
    code_id CHAR(36) DEFAULT NULL,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (text_id) REFERENCES `text`(id) ON DELETE SET NULL,
    INDEX idx_text (text_id),
    INDEX idx_code (code_id)
) ENGINE=InnoDB;

-- Table: code (stores code snippets linked to a chat)
CREATE TABLE IF NOT EXISTS `code` (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    chat_id CHAR(36) NOT NULL,
    code TEXT NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES `chat`(id) ON DELETE SET NULL,
    INDEX idx_chat (chat_id)
) ENGINE=InnoDB;
