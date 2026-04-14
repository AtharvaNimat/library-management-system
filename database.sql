CREATE DATABASE library_db;
USE library_db;

-- Books table
CREATE TABLE books (
  book_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(150) NOT NULL,
  isbn VARCHAR(20) UNIQUE,
  genre VARCHAR(50),
  total_copies INT DEFAULT 1,
  available_copies INT DEFAULT 1,
  added_date DATE DEFAULT (CURDATE())
);

-- Members table
CREATE TABLE members (
  member_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(15),
  address TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  joined_date DATE DEFAULT (CURDATE())
);

-- Transactions table
CREATE TABLE transactions (
  transaction_id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  book_id INT NOT NULL,
  issue_date DATE DEFAULT (CURDATE()),
  due_date DATE NOT NULL,
  return_date DATE NULL,
  status ENUM('issued', 'returned', 'overdue') DEFAULT 'issued',
  FOREIGN KEY (member_id) REFERENCES members(member_id),
  FOREIGN KEY (book_id) REFERENCES books(book_id)
);

-- Fines table
CREATE TABLE fines (
  fine_id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  member_id INT NOT NULL,
  days_overdue INT NOT NULL,
  fine_amount DECIMAL(10,2) NOT NULL,
  fine_per_day DECIMAL(5,2) DEFAULT 10.00,
  status ENUM('paid', 'unpaid') DEFAULT 'unpaid',
  collected_date DATE NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
  FOREIGN KEY (member_id) REFERENCES members(member_id)
);
