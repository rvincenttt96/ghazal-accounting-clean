import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Mattermost Setup ---
const MATTERMOST_WEBHOOK_URL = 'https://co.ghazalify.com/hooks/pap6sou87fy7frk355uqwiobmc';

const sendMattermostNotification = async (text: string) => {
  try {
    await fetch(MATTERMOST_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ text })
    });
  } catch (err) {
    console.error('Mattermost Error:', err);
  }
};
// ------------------------

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // MySQL Connection Pool with fallback
  let pool: mysql.Pool | null = null;
  let useMySQL = false;

  if (process.env.DB_HOST) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST, 
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "ghazal_db",
        port: Number(process.env.DB_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 3000,
        queueLimit: 0
      });

      // Test connection
      const connection = await pool.getConnection();
      connection.release();
      useMySQL = true;
      console.log(`✅ MySQL connection pool connected successfully.`);

      // Auto-create receipts table if MySQL is active
      const createReceiptsTable = `
        CREATE TABLE IF NOT EXISTS receipts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          studentId VARCHAR(255) NOT NULL,
          termId VARCHAR(255) NOT NULL,
          paidAmount INT NOT NULL,
          date VARCHAR(50) NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await pool.query(createReceiptsTable);
    } catch (dbErr) {
      console.warn("⚠️ MySQL database not reachable, running in resilient in-memory mode for live preview.", (dbErr as Error).message);
      useMySQL = false;
    }
  } else {
    console.log("ℹ️ DB_HOST not set, running in in-memory mode for live preview.");
  }

  // Initial Seed Data for fallback mode
  let inMemoryDB = {
    users: [
      { id: "1", username: "admin", password: "admin123", role: "manager" },
      { id: "2", username: "reception", password: "reception123", role: "reception" }
    ],
    terms: [
      { id: "1", _id: "1", name: "ترم تابستان ۱۴۰۳", status: "active", createdAt: 1722000000000 },
      { id: "2", _id: "2", name: "ترم پاییز ۱۴۰۳", status: "active", createdAt: 1729000000000 }
    ],
    levels: [
      { id: "1", _id: "1", name: "Elementary (A1)", fee: 1800000 },
      { id: "2", _id: "2", name: "Pre-Intermediate (A2)", fee: 2200000 },
      { id: "3", _id: "3", name: "Intermediate (B1)", fee: 2500000 },
      { id: "4", _id: "4", name: "Upper-Intermediate (B2)", fee: 2800000 },
      { id: "5", _id: "5", name: "Advanced (C1)", fee: 3200000 },
      { id: "6", _id: "6", name: "آلمانی A1", fee: 2900000 }
    ],
    students: [
      {
        id: "1", _id: "1",
        firstName: "علی", lastName: "محمدی", level: "Intermediate (B1)",
        phone: "09121112233", classType: "حضوری", totalPayable: 2500000,
        amountPaid: 2500000, debt: 0, status: "paid", termId: "1", receiptUrl: null
      },
      {
        id: "2", _id: "2",
        firstName: "سارا", lastName: "احمدی", level: "Pre-Intermediate (A2)",
        phone: "09129998877", classType: "آنلاین", totalPayable: 2200000,
        amountPaid: 1000000, debt: 1200000, status: "unpaid", termId: "1", receiptUrl: null
      }
    ],
    salaries: [
      {
        id: "1", _id: "1",
        teacherName: "استاد حسینی", role: "استاد", amount: 15000000,
        month: "مرداد", status: "paid", termId: "1", receiptUrl: null
      }
    ],
    expenses: [
      {
        id: "1", _id: "1",
        title: "قبض برق و اینترنت", category: "قبوض", amount: 3500000,
        date: "1403/05/15", termId: "1", receiptUrl: null
      }
    ],
    receipts: [
      { id: "1", _id: "1", studentId: "1", termId: "1", paidAmount: 2500000, date: "1403/05/01" },
      { id: "2", _id: "2", studentId: "2", termId: "1", paidAmount: 1000000, date: "1403/05/10" }
    ]
  };

  // Helper to map DB rows or in-memory arrays
  const mapId = (rows: any[]) => rows.map(r => ({ ...r, _id: String(r.id), id: String(r.id) }));

  // API Endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: useMySQL ? "mysql" : "in-memory-preview", phpAvailable: true });
  });

  // Login route
  app.post('/api/login', async (req: any, res: any) => {
    const { username, password } = req.body;
    try {
      if (useMySQL && pool) {
        const [users]: any = await pool.query(
          'SELECT id, username, role FROM users WHERE username = ? AND password = ?',
          [username, password]
        );
        if (users.length > 0) {
          return res.json({ success: true, user: users[0] });
        }
      } else {
        const user = inMemoryDB.users.find(u => u.username === username && u.password === password);
        if (user) {
          return res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
        }
      }
      return res.status(401).json({ success: false, message: 'نام کاربری یا رمز عبور اشتباه است' });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'خطای سرور' });
    }
  });

  // Terms endpoints
  app.get("/api/terms", async (req, res) => {
    try {
      if (useMySQL && pool) {
        const [rows] = await pool.query("SELECT * FROM terms ORDER BY createdAt DESC");
        return res.json(mapId(rows as any[]));
      }
      res.json(mapId(inMemoryDB.terms));
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/terms", async (req, res) => {
    try {
      const { name, status } = req.body;
      if (useMySQL && pool) {
        const [result] = await pool.execute("INSERT INTO terms (name, status) VALUES (?, ?)", [name, status || 'active']);
        const insertId = String((result as any).insertId);
        return res.json({ _id: insertId, id: insertId, name, status: status || 'active' });
      }
      const newId = String(Date.now());
      const newTerm = { id: newId, _id: newId, name, status: status || 'active', createdAt: Date.now() };
      inMemoryDB.terms.unshift(newTerm);
      res.json(newTerm);
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.patch("/api/terms/:id", async (req, res) => {
    try {
      const { name, status } = req.body;
      if (useMySQL && pool) {
        await pool.execute("UPDATE terms SET name = COALESCE(?, name), status = COALESCE(?, status) WHERE id = ?", [name, status, req.params.id]);
        return res.json({ success: true });
      }
      const term = inMemoryDB.terms.find(t => t.id === req.params.id);
      if (term) {
        if (name) term.name = name;
        if (status) term.status = status;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/terms/:id", async (req, res) => {
    try {
      if (useMySQL && pool) {
        const [studentCount]: any = await pool.query("SELECT COUNT(*) as count FROM students WHERE termId = ?", [req.params.id]);
        if (studentCount[0].count > 0) return res.status(400).json({ error: "Cannot delete term with enrolled students" });
        await pool.execute("DELETE FROM terms WHERE id = ?", [req.params.id]);
        return res.json({ success: true });
      }
      inMemoryDB.terms = inMemoryDB.terms.filter(t => t.id !== req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Students endpoints
  app.get("/api/students", async (req, res) => {
    try {
      if (useMySQL && pool) {
        const [rows] = await pool.query("SELECT * FROM students ORDER BY createdAt DESC");
        return res.json(mapId(rows as any[]));
      }
      res.json(mapId(inMemoryDB.students));
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const { firstName, lastName, level, phone, classType, totalPayable, amountPaid, debt, status, termId, receiptUrl } = req.body;
      const today = new Date().toLocaleDateString('fa-IR');
      
      let finalStudentId = '';

      if (useMySQL && pool) {
        const [result] = await pool.execute(
          "INSERT INTO students (firstName, lastName, level, phone, classType, totalPayable, amountPaid, debt, status, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [firstName, lastName, level, phone, classType, totalPayable, amountPaid, debt, status, termId, receiptUrl || null]
        );
        finalStudentId = String((result as any).insertId);
        
        if (Number(amountPaid) > 0) {
          await pool.query(
            'INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)',
            [finalStudentId, termId || '1', Number(amountPaid), today]
          );
        }
      } else {
        finalStudentId = String(Date.now());
        const newStudent = { id: finalStudentId, _id: finalStudentId, ...req.body };
        inMemoryDB.students.unshift(newStudent);
        if (Number(amountPaid) > 0) {
          inMemoryDB.receipts.unshift({
            id: String(Date.now() + 1),
            _id: String(Date.now() + 1),
            studentId: finalStudentId,
            termId: termId || '1',
            paidAmount: Number(amountPaid),
            date: today
          });
        }
      }

      // --- ارسال پیام لحظه‌ای به مترموست ---
      const statusIcon = debt <= 0 ? '✅ تسویه' : '❌ بدهکار';
      const msg = `🎉 **ثبت‌نام جدید در آموزشگاه** 🎉\n\n👤 **دانشجو:** \`${firstName} ${lastName}\`\n📚 **سطح/دوره:** \`${level}\`\n🎓 **نوع کلاس:** \`${classType}\`\n💵 **شهریه کل:** \`${Number(totalPayable).toLocaleString()} تومان\`\n💳 **مبلغ پرداختی:** \`${Number(amountPaid).toLocaleString()} تومان\`\n⏳ **مانده بدهی:** \`${Number(debt).toLocaleString()} تومان\`\n🏷 **وضعیت:** \`${statusIcon}\`\n\n👨‍💻 *ثبت در سیستم حسابداری غزال*`;
      sendMattermostNotification(msg);
      // ----------------------------------------

      res.json(useMySQL ? { _id: finalStudentId, id: finalStudentId, ...req.body } : inMemoryDB.students[0]);

    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/students/batch", async (req, res) => {
    try {
      const students = req.body;
      if (!Array.isArray(students)) return res.status(400).json({ error: "Expected an array" });
      const today = new Date().toLocaleDateString('fa-IR');

      if (useMySQL && pool) {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          for (const s of students) {
            const [res1] = await connection.execute(
              "INSERT INTO students (firstName, lastName, level, phone, classType, totalPayable, amountPaid, debt, status, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [s.firstName, s.lastName, s.level, s.phone, s.classType, s.totalPayable, s.amountPaid, s.debt, s.status, s.termId, s.receiptUrl || null]
            );
            const insId = String((res1 as any).insertId);
            if (Number(s.amountPaid) > 0) {
              await connection.execute(
                'INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)',
                [insId, s.termId || '1', Number(s.amountPaid), today]
              );
            }
          }
          await connection.commit();
        } catch (err) {
          await connection.rollback();
          throw err;
        } finally {
          connection.release();
        }
        return res.json({ success: true, count: students.length });
      }

      for (const s of students) {
        const newId = String(Date.now() + Math.floor(Math.random() * 1000));
        inMemoryDB.students.unshift({ id: newId, _id: newId, ...s });
        if (Number(s.amountPaid) > 0) {
          inMemoryDB.receipts.unshift({
            id: String(Date.now() + Math.floor(Math.random() * 1000) + 1),
            _id: String(Date.now() + Math.floor(Math.random() * 1000) + 1),
            studentId: newId,
            termId: s.termId || '1',
            paidAmount: Number(s.amountPaid),
            date: today
          });
        }
      }
      res.json({ success: true, count: students.length });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.patch("/api/students/:id/status", async (req, res) => {
    try {
      const today = new Date().toLocaleDateString('fa-IR');
      if (useMySQL && pool) {
        const [rows]: any = await pool.query("SELECT totalPayable, amountPaid, termId FROM students WHERE id = ?", [req.params.id]);
        if (rows.length > 0) {
          const totalPayable = rows[0].totalPayable || 0;
          const oldAmountPaid = rows[0].amountPaid || 0;
          const diff = totalPayable - oldAmountPaid;
          await pool.execute("UPDATE students SET status = ?, amountPaid = totalPayable, debt = 0 WHERE id = ?", [req.body.status, req.params.id]);
          if (diff > 0 && req.body.status === 'paid') {
            await pool.query(
              'INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)',
              [req.params.id, rows[0].termId || '1', diff, today]
            );
          }
        }
        return res.json({ success: true });
      }
      const st = inMemoryDB.students.find(s => s.id === req.params.id);
      if (st) {
        const oldAmountPaid = st.amountPaid || 0;
        const diff = st.totalPayable - oldAmountPaid;
        st.status = req.body.status;
        st.amountPaid = st.totalPayable;
        st.debt = 0;
        if (diff > 0 && req.body.status === 'paid') {
          inMemoryDB.receipts.unshift({
            id: String(Date.now()),
            _id: String(Date.now()),
            studentId: req.params.id,
            termId: st.termId || '1',
            paidAmount: diff,
            date: today
          });
        }
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      if (useMySQL && pool) {
        await pool.execute("DELETE FROM students WHERE id = ?", [req.params.id]);
        await pool.execute("DELETE FROM receipts WHERE studentId = ?", [req.params.id]);
        return res.json({ success: true });
      }
      inMemoryDB.students = inMemoryDB.students.filter(s => s.id !== req.params.id);
      inMemoryDB.receipts = inMemoryDB.receipts.filter(r => r.studentId !== req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.patch("/api/students/:id", async (req, res) => {
    try {
      const { amountPaid, receiptUrl, totalPayable, hasBook, bookName, bookPrice, hasInterview } = req.body;
      const today = new Date().toLocaleDateString('fa-IR');

      if (useMySQL && pool) {
        const [rows]: any = await pool.query("SELECT totalPayable, amountPaid, termId FROM students WHERE id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Student not found" });

        const newTotalPayable = totalPayable !== undefined ? Number(totalPayable) : (rows[0].totalPayable || 0);
        const oldAmountPaid = rows[0].amountPaid || 0;
        const termId = rows[0].termId || '1';
        const newAmountPaid = Number(amountPaid);
        const debt = Math.max(0, newTotalPayable - newAmountPaid);
        const status = debt <= 0 ? 'paid' : 'unpaid';

        await pool.execute(
          "UPDATE students SET totalPayable = ?, amountPaid = ?, debt = ?, status = ?, receiptUrl = COALESCE(?, receiptUrl) WHERE id = ?",
          [newTotalPayable, newAmountPaid, debt, status, receiptUrl || null, req.params.id]
        );

        const diff = newAmountPaid - oldAmountPaid;
        if (diff > 0) {
          await pool.query(
            'INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)',
            [req.params.id, termId, diff, today]
          );
        }
        
        return res.json({ success: true, debt, status });
      }

      const st = inMemoryDB.students.find(s => s.id === req.params.id) as any;
      if (!st) return res.status(404).json({ error: "Student not found" });

      if (totalPayable !== undefined) st.totalPayable = Number(totalPayable);
      if (hasBook !== undefined) st.hasBook = hasBook;
      if (bookName !== undefined) st.bookName = bookName;
      if (bookPrice !== undefined) st.bookPrice = Number(bookPrice);
      if (hasInterview !== undefined) st.hasInterview = hasInterview;

      const newTotalPayable = st.totalPayable || 0;
      const oldAmountPaid = st.amountPaid || 0;
      const newAmountPaid = Number(amountPaid);
      const debt = Math.max(0, newTotalPayable - newAmountPaid);
      const status = debt <= 0 ? 'paid' : 'unpaid';

      const diff = newAmountPaid - oldAmountPaid;
      st.amountPaid = newAmountPaid;
      st.debt = debt;
      st.status = status;
      if (receiptUrl) st.receiptUrl = receiptUrl;

      if (diff > 0) {
        inMemoryDB.receipts.unshift({
          id: String(Date.now()),
          _id: String(Date.now()),
          studentId: req.params.id,
          termId: st.termId || '1',
          paidAmount: diff,
          date: today
        });
      }

      res.json({ success: true, debt, status });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Receipts
  app.get('/api/receipts/:studentId', async (req, res) => {
    try {
      const today = new Date().toLocaleDateString('fa-IR');
      if (useMySQL && pool) {
        const [rows]: any = await pool.query(
          'SELECT * FROM receipts WHERE studentId = ? ORDER BY createdAt DESC', 
          [req.params.studentId]
        );
        if (rows.length > 0) {
          return res.json(mapId(rows as any[]));
        }
        const [stRows]: any = await pool.query("SELECT * FROM students WHERE id = ?", [req.params.studentId]);
        if (stRows.length > 0 && Number(stRows[0].amountPaid) > 0) {
          const student = stRows[0];
          const [result] = await pool.query(
            'INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)',
            [student.id, student.termId || '1', Number(student.amountPaid), today]
          );
          const newId = String((result as any).insertId);
          return res.json([{ id: newId, _id: newId, studentId: String(student.id), termId: String(student.termId || '1'), paidAmount: Number(student.amountPaid), date: today }]);
        }
        return res.json([]);
      }

      let recs = inMemoryDB.receipts.filter(r => r.studentId === req.params.studentId);
      if (recs.length === 0) {
        const st = inMemoryDB.students.find(s => s.id === req.params.studentId);
        if (st && Number(st.amountPaid) > 0) {
          const autoRec = {
            id: String(Date.now()),
            _id: String(Date.now()),
            studentId: st.id,
            termId: st.termId || '1',
            paidAmount: Number(st.amountPaid),
            date: today
          };
          inMemoryDB.receipts.unshift(autoRec);
          recs = [autoRec];
        }
      }
      res.json(mapId(recs));
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت تاریخچه رسیدها' });
    }
  });

  app.post('/api/receipts', async (req, res) => {
    try {
      const { studentId, termId, paidAmount, date } = req.body;
      const amount = Number(paidAmount);

      if (useMySQL && pool) {
        const [result] = await pool.query(
          'INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)',
          [studentId, termId, amount, date]
        );
        const [stRows]: any = await pool.query("SELECT totalPayable, amountPaid FROM students WHERE id = ?", [studentId]);
        if (stRows.length > 0) {
          const totalPayable = Number(stRows[0].totalPayable) || 0;
          const currentPaid = Number(stRows[0].amountPaid) || 0;
          const newPaid = currentPaid + amount;
          const debt = Math.max(0, totalPayable - newPaid);
          const status = debt <= 0 ? 'paid' : 'unpaid';
          await pool.execute(
            "UPDATE students SET amountPaid = ?, debt = ?, status = ? WHERE id = ?",
            [newPaid, debt, status, studentId]
          );
        }
        return res.json({ success: true, id: String((result as any).insertId) });
      }

      const newId = String(Date.now());
      inMemoryDB.receipts.unshift({ id: newId, _id: newId, studentId, termId, paidAmount: amount, date });

      const st = inMemoryDB.students.find(s => s.id === studentId);
      if (st) {
        st.amountPaid = (Number(st.amountPaid) || 0) + amount;
        st.debt = Math.max(0, (Number(st.totalPayable) || 0) - st.amountPaid);
        st.status = st.debt <= 0 ? 'paid' : 'unpaid';
      }

      res.json({ success: true, id: newId });
    } catch (err) {
      res.status(500).json({ error: 'خطا در ثبت رسید' });
    }
  });

  // Salaries
  app.get("/api/salaries", async (req, res) => {
    try {
      if (useMySQL && pool) {
        const [rows] = await pool.query("SELECT * FROM salaries ORDER BY createdAt DESC");
        return res.json(mapId(rows as any[]));
      }
      res.json(mapId(inMemoryDB.salaries));
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/salaries", async (req, res) => {
    try {
      const { teacherName, amount, month, status, termId, receiptUrl } = req.body;
      if (useMySQL && pool) {
        const [result] = await pool.execute(
          "INSERT INTO salaries (teacherName, amount, month, status, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?)",
          [teacherName, amount, month, status || 'unpaid', termId, receiptUrl || null]
        );
        const insertId = String((result as any).insertId);
        return res.json({ _id: insertId, id: insertId, ...req.body });
      }
      const newId = String(Date.now());
      const newSalary = { id: newId, _id: newId, ...req.body };
      inMemoryDB.salaries.unshift(newSalary);
      res.json(newSalary);
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.patch("/api/salaries/:id", async (req, res) => {
    try {
      const { teacherName, amount, month, status, termId, receiptUrl } = req.body;
      if (useMySQL && pool) {
        await pool.execute(`
          UPDATE salaries 
          SET teacherName = COALESCE(?, teacherName),
              amount = COALESCE(?, amount),
              month = COALESCE(?, month),
              status = COALESCE(?, status),
              termId = COALESCE(?, termId),
              receiptUrl = COALESCE(?, receiptUrl)
          WHERE id = ?
        `, [teacherName, amount, month, status, termId, receiptUrl, req.params.id]);
        return res.json({ success: true });
      }
      const sal = inMemoryDB.salaries.find(s => s.id === req.params.id);
      if (sal) {
        if (teacherName) sal.teacherName = teacherName;
        if (amount) sal.amount = amount;
        if (month) sal.month = month;
        if (status) sal.status = status;
        if (termId) sal.termId = termId;
        if (receiptUrl) sal.receiptUrl = receiptUrl;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/salaries/:id", async (req, res) => {
    try {
      if (useMySQL && pool) {
        await pool.execute("DELETE FROM salaries WHERE id = ?", [req.params.id]);
        return res.json({ success: true });
      }
      inMemoryDB.salaries = inMemoryDB.salaries.filter(s => s.id !== req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Expenses
  app.get("/api/expenses", async (req, res) => {
    try {
      if (useMySQL && pool) {
        const [rows] = await pool.query("SELECT * FROM expenses ORDER BY createdAt DESC");
        return res.json(mapId(rows as any[]));
      }
      res.json(mapId(inMemoryDB.expenses));
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const { title, amount, category, date, termId, receiptUrl } = req.body;
      if (useMySQL && pool) {
        const [result] = await pool.execute(
          "INSERT INTO expenses (title, amount, category, date, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?)",
          [title, amount, category, date, termId, receiptUrl || null]
        );
        const insertId = String((result as any).insertId);
        return res.json({ _id: insertId, id: insertId, ...req.body });
      }
      const newId = String(Date.now());
      const newExp = { id: newId, _id: newId, ...req.body };
      inMemoryDB.expenses.unshift(newExp);
      res.json(newExp);
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const { title, amount, category, date, termId, receiptUrl } = req.body;
      if (useMySQL && pool) {
        await pool.execute(`
          UPDATE expenses 
          SET title = COALESCE(?, title),
              amount = COALESCE(?, amount),
              category = COALESCE(?, category),
              date = COALESCE(?, date),
              termId = COALESCE(?, termId),
              receiptUrl = COALESCE(?, receiptUrl)
          WHERE id = ?
        `, [title, amount, category, date, termId, receiptUrl, req.params.id]);
        return res.json({ success: true });
      }
      const exp = inMemoryDB.expenses.find(e => e.id === req.params.id);
      if (exp) {
        if (title) exp.title = title;
        if (amount) exp.amount = amount;
        if (category) exp.category = category;
        if (date) exp.date = date;
        if (termId) exp.termId = termId;
        if (receiptUrl) exp.receiptUrl = receiptUrl;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      if (useMySQL && pool) {
        await pool.execute("DELETE FROM expenses WHERE id = ?", [req.params.id]);
        return res.json({ success: true });
      }
      inMemoryDB.expenses = inMemoryDB.expenses.filter(e => e.id !== req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Levels
  app.get("/api/levels", async (req, res) => {
    try {
      if (useMySQL && pool) {
        const [rows] = await pool.query("SELECT * FROM levels");
        return res.json(mapId(rows as any[]));
      }
      res.json(mapId(inMemoryDB.levels));
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/levels", async (req, res) => {
    try {
      const { name, fee } = req.body;
      if (useMySQL && pool) {
        const [result] = await pool.execute("INSERT INTO levels (name, fee) VALUES (?, ?)", [name, fee]);
        const insertId = String((result as any).insertId);
        return res.json({ _id: insertId, id: insertId, ...req.body });
      }
      const newId = String(Date.now());
      const newLvl = { id: newId, _id: newId, name, fee };
      inMemoryDB.levels.push(newLvl);
      res.json(newLvl);
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/levels/batch", async (req, res) => {
    try {
      const levelsList = req.body;
      if (!Array.isArray(levelsList)) return res.status(400).json({ error: "Expected an array" });

      if (useMySQL && pool) {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          for (const lvl of levelsList) {
            await connection.execute(
              "INSERT INTO levels (name, fee) VALUES (?, ?)",
              [lvl.name, Number(lvl.fee) || 0]
            );
          }
          await connection.commit();
        } catch (err) {
          await connection.rollback();
          throw err;
        } finally {
          connection.release();
        }
        return res.json({ success: true, count: levelsList.length });
      }

      for (const lvl of levelsList) {
        const newId = String(Date.now() + Math.floor(Math.random() * 1000));
        inMemoryDB.levels.push({ id: newId, _id: newId, name: lvl.name, fee: Number(lvl.fee) || 0 });
      }
      res.json({ success: true, count: levelsList.length });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/levels/:id", async (req, res) => {
    try {
      if (useMySQL && pool) {
        await pool.execute("DELETE FROM levels WHERE id = ?", [req.params.id]);
        return res.json({ success: true });
      }
      inMemoryDB.levels = inMemoryDB.levels.filter(l => l.id !== req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // PHP Code retrieval endpoint
  app.get("/api/php-code/:file", (req, res) => {
    const filename = req.params.file;
    const allowed = ['config.php', 'schema.sql', 'install.php', 'api.php', 'index.php', 'README.md'];
    if (!allowed.includes(filename)) {
      return res.status(400).json({ error: "Invalid file name" });
    }
    const filePath = path.join(process.cwd(), 'php', filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.json({ filename, content });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });

  // 404 for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Error:", err);
    res.status(500).json({ error: "Something went wrong on the server" });
  });

  // --- سیستم گزارش‌گیر خودکار (راس ساعت ۲۰:۰۰) ---
  let lastReportDate = '';

  setInterval(async () => {
    const now = new Date();
    // محاسبه دقیق زمان تهران
    const tehranTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
    const currentDateStr = tehranTime.toLocaleDateString('fa-IR');

    // چک کردن زمان: آیا دقیقا ساعت 20:00 است و گزارش امروز ارسال نشده؟
    if (tehranTime.getHours() === 20 && tehranTime.getMinutes() === 0 && lastReportDate !== currentDateStr) {
      lastReportDate = currentDateStr; 
      
      try {
        let students: any[] = [];
        let expenses: any[] = [];
        let salaries: any[] = [];

        if (useMySQL && pool) {
          const [stRows] = await pool.query("SELECT * FROM students");
          const [exRows] = await pool.query("SELECT * FROM expenses");
          const [saRows] = await pool.query("SELECT * FROM salaries");
          students = stRows as any[];
          expenses = exRows as any[];
          salaries = saRows as any[];
        } else {
          students = inMemoryDB.students;
          expenses = inMemoryDB.expenses;
          salaries = inMemoryDB.salaries;
        }

        const totalPayable = students.reduce((sum, s) => sum + (Number(s.totalPayable) || 0), 0);
        const totalPaid = students.reduce((sum, s) => sum + (Number(s.amountPaid) || 0), 0);
        const totalDebt = students.reduce((sum, s) => sum + (Number(s.debt) || 0), 0);

        const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const totalSalaries = salaries.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        const availableBalance = totalPaid - (totalExpenses + totalSalaries);

        const reportMsg = `📊 **گزارش جامع مالی روزانه غزال** 📊\n🗓 **تاریخ:** \`${currentDateStr}\` | ⏰ **ساعت:** \`۲۰:۰۰\`\n\n🟢 **آمار درآمد و مطالبات:**\n▫️ **درآمد کل:** \`${totalPaid.toLocaleString()} تومان\`\n▫️ **جمع قابل دریافت:** \`${totalPayable.toLocaleString()} تومان\`\n▫️ **جمع دریافتی تا این لحظه:** \`${totalPaid.toLocaleString()} تومان\`\n▫️ **جمع مبالغ بدهی:** \`${totalDebt.toLocaleString()} تومان\`\n\n🔴 **آمار مخارج و تعهدات:**\n▫️ **هزینه‌های جاری:** \`${totalExpenses.toLocaleString()} تومان\`\n▫️ **حقوق پرداختنی:** \`${totalSalaries.toLocaleString()} تومان\`\n\n➖➖➖➖➖➖➖➖➖➖\n💰 **تراز نهایی آموزشگاه:**\n✅ **موجودی در دسترس:** \`${availableBalance.toLocaleString()} تومان\`\n*(محاسبه شده از: جمع دریافتی کسر از هزینه‌های جاری و حقوق پرداختنی)*`;

        await sendMattermostNotification(reportMsg);
        console.log('✅ Daily report sent to Mattermost successfully.');
      } catch (error) {
        console.error("❌ Error generating daily report for Mattermost:", error);
      }
    }
  }, 60000); 
  // ------------------------------------------------

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();