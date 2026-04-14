console.log("🔥 THIS IS MY SERVER FILE RUNNING");
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Athu@8390',
  database: 'library_db'
});

db.connect(err => {
  if (err) {
    console.error('DB Connection Failed:', err);
    return;
  }
  console.log('Connected to MySQL Workbench');
});

// ================= TEST =================
app.get('/', (req, res) => {
  res.send('Server running 🚀');
});

// ================= BOOKS =================

// GET books
app.get('/api/books', (req, res) => {
  db.query('SELECT * FROM books', (err, results) => {
    if (err) return res.json([]);
    res.json(results);
  });
});

// ADD book
app.post('/api/books', (req, res) => {
  const { title, author, isbn, genre, total_copies } = req.body;

  db.query(
    `INSERT INTO books (title, author, isbn, genre, total_copies, available_copies)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, author, isbn || null, genre || null, total_copies || 1, total_copies || 1],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Book added' });
    }
  );
});

// DELETE book
app.delete('/api/books/:id', (req, res) => {
  db.query('DELETE FROM books WHERE book_id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Book deleted' });
  });
});

// ================= MEMBERS =================

// GET members
app.get('/api/members', (req, res) => {
  db.query('SELECT * FROM members', (err, results) => {
    if (err) return res.json([]);
    res.json(results);
  });
});

// ADD member
app.post('/api/members', (req, res) => {
  const { name, email, phone, address } = req.body;

  db.query(
    `INSERT INTO members (name, email, phone, address)
     VALUES (?, ?, ?, ?)`,
    [name, email, phone || null, address || null],
    (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: err });
      }
      res.json({ message: 'Member added' });
    }
  );
});

// ================= TRANSACTIONS =================

// GET transactions
app.get('/api/transactions', (req, res) => {
  db.query(`
    SELECT t.*, m.name AS member_name, b.title AS book_title
    FROM transactions t
    LEFT JOIN members m ON t.member_id = m.member_id
    LEFT JOIN books b ON t.book_id = b.book_id
  `, (err, results) => {
    if (err) return res.json([]);
    res.json(results);
  });
});

// ISSUE book
app.post('/api/issue', (req, res) => {
  const { member_id, book_id, due_date } = req.body;

  db.query(
    'INSERT INTO transactions (member_id, book_id, due_date) VALUES (?, ?, ?)',
    [member_id, book_id, due_date],
    (err) => {
      if (err) return res.status(500).json({ error: err });

      db.query(
        'UPDATE books SET available_copies = available_copies - 1 WHERE book_id = ?',
        [book_id]
      );

      res.json({ message: 'Book issued' });
    }
  );
});

app.post('/api/return/:id', (req, res) => {
  const id = req.params.id;

  db.query(
    'SELECT * FROM transactions WHERE transaction_id = ?',
    [id],
    (err, rows) => {
      if (err || !rows.length) {
        return res.status(404).json({ error: 'Not found' });
      }

      const t = rows[0];

      // ✅ FIXED DATE HANDLING
      const due = new Date(t.due_date);
      due.setHours(0,0,0,0);

      const today = new Date();
      today.setHours(0,0,0,0);

      const days = Math.max(
        0,
        Math.floor((today - due) / (1000 * 60 * 60 * 24))
      );

      const fine = days * 10;
      console.log("TODAY:", today);
        console.log("DUE:", due);
        console.log("DAYS:", days);
        console.log("FINE:", fine);

      // update transaction
      db.query(
        'UPDATE transactions SET return_date=?, status="returned" WHERE transaction_id=?',
        [today, id]
      );

      // update book stock
      db.query(
        'UPDATE books SET available_copies = available_copies + 1 WHERE book_id=?',
        [t.book_id]
      );

      // insert fine if needed
      if (fine > 0) {
        db.query(
          'INSERT INTO fines (transaction_id, member_id, days_overdue, fine_amount, status) VALUES (?,?,?,?, "unpaid")',
          [id, t.member_id, days, fine]
        );
      }

      res.json({ message: 'Returned', fine });
    }
  );
});


// GET fines (with book + member name)
const PDFDocument = require('pdfkit');

// ================= FINES =================

// GET fines
app.get('/api/fines', (req, res) => {
  db.query(`
    SELECT f.*, 
           m.name AS member_name, 
           b.title AS book_title
    FROM fines f
    LEFT JOIN transactions t ON f.transaction_id = t.transaction_id
    LEFT JOIN books b ON t.book_id = b.book_id
    LEFT JOIN members m ON f.member_id = m.member_id
  `, (err, results) => {
    if (err) {
      console.error(err);
      return res.json([]);
    }
    res.json(results);
  });
});

// PAY fine
app.post('/api/fines/:id/pay', (req, res) => {
  const id = req.params.id;

  db.query(
    'UPDATE fines SET status="paid", collected_date = NOW() WHERE fine_id = ?',
    [id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Fine collected successfully' });
    }
  );
});

// RECEIPT
app.get('/api/fines/:id/receipt', (req, res) => {
  const id = req.params.id;

  db.query(`
    SELECT f.*, 
           m.name AS member_name, 
           b.title AS book_title
    FROM fines f
    LEFT JOIN transactions t ON f.transaction_id = t.transaction_id
    LEFT JOIN books b ON t.book_id = b.book_id
    LEFT JOIN members m ON f.member_id = m.member_id
    WHERE f.fine_id = ?
  `, [id], (err, results) => {

    if (err || !results.length) {
      return res.status(404).send('Receipt not found');
    }

    const f = results[0];

    // ❗ Only allow paid receipts
    if (f.status !== 'paid') {
      return res.status(400).send('Fine not paid yet');
    }

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=receipt_${id}.pdf`
    );

    doc.pipe(res);

    // 🔥 DESIGN
    doc.fontSize(22).text('Library Receipt', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Receipt ID: ${f.fine_id}`);
    doc.text(`Transaction ID: ${f.transaction_id}`);
    doc.text(`Member: ${f.member_name}`);
    doc.text(`Book: ${f.book_title}`);
    doc.text(`Days Late: ${f.days_overdue}`);
    doc.text(`Fine Amount: ₹${f.fine_amount}`);
    doc.text(`Status: ${f.status}`);
    doc.text(`Collected On: ${f.collected_date || 'N/A'}`);
    doc.text(`Generated On: ${new Date().toLocaleString()}`);

    doc.end();
  });
});
// ================= START =================
app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
