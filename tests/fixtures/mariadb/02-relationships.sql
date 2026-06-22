CREATE TABLE `user` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `manager_id` INT REFERENCES `user`(`id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `project` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `lead_id` INT NOT NULL REFERENCES `user`(`id`),
  `reviewer_id` INT REFERENCES `user`(`id`),
  `parent_id` INT REFERENCES `project`(`id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `task` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `project_id` INT NOT NULL REFERENCES `project`(`id`),
  `assigned_to` INT REFERENCES `user`(`id`),
  `created_by` INT NOT NULL REFERENCES `user`(`id`),
  `parent_task_id` BIGINT REFERENCES `task`(`id`),
  `title` VARCHAR(500) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `comment` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `task_id` BIGINT NOT NULL REFERENCES `task`(`id`),
  `user_id` INT NOT NULL REFERENCES `user`(`id`),
  `parent_comment_id` BIGINT REFERENCES `comment`(`id`),
  `body` TEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;
