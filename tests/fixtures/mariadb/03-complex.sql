CREATE TABLE `tenant` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `parent_id` INT REFERENCES `tenant`(`id`),
  `status` ENUM('active','suspended','trial') NOT NULL DEFAULT 'trial',
  `settings` JSON,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `role` (
  `id` TINYINT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL REFERENCES `tenant`(`id`),
  `name` VARCHAR(50) NOT NULL,
  `parent_role_id` TINYINT REFERENCES `role`(`id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `account` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL REFERENCES `tenant`(`id`),
  `email` VARCHAR(255) NOT NULL,
  `role_id` TINYINT NOT NULL REFERENCES `role`(`id`),
  `created_by` INT REFERENCES `account`(`id`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `resource` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL REFERENCES `tenant`(`id`),
  `owner_id` INT NOT NULL REFERENCES `account`(`id`),
  `parent_id` BIGINT REFERENCES `resource`(`id`),
  `type` ENUM('document','image','video','archive') NOT NULL,
  `metadata` JSON,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `permission` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `resource_id` BIGINT NOT NULL REFERENCES `resource`(`id`),
  `role_id` TINYINT NOT NULL REFERENCES `role`(`id`),
  `granted_by` INT REFERENCES `account`(`id`),
  `action` ENUM('read','write','delete','share') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE INDEX `idx_resource_tenant` ON `resource` (`tenant_id`);
CREATE INDEX `idx_permission_resource` ON `permission` (`resource_id`);
