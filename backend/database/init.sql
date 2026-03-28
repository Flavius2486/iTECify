-- ============================================================
-- Database schema for iTECify collaborative rooms
-- MySQL 8.0+ (uses UUID() as default)
-- ============================================================

-- Table: users
CREATE TABLE IF NOT EXISTS `user` (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Table: rooms
CREATE TABLE IF NOT EXISTS `room` (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    join_code VARCHAR(8) NOT NULL UNIQUE,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES `user`(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by),
    INDEX idx_join_code (join_code)
) ENGINE=InnoDB;

-- Table: room_participants
CREATE TABLE IF NOT EXISTS `room_participant` (
    room_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES `room`(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES `user`(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Table: messages
CREATE TABLE IF NOT EXISTS `message` (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    room_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES `room`(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES `user`(id) ON DELETE CASCADE,
    INDEX idx_room (room_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Table: code_files
CREATE TABLE IF NOT EXISTS `code_file` (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    room_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    language VARCHAR(50),
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES `room`(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES `user`(id) ON DELETE CASCADE,
    INDEX idx_room (room_id),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB;