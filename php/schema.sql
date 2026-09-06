-- =========================================================
-- دیتابیس سیستم حسابداری و ثبت‌نام آموزشگاه زبان غزال
-- Ghazal Language Academy Database Schema
-- =========================================================

CREATE DATABASE IF NOT EXISTS `ghazal_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ghazal_db`;

-- 1. جدول کاربران (مدیر و پذیرش)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('manager', 'reception') NOT NULL DEFAULT 'reception',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. جدول ترم‌ها
CREATE TABLE IF NOT EXISTS `terms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `status` ENUM('active', 'completed') NOT NULL DEFAULT 'active',
  `createdAt` BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. جدول سطوح آموزشی
CREATE TABLE IF NOT EXISTS `levels` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `fee` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. جدول زبان‌آموزان
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `termId` VARCHAR(100) NOT NULL,
  `firstName` VARCHAR(100) NOT NULL,
  `lastName` VARCHAR(100) NOT NULL,
  `level` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `classType` VARCHAR(50) DEFAULT 'حضوری',
  `totalPayable` INT NOT NULL DEFAULT 0,
  `amountPaid` INT NOT NULL DEFAULT 0,
  `debt` INT NOT NULL DEFAULT 0,
  `status` ENUM('paid', 'unpaid') NOT NULL DEFAULT 'unpaid',
  `receiptUrl` LONGTEXT DEFAULT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_termId` (`termId`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. جدول حقوق و دستمزد اساتید
CREATE TABLE IF NOT EXISTS `salaries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `termId` VARCHAR(100) NOT NULL,
  `teacherName` VARCHAR(150) NOT NULL,
  `role` VARCHAR(100) DEFAULT 'استاد',
  `amount` INT NOT NULL DEFAULT 0,
  `month` VARCHAR(100) NOT NULL,
  `status` ENUM('paid', 'unpaid') NOT NULL DEFAULT 'unpaid',
  `receiptUrl` LONGTEXT DEFAULT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_salary_termId` (`termId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. جدول هزینه‌های جاری
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `termId` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `amount` INT NOT NULL DEFAULT 0,
  `date` VARCHAR(50) NOT NULL,
  `receiptUrl` LONGTEXT DEFAULT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_expense_termId` (`termId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. جدول تاریخچه رسیدهای پرداختی
CREATE TABLE IF NOT EXISTS `receipts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` VARCHAR(100) NOT NULL,
  `termId` VARCHAR(100) NOT NULL,
  `paidAmount` INT NOT NULL,
  `date` VARCHAR(50) NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_receipt_studentId` (`studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- داده‌های اولیه (Default Seed Data)
-- =========================================================

-- درج کاربران اولیه (نام کاربری: admin / رمز: admin123 و نام کاربری: reception / رمز: reception123)
INSERT IGNORE INTO `users` (`id`, `username`, `password`, `role`) VALUES
(1, 'admin', 'admin123', 'manager'),
(2, 'reception', 'reception123', 'reception');

-- درج ترم پیش‌فرض
INSERT IGNORE INTO `terms` (`id`, `name`, `status`, `createdAt`) VALUES
(1, 'ترم تابستان ۱۴۰۳', 'active', 1722000000000),
(2, 'ترم پاییز ۱۴۰۳', 'active', 1729000000000);

-- درج سطوح پیش‌فرض
INSERT IGNORE INTO `levels` (`id`, `name`, `fee`) VALUES
(1, 'Elementary (A1)', 1800000),
(2, 'Pre-Intermediate (A2)', 2200000),
(3, 'Intermediate (B1)', 2500000),
(4, 'Upper-Intermediate (B2)', 2800000),
(5, 'Advanced (C1)', 3200000),
(6, 'آلمانی A1', 2900000);
