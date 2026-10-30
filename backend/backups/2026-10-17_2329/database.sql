-- MySQL dump 10.13  Distrib 26.7.0, for Win64 (x86_64)
--
-- Host: localhost    Database: divyadip_erp
-- ------------------------------------------------------
-- Server version	26.7.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'a2453248-c3d8-11f1-b5de-9c65eb05fbee:1-91';

--
-- Table structure for table `challans`
--

DROP TABLE IF EXISTS `challans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `challans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `challan_no` varchar(50) DEFAULT NULL,
  `party` varchar(150) DEFAULT NULL,
  `challan_date` date NOT NULL,
  `challan_time` time DEFAULT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `file_name` varchar(100) NOT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `file_type` enum('image','pdf') NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_challans_date` (`challan_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `challans`
--

LOCK TABLES `challans` WRITE;
/*!40000 ALTER TABLE `challans` DISABLE KEYS */;
INSERT INTO `challans` VALUES (1,'123','divyadip','2026-10-13','17:08:00','testing','ff8845fe-4d8b-4f74-902e-18edc1d5de81.jpg','gst.jpeg','image',1,'2026-10-13 11:39:29');
/*!40000 ALTER TABLE `challans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_settings`
--

DROP TABLE IF EXISTS `company_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_settings` (
  `id` tinyint NOT NULL,
  `name` varchar(150) NOT NULL,
  `address` varchar(300) NOT NULL,
  `state_code` char(2) NOT NULL,
  `gstin` varchar(15) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `bank_details` varchar(500) DEFAULT NULL,
  `terms` varchar(1000) DEFAULT NULL,
  `default_gst_rate` decimal(5,2) NOT NULL DEFAULT '18.00',
  `invoice_start_no` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_settings`
--

LOCK TABLES `company_settings` WRITE;
/*!40000 ALTER TABLE `company_settings` DISABLE KEYS */;
INSERT INTO `company_settings` VALUES (1,'Divyadip Enterprises','Plot No. G-85, Randivewadi Village Road, 5-Star MIDC, Kagal, Kolhapur','27','27ATHPP6025A1ZX',NULL,NULL,NULL,'E. & O.E.\nSubject to Maharashtra jurisdiction only.',18.00,1);
/*!40000 ALTER TABLE `company_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `address` varchar(300) NOT NULL,
  `state_code` char(2) NOT NULL,
  `gstin` varchar(15) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customers_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'harsh','midc kagal','27',NULL,'1234567890',1,'2026-10-15 04:35:44'),(2,'sayam','xsss','24',NULL,'121212121',1,'2026-10-15 15:52:37');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `sort_order` int NOT NULL,
  `description` varchar(255) NOT NULL,
  `hsn_sac` varchar(8) DEFAULT NULL,
  `qty` decimal(12,3) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `rate` decimal(12,2) NOT NULL,
  `gst_rate` decimal(5,2) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_items`
--

LOCK TABLES `invoice_items` WRITE;
/*!40000 ALTER TABLE `invoice_items` DISABLE KEYS */;
INSERT INTO `invoice_items` VALUES (1,1,1,'metal','1111',10.000,'Pcs',500.00,18.00,5000.00),(2,2,1,'metal2','11111',50.000,'Pcs',5000.00,18.00,250000.00);
/*!40000 ALTER TABLE `invoice_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fy` varchar(7) NOT NULL,
  `seq` int NOT NULL,
  `invoice_date` date NOT NULL,
  `customer_id` int DEFAULT NULL,
  `bill_name` varchar(150) NOT NULL,
  `bill_address` varchar(300) NOT NULL,
  `bill_gstin` varchar(15) DEFAULT NULL,
  `bill_state_code` char(2) NOT NULL,
  `ship_name` varchar(150) NOT NULL,
  `ship_address` varchar(300) NOT NULL,
  `ship_gstin` varchar(15) DEFAULT NULL,
  `ship_state_code` char(2) NOT NULL,
  `place_of_supply` char(2) NOT NULL,
  `reverse_charge` char(1) NOT NULL DEFAULT 'N',
  `transport` varchar(100) DEFAULT NULL,
  `vehicle_no` varchar(30) DEFAULT NULL,
  `gr_rr_no` varchar(50) DEFAULT NULL,
  `station` varchar(100) DEFAULT NULL,
  `is_interstate` tinyint(1) NOT NULL,
  `taxable_total` decimal(12,2) NOT NULL,
  `cgst_total` decimal(12,2) NOT NULL,
  `sgst_total` decimal(12,2) NOT NULL,
  `igst_total` decimal(12,2) NOT NULL,
  `round_off` decimal(6,2) NOT NULL,
  `grand_total` decimal(12,2) NOT NULL,
  `groups_json` text NOT NULL,
  `seller_json` text NOT NULL,
  `status` enum('issued','cancelled') NOT NULL DEFAULT 'issued',
  `cancel_reason` varchar(255) DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoice_no` (`fy`,`seq`),
  KEY `idx_invoices_date` (`invoice_date`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES (1,'2026-27',1,'2026-10-15',1,'harsh','midc kagal',NULL,'27','harsh','midc kagal',NULL,'27','27','N',NULL,NULL,NULL,NULL,0,5000.00,450.00,450.00,0.00,0.00,5900.00,'[{\"rate\":18,\"taxable\":5000,\"cgst\":450,\"sgst\":450,\"igst\":0}]','{\"name\":\"Divyadip Enterprises\",\"address\":\"Plot No. G-85, Randivewadi Village Road, 5-Star MIDC, Kagal, Kolhapur\",\"stateCode\":\"27\",\"gstin\":\"27ATHPP6025A1ZX\",\"phone\":\"\",\"email\":\"\",\"bankDetails\":\"\",\"terms\":\"E. & O.E.\\nSubject to Maharashtra jurisdiction only.\"}','issued',NULL,NULL,1,'2026-10-15 04:36:28'),(2,'2026-27',2,'2026-10-15',2,'sayam','xsss',NULL,'24','sayam','xsss',NULL,'24','24','N',NULL,NULL,NULL,NULL,1,250000.00,0.00,0.00,45000.00,0.00,295000.00,'[{\"rate\":18,\"taxable\":250000,\"cgst\":0,\"sgst\":0,\"igst\":45000}]','{\"name\":\"Divyadip Enterprises\",\"address\":\"Plot No. G-85, Randivewadi Village Road, 5-Star MIDC, Kagal, Kolhapur\",\"stateCode\":\"27\",\"gstin\":\"27ATHPP6025A1ZX\",\"phone\":\"\",\"email\":\"\",\"bankDetails\":\"\",\"terms\":\"E. & O.E.\\nSubject to Maharashtra jurisdiction only.\"}','issued',NULL,NULL,1,'2026-10-15 15:53:26');
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_completions`
--

DROP TABLE IF EXISTS `job_completions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_completions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `qty` int NOT NULL,
  `completed_date` date NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  CONSTRAINT `job_completions_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_completions`
--

LOCK TABLES `job_completions` WRITE;
/*!40000 ALTER TABLE `job_completions` DISABLE KEYS */;
INSERT INTO `job_completions` VALUES (1,1,25,'2026-10-11',NULL),(2,1,15,'2026-10-11',NULL),(3,1,10,'2026-10-11',NULL),(4,2,50,'2026-10-11',NULL),(5,2,10,'2026-10-12',NULL),(6,2,20,'2026-10-13',NULL);
/*!40000 ALTER TABLE `job_completions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_cost_tools`
--

DROP TABLE IF EXISTS `job_cost_tools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_cost_tools` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cost_id` int NOT NULL,
  `sort_order` int NOT NULL,
  `tool_name` varchar(150) NOT NULL,
  `qty` decimal(10,2) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `cost_id` (`cost_id`),
  CONSTRAINT `job_cost_tools_ibfk_1` FOREIGN KEY (`cost_id`) REFERENCES `job_costs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_cost_tools`
--

LOCK TABLES `job_cost_tools` WRITE;
/*!40000 ALTER TABLE `job_cost_tools` DISABLE KEYS */;
INSERT INTO `job_cost_tools` VALUES (5,1,1,'miling',10.00,4000.00),(6,1,2,'miling 2',15.00,5000.00),(7,1,3,'30 degree cutter',10.00,5000.00),(8,1,4,'45 degree cutter',20.00,3000.00),(9,2,1,'miling',20.00,40000.00);
/*!40000 ALTER TABLE `job_cost_tools` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_cost_workers`
--

DROP TABLE IF EXISTS `job_cost_workers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_cost_workers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cost_id` int NOT NULL,
  `sort_order` int NOT NULL,
  `worker_name` varchar(100) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `cost_id` (`cost_id`),
  CONSTRAINT `job_cost_workers_ibfk_1` FOREIGN KEY (`cost_id`) REFERENCES `job_costs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_cost_workers`
--

LOCK TABLES `job_cost_workers` WRITE;
/*!40000 ALTER TABLE `job_cost_workers` DISABLE KEYS */;
INSERT INTO `job_cost_workers` VALUES (2,1,1,'worker',7000.00),(3,2,1,'worker',3000.00);
/*!40000 ALTER TABLE `job_cost_workers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_costs`
--

DROP TABLE IF EXISTS `job_costs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_costs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `record_date` date NOT NULL,
  `job_name` varchar(150) NOT NULL,
  `jobs_count` int NOT NULL,
  `rate_per_job` decimal(12,2) NOT NULL DEFAULT '0.00',
  `revenue` decimal(14,2) NOT NULL DEFAULT '0.00',
  `scrap_kg` decimal(10,2) NOT NULL DEFAULT '0.00',
  `scrap_rate` decimal(10,2) NOT NULL DEFAULT '0.00',
  `scrap_value` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tools_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `workers_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_cost` decimal(12,2) NOT NULL,
  `profit` decimal(14,2) NOT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_job_costs_date` (`record_date`),
  KEY `idx_job_costs_name` (`job_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_costs`
--

LOCK TABLES `job_costs` WRITE;
/*!40000 ALTER TABLE `job_costs` DISABLE KEYS */;
INSERT INTO `job_costs` VALUES (1,'2026-10-17','620',50,1000.00,50000.00,200.00,25.00,5000.00,17000.00,7000.00,19000.00,31000.00,NULL,1,'2026-10-17 08:45:38'),(2,'2026-10-17','cutter',30,3000.00,90000.00,200.00,20.00,4000.00,40000.00,3000.00,39000.00,51000.00,NULL,1,'2026-10-17 14:06:37');
/*!40000 ALTER TABLE `job_costs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `challan_no` varchar(50) DEFAULT NULL,
  `job_name` varchar(150) NOT NULL,
  `description` text,
  `company` varchar(150) NOT NULL,
  `inward_date` date NOT NULL,
  `inward_time` time DEFAULT NULL,
  `vehicle_no` varchar(30) DEFAULT NULL,
  `unit` varchar(20) DEFAULT 'pcs',
  `total_qty` int NOT NULL,
  `challan_file` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
INSERT INTO `jobs` VALUES (1,NULL,'gear shaftng','testing','xyz','2026-10-11','18:03:00','MH 09 EX 1234','pcs',50,NULL,'2026-10-11 12:34:42'),(2,NULL,'machine 1','testing ','xyz','2026-10-11','23:41:00','mh 09 ex 1234','pcs',100,NULL,'2026-10-11 18:12:02');
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_payments`
--

DROP TABLE IF EXISTS `purchase_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `paid_date` date NOT NULL,
  `mode` enum('cash','upi','bank','cheque','other') NOT NULL DEFAULT 'cash',
  `note` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `purchase_id` (`purchase_id`),
  CONSTRAINT `purchase_payments_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_payments`
--

LOCK TABLES `purchase_payments` WRITE;
/*!40000 ALTER TABLE `purchase_payments` DISABLE KEYS */;
INSERT INTO `purchase_payments` VALUES (1,1,200000.00,'2026-10-13','upi',NULL,'2026-10-12 18:35:33'),(2,1,100000.00,'2026-10-13','cash',NULL,'2026-10-13 04:21:20'),(3,1,200000.00,'2026-10-13','cash',NULL,'2026-10-13 04:22:25'),(4,2,200000.00,'2026-10-13','upi',NULL,'2026-10-13 04:23:12'),(5,2,100000.00,'2026-10-13','cash',NULL,'2026-10-13 04:23:33');
/*!40000 ALTER TABLE `purchase_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchases`
--

DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shop_name` varchar(150) NOT NULL,
  `bill_no` varchar(50) DEFAULT NULL,
  `purchase_date` date NOT NULL,
  `material` text NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_purchases_shop` (`shop_name`),
  KEY `idx_purchases_date` (`purchase_date`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchases`
--

LOCK TABLES `purchases` WRITE;
/*!40000 ALTER TABLE `purchases` DISABLE KEYS */;
INSERT INTO `purchases` VALUES (1,'diptesh','123','2026-10-13','200kg rod',500000.00,NULL,'2026-10-12 18:35:33'),(2,'midc factory','56','2026-10-13','50 cuttings',700000.00,NULL,'2026-10-13 04:23:12');
/*!40000 ALTER TABLE `purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `received_bill_lines`
--

DROP TABLE IF EXISTS `received_bill_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `received_bill_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bill_id` int NOT NULL,
  `sort_order` int NOT NULL,
  `taxable` decimal(12,2) NOT NULL,
  `gst_rate` decimal(5,2) NOT NULL,
  `cgst` decimal(12,2) NOT NULL,
  `sgst` decimal(12,2) NOT NULL,
  `igst` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bill_id` (`bill_id`),
  CONSTRAINT `received_bill_lines_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `received_bills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `received_bill_lines`
--

LOCK TABLES `received_bill_lines` WRITE;
/*!40000 ALTER TABLE `received_bill_lines` DISABLE KEYS */;
INSERT INTO `received_bill_lines` VALUES (1,1,1,15900.00,18.00,1431.00,1431.00,0.00);
/*!40000 ALTER TABLE `received_bill_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `received_bills`
--

DROP TABLE IF EXISTS `received_bills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `received_bills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supplier_name` varchar(150) NOT NULL,
  `supplier_gstin` varchar(15) DEFAULT NULL,
  `supplier_state_code` char(2) NOT NULL,
  `invoice_no` varchar(50) NOT NULL,
  `invoice_date` date NOT NULL,
  `place_of_supply` char(2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_interstate` tinyint(1) NOT NULL,
  `taxable_total` decimal(12,2) NOT NULL,
  `cgst_total` decimal(12,2) NOT NULL,
  `sgst_total` decimal(12,2) NOT NULL,
  `igst_total` decimal(12,2) NOT NULL,
  `bill_total` decimal(12,2) NOT NULL,
  `itc_eligible` tinyint(1) NOT NULL DEFAULT '1',
  `notes` varchar(255) DEFAULT NULL,
  `file_name` varchar(100) DEFAULT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `file_type` enum('image','pdf') DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_received_date` (`invoice_date`),
  KEY `idx_received_supplier` (`supplier_gstin`,`invoice_no`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `received_bills`
--

LOCK TABLES `received_bills` WRITE;
/*!40000 ALTER TABLE `received_bills` DISABLE KEYS */;
INSERT INTO `received_bills` VALUES (1,'S B tools',NULL,'27','1841/2026-27','2026-10-16','27','tcmt 220408',0,15900.00,1431.00,1431.00,0.00,18762.00,0,NULL,NULL,NULL,NULL,1,'2026-10-16 05:54:51');
/*!40000 ALTER TABLE `received_bills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `password_hash` varchar(100) NOT NULL,
  `role` enum('admin','staff') NOT NULL DEFAULT 'staff',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `failed_attempts` int NOT NULL DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `token_version` int NOT NULL DEFAULT '0',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'divyadiperp','sayam oswal','$2b$12$9AAxW48i8u2xK7g.Y/pOX.ifQ4OifUSyOkjdNxc/MShc4lovMOAgW','admin',1,0,NULL,0,'2026-10-17 23:08:20','2026-10-11 19:17:40');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'divyadip_erp'
--
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-17 23:29:48
