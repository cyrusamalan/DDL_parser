CREATE TABLE `user` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `parent_id` INT REFERENCES `user` (`id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `group` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `owner_id` INT NOT NULL REFERENCES `user` (`id`),
  `created_by` INT REFERENCES `user` (`id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `group_member` (
  `group_id` INT NOT NULL REFERENCES `group` (`id`),
  `user_id` INT NOT NULL REFERENCES `user` (`id`),
  `role` VARCHAR(50) NOT NULL DEFAULT 'member',
  PRIMARY KEY (`group_id`, `user_id`)
) ENGINE=InnoDB;

CREATE TABLE `order` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL REFERENCES `user` (`id`),
  `group_id` INT REFERENCES `group` (`id`),
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `order_item` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL REFERENCES `order` (`id`),
  `quantity` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;
