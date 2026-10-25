-- ============================================================
-- DonatePlatform v0.2.0 — Инициализация MySQL
-- Сгенерировано на основе Prisma-схемы 2026-05-25
-- ============================================================

CREATE DATABASE IF NOT EXISTS donate_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE donate_platform;

-- -----------------------------------------------------------
-- Пользователи (администраторы)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `User` (
  `id`        CHAR(36)     NOT NULL,
  `email`     VARCHAR(191) NOT NULL,
  `password`  VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`),
  KEY `User_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Игровые серверы
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Server` (
  `id`           CHAR(36)     NOT NULL,
  `name`         VARCHAR(191) NOT NULL,
  `gameType`     VARCHAR(191) NOT NULL,
  `ipAddress`    VARCHAR(191) NOT NULL,
  `slug`         VARCHAR(191) NOT NULL,
  `customDomain` VARCHAR(191) NULL,
  `verifiedDns`  TINYINT(1)   NOT NULL DEFAULT 0,
  `ownerId`      CHAR(36)     NOT NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Server_slug_key` (`slug`),
  UNIQUE KEY `Server_customDomain_key` (`customDomain`),
  KEY `Server_slug_idx` (`slug`),
  KEY `Server_customDomain_idx` (`customDomain`),
  KEY `Server_ownerId_idx` (`ownerId`),
  CONSTRAINT `Server_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Товары
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Product` (
  `id`                   CHAR(36)     NOT NULL,
  `name`                 VARCHAR(191) NOT NULL,
  `description`          TEXT         NULL,
  `imageUrl`             VARCHAR(500) NULL,
  `price`                DOUBLE       NOT NULL,
  `actionsJson`          TEXT         NULL,
  `actionsSchemaVersion` VARCHAR(10)  NULL DEFAULT 'v1',
  `serverId`             CHAR(36)     NOT NULL,
  `createdAt`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Product_serverId_idx` (`serverId`),
  CONSTRAINT `Product_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Заказы
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Order` (
  `id`               CHAR(36)     NOT NULL,
  `playerName`       VARCHAR(191) NOT NULL,
  `status`           VARCHAR(191) NOT NULL DEFAULT 'pending',
  `totalAmount`      DOUBLE       NOT NULL DEFAULT 0,
  `commissionPct`    DOUBLE       NOT NULL DEFAULT 10.0,
  `commissionAmt`    DOUBLE       NOT NULL DEFAULT 0,
  `ownerAmount`      DOUBLE       NOT NULL DEFAULT 0,
  `retryCount`       INT          NOT NULL DEFAULT 0,
  `maxRetries`       INT          NOT NULL DEFAULT 3,
  `lastError`        TEXT         NULL,
  `committedActions` TEXT         NULL,
  `productId`        CHAR(36)     NOT NULL,
  `serverId`         CHAR(36)     NOT NULL,
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Order_serverId_idx` (`serverId`),
  KEY `Order_status_idx` (`status`),
  KEY `Order_status_serverId_idx` (`status`, `serverId`),
  KEY `Order_createdAt_idx` (`createdAt`),
  CONSTRAINT `Order_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Order_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Попытки доставки
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `DeliveryAttempt` (
  `id`             CHAR(36)     NOT NULL,
  `orderId`        CHAR(36)     NOT NULL,
  `actionIndex`    INT          NOT NULL,
  `actionType`     VARCHAR(191) NOT NULL,
  `status`         VARCHAR(191) NOT NULL DEFAULT 'executing',
  `error`          TEXT         NULL,
  `rollbackStatus` VARCHAR(191) NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `DeliveryAttempt_orderId_idx` (`orderId`),
  CONSTRAINT `DeliveryAttempt_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Токены плагинов
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ServerPluginToken` (
  `id`        CHAR(36)     NOT NULL,
  `serverId`  CHAR(36)     NOT NULL,
  `token`     VARCHAR(191) NOT NULL,
  `label`     VARCHAR(191) NULL,
  `lastSeen`  DATETIME(3)  NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ServerPluginToken_token_key` (`token`),
  KEY `ServerPluginToken_serverId_idx` (`serverId`),
  KEY `ServerPluginToken_token_idx` (`token`),
  CONSTRAINT `ServerPluginToken_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Члены сервера (роли)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ServerMember` (
  `id`       CHAR(36)     NOT NULL,
  `serverId` CHAR(36)     NOT NULL,
  `userId`   CHAR(36)     NOT NULL,
  `role`     VARCHAR(191) NOT NULL DEFAULT 'moderator',
  `joinedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ServerMember_serverId_userId_key` (`serverId`, `userId`),
  KEY `ServerMember_serverId_idx` (`serverId`),
  KEY `ServerMember_userId_idx` (`userId`),
  CONSTRAINT `ServerMember_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ServerMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Кошелёк сервера
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Wallet` (
  `id`          CHAR(36)    NOT NULL,
  `serverId`    CHAR(36)    NOT NULL,
  `balance`     DOUBLE      NOT NULL DEFAULT 0,
  `totalEarned` DOUBLE      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Wallet_serverId_key` (`serverId`),
  KEY `Wallet_serverId_idx` (`serverId`),
  CONSTRAINT `Wallet_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Транзакции кошелька
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Transaction` (
  `id`        CHAR(36)     NOT NULL,
  `walletId`  CHAR(36)     NOT NULL,
  `amount`    DOUBLE       NOT NULL,
  `type`      VARCHAR(191) NOT NULL,
  `orderId`   CHAR(36)     NULL,
  `note`      TEXT         NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Transaction_walletId_idx` (`walletId`),
  KEY `Transaction_orderId_idx` (`orderId`),
  KEY `Transaction_createdAt_idx` (`createdAt`),
  CONSTRAINT `Transaction_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `Wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- Заявки на вывод средств
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `WithdrawalRequest` (
  `id`          CHAR(36)     NOT NULL,
  `walletId`    CHAR(36)     NOT NULL,
  `amount`      DOUBLE       NOT NULL,
  `method`      VARCHAR(191) NOT NULL,
  `destination` VARCHAR(191) NOT NULL,
  `status`      VARCHAR(191) NOT NULL DEFAULT 'pending',
  `note`        TEXT         NULL,
  `serverId`    CHAR(36)     NOT NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `WithdrawalRequest_walletId_idx` (`walletId`),
  KEY `WithdrawalRequest_serverId_idx` (`serverId`),
  KEY `WithdrawalRequest_status_idx` (`status`),
  CONSTRAINT `WithdrawalRequest_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `Wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `WithdrawalRequest_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `Server` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
