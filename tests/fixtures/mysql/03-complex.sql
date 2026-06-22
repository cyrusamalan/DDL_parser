CREATE TABLE `account` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `parent_id` INT REFERENCES `account` (`id`),
  `type` ENUM('admin','user','guest') NOT NULL DEFAULT 'user',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `category` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `parent_id` INT REFERENCES `category` (`id`),
  `slug` VARCHAR(200) NOT NULL UNIQUE,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `item` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category_id` INT NOT NULL REFERENCES `category` (`id`),
  `created_by` INT NOT NULL REFERENCES `account` (`id`),
  `approved_by` INT REFERENCES `account` (`id`),
  `parent_id` INT REFERENCES `item` (`id`),
  `title` VARCHAR(500) NOT NULL,
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  `data` JSON,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `comment` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `item_id` INT NOT NULL REFERENCES `item` (`id`),
  `author_id` INT NOT NULL REFERENCES `account` (`id`),
  `parent_id` BIGINT REFERENCES `comment` (`id`),
  `body` TEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `tag` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `item_tag` (
  `item_id` INT NOT NULL REFERENCES `item` (`id`),
  `tag_id` INT NOT NULL REFERENCES `tag` (`id`),
  `added_by` INT REFERENCES `account` (`id`),
  PRIMARY KEY (`item_id`, `tag_id`)
) ENGINE=InnoDB;

CREATE INDEX `idx_item_category` ON `item` (`category_id`);
CREATE INDEX `idx_item_created_by` ON `item` (`created_by`);
CREATE INDEX `idx_comment_item` ON `comment` (`item_id`);
