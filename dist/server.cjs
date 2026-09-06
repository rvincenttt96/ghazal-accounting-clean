var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_promise = __toESM(require("mysql2/promise"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var MATTERMOST_WEBHOOK_URL = "https://co.ghazalify.com/hooks/pap6sou87fy7frk355uqwiobmc";
var sendMattermostNotification = async (text) => {
  try {
    await fetch(MATTERMOST_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ text })
    });
  } catch (err) {
    console.error("Mattermost Error:", err);
  }
};
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
  let pool = null;
  let useMySQL = false;
  if (process.env.DB_HOST) {
    try {
      pool = import_promise.default.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "ghazal_db",
        port: Number(process.env.DB_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 3e3,
        queueLimit: 0
      });
      const connection = await pool.getConnection();
      connection.release();
      useMySQL = true;
      console.log(`\u2705 MySQL connection pool connected successfully.`);
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
      console.warn("\u26A0\uFE0F MySQL database not reachable, running in resilient in-memory mode for live preview.", dbErr.message);
      useMySQL = false;
    }
  } else {
    console.log("\u2139\uFE0F DB_HOST not set, running in in-memory mode for live preview.");
  }
  let inMemoryDB = {
    users: [
      { id: "1", username: "admin", password: "admin123", role: "manager" },
      { id: "2", username: "reception", password: "reception123", role: "reception" }
    ],
    terms: [
      { id: "1", _id: "1", name: "\u062A\u0631\u0645 \u062A\u0627\u0628\u0633\u062A\u0627\u0646 \u06F1\u06F4\u06F0\u06F3", status: "active", createdAt: 1722e9 },
      { id: "2", _id: "2", name: "\u062A\u0631\u0645 \u067E\u0627\u06CC\u06CC\u0632 \u06F1\u06F4\u06F0\u06F3", status: "active", createdAt: 1729e9 }
    ],
    levels: [
      { id: "1", _id: "1", name: "Elementary (A1)", fee: 18e5 },
      { id: "2", _id: "2", name: "Pre-Intermediate (A2)", fee: 22e5 },
      { id: "3", _id: "3", name: "Intermediate (B1)", fee: 25e5 },
      { id: "4", _id: "4", name: "Upper-Intermediate (B2)", fee: 28e5 },
      { id: "5", _id: "5", name: "Advanced (C1)", fee: 32e5 },
      { id: "6", _id: "6", name: "\u0622\u0644\u0645\u0627\u0646\u06CC A1", fee: 29e5 }
    ],
    students: [
      {
        id: "1",
        _id: "1",
        firstName: "\u0639\u0644\u06CC",
        lastName: "\u0645\u062D\u0645\u062F\u06CC",
        level: "Intermediate (B1)",
        phone: "09121112233",
        classType: "\u062D\u0636\u0648\u0631\u06CC",
        totalPayable: 25e5,
        amountPaid: 25e5,
        debt: 0,
        status: "paid",
        termId: "1",
        receiptUrl: null
      },
      {
        id: "2",
        _id: "2",
        firstName: "\u0633\u0627\u0631\u0627",
        lastName: "\u0627\u062D\u0645\u062F\u06CC",
        level: "Pre-Intermediate (A2)",
        phone: "09129998877",
        classType: "\u0622\u0646\u0644\u0627\u06CC\u0646",
        totalPayable: 22e5,
        amountPaid: 1e6,
        debt: 12e5,
        status: "unpaid",
        termId: "1",
        receiptUrl: null
      }
    ],
    salaries: [
      {
        id: "1",
        _id: "1",
        teacherName: "\u0627\u0633\u062A\u0627\u062F \u062D\u0633\u06CC\u0646\u06CC",
        role: "\u0627\u0633\u062A\u0627\u062F",
        amount: 15e6,
        month: "\u0645\u0631\u062F\u0627\u062F",
        status: "paid",
        termId: "1",
        receiptUrl: null
      }
    ],
    expenses: [
      {
        id: "1",
        _id: "1",
        title: "\u0642\u0628\u0636 \u0628\u0631\u0642 \u0648 \u0627\u06CC\u0646\u062A\u0631\u0646\u062A",
        category: "\u0642\u0628\u0648\u0636",
        amount: 35e5,
        date: "1403/05/15",
        termId: "1",
        receiptUrl: null
      }
    ],
    receipts: [
      { id: "1", _id: "1", studentId: "1", termId: "1", paidAmount: 25e5, date: "1403/05/01" },
      { id: "2", _id: "2", studentId: "2", termId: "1", paidAmount: 1e6, date: "1403/05/10" }
    ]
  };
  const mapId = (rows) => rows.map((r) => ({ ...r, _id: String(r.id), id: String(r.id) }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: useMySQL ? "mysql" : "in-memory-preview", phpAvailable: true });
  });
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      if (useMySQL && pool) {
        const [users] = await pool.query(
          "SELECT id, username, role FROM users WHERE username = ? AND password = ?",
          [username, password]
        );
        if (users.length > 0) {
          return res.json({ success: true, user: users[0] });
        }
      } else {
        const user = inMemoryDB.users.find((u) => u.username === username && u.password === password);
        if (user) {
          return res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
        }
      }
      return res.status(401).json({ success: false, message: "\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u06CC\u0627 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0627\u0634\u062A\u0628\u0627\u0647 \u0627\u0633\u062A" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ success: false, message: "\u062E\u0637\u0627\u06CC \u0633\u0631\u0648\u0631" });
    }
  });
  app.get("/api/terms", async (req, res) => {
    try {
      if (useMySQL && pool) {
        const [rows] = await pool.query("SELECT * FROM terms ORDER BY createdAt DESC");
        return res.json(mapId(rows));
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
        const [result] = await pool.execute("INSERT INTO terms (name, status) VALUES (?, ?)", [name, status || "active"]);
        const insertId = String(result.insertId);
        return res.json({ _id: insertId, id: insertId, name, status: status || "active" });
      }
      const newId = String(Date.now());
      const newTerm = { id: newId, _id: newId, name, status: status || "active", createdAt: Date.now() };
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
      const term = inMemoryDB.terms.find((t) => t.id === req.params.id);
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
        const [studentCount] = await pool.query("SELECT COUNT(*) as count FROM students WHERE termId = ?", [req.params.id]);
        if (studentCount[0].count > 0) return res.status(400).json({ error: "Cannot delete term with enrolled students" });
        await pool.execute("DELETE FROM terms WHERE id = ?", [req.params.id]);
        return res.json({ success: true });
      }
      inMemoryDB.terms = inMemoryDB.terms.filter((t) => t.id !== req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.get("/api/students", async (req, res) => {
    try {
      if (useMySQL && pool) {
        const [rows] = await pool.query("SELECT * FROM students ORDER BY createdAt DESC");
        return res.json(mapId(rows));
      }
      res.json(mapId(inMemoryDB.students));
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.post("/api/students", async (req, res) => {
    try {
      const { firstName, lastName, level, phone, classType, totalPayable, amountPaid, debt, status, termId, receiptUrl } = req.body;
      const today = (/* @__PURE__ */ new Date()).toLocaleDateString("fa-IR");
      let finalStudentId = "";
      if (useMySQL && pool) {
        const [result] = await pool.execute(
          "INSERT INTO students (firstName, lastName, level, phone, classType, totalPayable, amountPaid, debt, status, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [firstName, lastName, level, phone, classType, totalPayable, amountPaid, debt, status, termId, receiptUrl || null]
        );
        finalStudentId = String(result.insertId);
        if (Number(amountPaid) > 0) {
          await pool.query(
            "INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)",
            [finalStudentId, termId || "1", Number(amountPaid), today]
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
            termId: termId || "1",
            paidAmount: Number(amountPaid),
            date: today
          });
        }
      }
      const statusIcon = debt <= 0 ? "\u2705 \u062A\u0633\u0648\u06CC\u0647" : "\u274C \u0628\u062F\u0647\u06A9\u0627\u0631";
      const msg = `\u{1F389} **\u062B\u0628\u062A\u200C\u0646\u0627\u0645 \u062C\u062F\u06CC\u062F \u062F\u0631 \u0622\u0645\u0648\u0632\u0634\u06AF\u0627\u0647** \u{1F389}

\u{1F464} **\u062F\u0627\u0646\u0634\u062C\u0648:** \`${firstName} ${lastName}\`
\u{1F4DA} **\u0633\u0637\u062D/\u062F\u0648\u0631\u0647:** \`${level}\`
\u{1F393} **\u0646\u0648\u0639 \u06A9\u0644\u0627\u0633:** \`${classType}\`
\u{1F4B5} **\u0634\u0647\u0631\u06CC\u0647 \u06A9\u0644:** \`${Number(totalPayable).toLocaleString()} \u062A\u0648\u0645\u0627\u0646\`
\u{1F4B3} **\u0645\u0628\u0644\u063A \u067E\u0631\u062F\u0627\u062E\u062A\u06CC:** \`${Number(amountPaid).toLocaleString()} \u062A\u0648\u0645\u0627\u0646\`
\u23F3 **\u0645\u0627\u0646\u062F\u0647 \u0628\u062F\u0647\u06CC:** \`${Number(debt).toLocaleString()} \u062A\u0648\u0645\u0627\u0646\`
\u{1F3F7} **\u0648\u0636\u0639\u06CC\u062A:** \`${statusIcon}\`

\u{1F468}\u200D\u{1F4BB} *\u062B\u0628\u062A \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 \u062D\u0633\u0627\u0628\u062F\u0627\u0631\u06CC \u063A\u0632\u0627\u0644*`;
      sendMattermostNotification(msg);
      res.json(useMySQL ? { _id: finalStudentId, id: finalStudentId, ...req.body } : inMemoryDB.students[0]);
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.post("/api/students/batch", async (req, res) => {
    try {
      const students = req.body;
      if (!Array.isArray(students)) return res.status(400).json({ error: "Expected an array" });
      const today = (/* @__PURE__ */ new Date()).toLocaleDateString("fa-IR");
      if (useMySQL && pool) {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          for (const s of students) {
            const [res1] = await connection.execute(
              "INSERT INTO students (firstName, lastName, level, phone, classType, totalPayable, amountPaid, debt, status, termId, receiptUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [s.firstName, s.lastName, s.level, s.phone, s.classType, s.totalPayable, s.amountPaid, s.debt, s.status, s.termId, s.receiptUrl || null]
            );
            const insId = String(res1.insertId);
            if (Number(s.amountPaid) > 0) {
              await connection.execute(
                "INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)",
                [insId, s.termId || "1", Number(s.amountPaid), today]
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
        const newId = String(Date.now() + Math.floor(Math.random() * 1e3));
        inMemoryDB.students.unshift({ id: newId, _id: newId, ...s });
        if (Number(s.amountPaid) > 0) {
          inMemoryDB.receipts.unshift({
            id: String(Date.now() + Math.floor(Math.random() * 1e3) + 1),
            _id: String(Date.now() + Math.floor(Math.random() * 1e3) + 1),
            studentId: newId,
            termId: s.termId || "1",
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
      const today = (/* @__PURE__ */ new Date()).toLocaleDateString("fa-IR");
      if (useMySQL && pool) {
        const [rows] = await pool.query("SELECT totalPayable, amountPaid, termId FROM students WHERE id = ?", [req.params.id]);
        if (rows.length > 0) {
          const totalPayable = rows[0].totalPayable || 0;
          const oldAmountPaid = rows[0].amountPaid || 0;
          const diff = totalPayable - oldAmountPaid;
          await pool.execute("UPDATE students SET status = ?, amountPaid = totalPayable, debt = 0 WHERE id = ?", [req.body.status, req.params.id]);
          if (diff > 0 && req.body.status === "paid") {
            await pool.query(
              "INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)",
              [req.params.id, rows[0].termId || "1", diff, today]
            );
          }
        }
        return res.json({ success: true });
      }
      const st = inMemoryDB.students.find((s) => s.id === req.params.id);
      if (st) {
        const oldAmountPaid = st.amountPaid || 0;
        const diff = st.totalPayable - oldAmountPaid;
        st.status = req.body.status;
        st.amountPaid = st.totalPayable;
        st.debt = 0;
        if (diff > 0 && req.body.status === "paid") {
          inMemoryDB.receipts.unshift({
            id: String(Date.now()),
            _id: String(Date.now()),
            studentId: req.params.id,
            termId: st.termId || "1",
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
      inMemoryDB.students = inMemoryDB.students.filter((s) => s.id !== req.params.id);
      inMemoryDB.receipts = inMemoryDB.receipts.filter((r) => r.studentId !== req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.patch("/api/students/:id", async (req, res) => {
    try {
      const { amountPaid, receiptUrl, totalPayable, hasBook, bookName, bookPrice, hasInterview } = req.body;
      const today = (/* @__PURE__ */ new Date()).toLocaleDateString("fa-IR");
      if (useMySQL && pool) {
        const [rows] = await pool.query("SELECT totalPayable, amountPaid, termId FROM students WHERE id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Student not found" });
        const newTotalPayable2 = totalPayable !== void 0 ? Number(totalPayable) : rows[0].totalPayable || 0;
        const oldAmountPaid2 = rows[0].amountPaid || 0;
        const termId = rows[0].termId || "1";
        const newAmountPaid2 = Number(amountPaid);
        const debt2 = Math.max(0, newTotalPayable2 - newAmountPaid2);
        const status2 = debt2 <= 0 ? "paid" : "unpaid";
        await pool.execute(
          "UPDATE students SET totalPayable = ?, amountPaid = ?, debt = ?, status = ?, receiptUrl = COALESCE(?, receiptUrl) WHERE id = ?",
          [newTotalPayable2, newAmountPaid2, debt2, status2, receiptUrl || null, req.params.id]
        );
        const diff2 = newAmountPaid2 - oldAmountPaid2;
        if (diff2 > 0) {
          await pool.query(
            "INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)",
            [req.params.id, termId, diff2, today]
          );
        }
        return res.json({ success: true, debt: debt2, status: status2 });
      }
      const st = inMemoryDB.students.find((s) => s.id === req.params.id);
      if (!st) return res.status(404).json({ error: "Student not found" });
      if (totalPayable !== void 0) st.totalPayable = Number(totalPayable);
      if (hasBook !== void 0) st.hasBook = hasBook;
      if (bookName !== void 0) st.bookName = bookName;
      if (bookPrice !== void 0) st.bookPrice = Number(bookPrice);
      if (hasInterview !== void 0) st.hasInterview = hasInterview;
      const newTotalPayable = st.totalPayable || 0;
      const oldAmountPaid = st.amountPaid || 0;
      const newAmountPaid = Number(amountPaid);
      const debt = Math.max(0, newTotalPayable - newAmountPaid);
      const status = debt <= 0 ? "paid" : "unpaid";
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
          termId: st.termId || "1",
          paidAmount: diff,
          date: today
        });
      }
      res.json({ success: true, debt, status });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.get("/api/receipts/:studentId", async (req, res) => {
    try {
      const today = (/* @__PURE__ */ new Date()).toLocaleDateString("fa-IR");
      if (useMySQL && pool) {
        const [rows] = await pool.query(
          "SELECT * FROM receipts WHERE studentId = ? ORDER BY createdAt DESC",
          [req.params.studentId]
        );
        if (rows.length > 0) {
          return res.json(mapId(rows));
        }
        const [stRows] = await pool.query("SELECT * FROM students WHERE id = ?", [req.params.studentId]);
        if (stRows.length > 0 && Number(stRows[0].amountPaid) > 0) {
          const student = stRows[0];
          const [result] = await pool.query(
            "INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)",
            [student.id, student.termId || "1", Number(student.amountPaid), today]
          );
          const newId = String(result.insertId);
          return res.json([{ id: newId, _id: newId, studentId: String(student.id), termId: String(student.termId || "1"), paidAmount: Number(student.amountPaid), date: today }]);
        }
        return res.json([]);
      }
      let recs = inMemoryDB.receipts.filter((r) => r.studentId === req.params.studentId);
      if (recs.length === 0) {
        const st = inMemoryDB.students.find((s) => s.id === req.params.studentId);
        if (st && Number(st.amountPaid) > 0) {
          const autoRec = {
            id: String(Date.now()),
            _id: String(Date.now()),
            studentId: st.id,
            termId: st.termId || "1",
            paidAmount: Number(st.amountPaid),
            date: today
          };
          inMemoryDB.receipts.unshift(autoRec);
          recs = [autoRec];
        }
      }
      res.json(mapId(recs));
    } catch (err) {
      res.status(500).json({ error: "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u062A\u0627\u0631\u06CC\u062E\u0686\u0647 \u0631\u0633\u06CC\u062F\u0647\u0627" });
    }
  });
  app.post("/api/receipts", async (req, res) => {
    try {
      const { studentId, termId, paidAmount, date } = req.body;
      const amount = Number(paidAmount);
      if (useMySQL && pool) {
        const [result] = await pool.query(
          "INSERT INTO receipts (studentId, termId, paidAmount, date) VALUES (?, ?, ?, ?)",
          [studentId, termId, amount, date]
        );
        const [stRows] = await pool.query("SELECT totalPayable, amountPaid FROM students WHERE id = ?", [studentId]);
        if (stRows.length > 0) {
          const totalPayable = Number(stRows[0].totalPayable) || 0;
          const currentPaid = Number(stRows[0].amountPaid) || 0;
          const newPaid = currentPaid + amount;
          const debt = Math.max(0, totalPayable - newPaid);
          const status = debt <= 0 ? "paid" : "unpaid";
          await pool.execute(
            "UPDATE students SET amountPaid = ?, debt = ?, status = ? WHERE id = ?",
            [newPaid, debt, status, studentId]
          );
        }
        return res.json({ success: true, id: String(result.insertId) });
      }
      const newId = String(Date.now());
      inMemoryDB.receipts.unshift({ id: newId, _id: newId, studentId, termId, paidAmount: amount, date });
      const st = inMemoryDB.students.find((s) => s.id === studentId);
      if (st) {
        st.amountPaid = (Number(st.amountPaid) || 0) + amount;
        st.debt = Math.max(0, (Number(st.totalPayable) || 0) - st.amountPaid);
        st.status = st.debt <= 0 ? "paid" : "unpaid";
      }
      res.json({ success: true, id: newId });
    } catch (err) {
      res.status(500).json({ error: "\u062E\u0637\u0627 \u062F\u0631 \u062B\u0628\u062A \u0631\u0633\u06CC\u062F" });
    }
  });
  app.get("/api/salaries", async (req, res) => {
    try {
      if (useMySQL && pool) {
        const [rows] = await pool.query("SELECT * FROM salaries ORDER BY createdAt DESC");
        return res.json(mapId(rows));
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
          [teacherName, amount, month, status || "unpaid", termId, receiptUrl || null]
        );
        const insertId = String(result.insertId);
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
      const sal = inMemoryDB.salaries.find((s) => s.id === req.params.id);
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
      inMemoryDB.salaries = inMemoryDB.salaries.filter((s) => s.id !== req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.get("/api/expenses", async (req, res) => {
    try {
      if (useMySQL && pool) {
        const [rows] = await pool.query("SELECT * FROM expenses ORDER BY createdAt DESC");
        return res.json(mapId(rows));
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
        const insertId = String(result.insertId);
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
      const exp = inMemoryDB.expenses.find((e) => e.id === req.params.id);
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
      inMemoryDB.expenses = inMemoryDB.expenses.filter((e) => e.id !== req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.get("/api/levels", async (req, res) => {
    try {
      if (useMySQL && pool) {
        const [rows] = await pool.query("SELECT * FROM levels");
        return res.json(mapId(rows));
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
        const insertId = String(result.insertId);
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
        const newId = String(Date.now() + Math.floor(Math.random() * 1e3));
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
      inMemoryDB.levels = inMemoryDB.levels.filter((l) => l.id !== req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  app.get("/api/php-code/:file", (req, res) => {
    const filename = req.params.file;
    const allowed = ["config.php", "schema.sql", "install.php", "api.php", "index.php", "README.md"];
    if (!allowed.includes(filename)) {
      return res.status(400).json({ error: "Invalid file name" });
    }
    const filePath = import_path.default.join(process.cwd(), "php", filename);
    if (import_fs.default.existsSync(filePath)) {
      const content = import_fs.default.readFileSync(filePath, "utf8");
      res.json({ filename, content });
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => res.sendFile(import_path.default.join(distPath, "index.html")));
  }
  app.use((err, req, res, next) => {
    console.error("Global Error:", err);
    res.status(500).json({ error: "Something went wrong on the server" });
  });
  let lastReportDate = "";
  setInterval(async () => {
    const now = /* @__PURE__ */ new Date();
    const tehranTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tehran" }));
    const currentDateStr = tehranTime.toLocaleDateString("fa-IR");
    if (tehranTime.getHours() === 20 && tehranTime.getMinutes() === 0 && lastReportDate !== currentDateStr) {
      lastReportDate = currentDateStr;
      try {
        let students = [];
        let expenses = [];
        let salaries = [];
        if (useMySQL && pool) {
          const [stRows] = await pool.query("SELECT * FROM students");
          const [exRows] = await pool.query("SELECT * FROM expenses");
          const [saRows] = await pool.query("SELECT * FROM salaries");
          students = stRows;
          expenses = exRows;
          salaries = saRows;
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
        const reportMsg = `\u{1F4CA} **\u06AF\u0632\u0627\u0631\u0634 \u062C\u0627\u0645\u0639 \u0645\u0627\u0644\u06CC \u0631\u0648\u0632\u0627\u0646\u0647 \u063A\u0632\u0627\u0644** \u{1F4CA}
\u{1F5D3} **\u062A\u0627\u0631\u06CC\u062E:** \`${currentDateStr}\` | \u23F0 **\u0633\u0627\u0639\u062A:** \`\u06F2\u06F0:\u06F0\u06F0\`

\u{1F7E2} **\u0622\u0645\u0627\u0631 \u062F\u0631\u0622\u0645\u062F \u0648 \u0645\u0637\u0627\u0644\u0628\u0627\u062A:**
\u25AB\uFE0F **\u062F\u0631\u0622\u0645\u062F \u06A9\u0644:** \`${totalPaid.toLocaleString()} \u062A\u0648\u0645\u0627\u0646\`
\u25AB\uFE0F **\u062C\u0645\u0639 \u0642\u0627\u0628\u0644 \u062F\u0631\u06CC\u0627\u0641\u062A:** \`${totalPayable.toLocaleString()} \u062A\u0648\u0645\u0627\u0646\`
\u25AB\uFE0F **\u062C\u0645\u0639 \u062F\u0631\u06CC\u0627\u0641\u062A\u06CC \u062A\u0627 \u0627\u06CC\u0646 \u0644\u062D\u0638\u0647:** \`${totalPaid.toLocaleString()} \u062A\u0648\u0645\u0627\u0646\`
\u25AB\uFE0F **\u062C\u0645\u0639 \u0645\u0628\u0627\u0644\u063A \u0628\u062F\u0647\u06CC:** \`${totalDebt.toLocaleString()} \u062A\u0648\u0645\u0627\u0646\`

\u{1F534} **\u0622\u0645\u0627\u0631 \u0645\u062E\u0627\u0631\u062C \u0648 \u062A\u0639\u0647\u062F\u0627\u062A:**
\u25AB\uFE0F **\u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u062C\u0627\u0631\u06CC:** \`${totalExpenses.toLocaleString()} \u062A\u0648\u0645\u0627\u0646\`
\u25AB\uFE0F **\u062D\u0642\u0648\u0642 \u067E\u0631\u062F\u0627\u062E\u062A\u0646\u06CC:** \`${totalSalaries.toLocaleString()} \u062A\u0648\u0645\u0627\u0646\`

\u2796\u2796\u2796\u2796\u2796\u2796\u2796\u2796\u2796\u2796
\u{1F4B0} **\u062A\u0631\u0627\u0632 \u0646\u0647\u0627\u06CC\u06CC \u0622\u0645\u0648\u0632\u0634\u06AF\u0627\u0647:**
\u2705 **\u0645\u0648\u062C\u0648\u062F\u06CC \u062F\u0631 \u062F\u0633\u062A\u0631\u0633:** \`${availableBalance.toLocaleString()} \u062A\u0648\u0645\u0627\u0646\`
*(\u0645\u062D\u0627\u0633\u0628\u0647 \u0634\u062F\u0647 \u0627\u0632: \u062C\u0645\u0639 \u062F\u0631\u06CC\u0627\u0641\u062A\u06CC \u06A9\u0633\u0631 \u0627\u0632 \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u062C\u0627\u0631\u06CC \u0648 \u062D\u0642\u0648\u0642 \u067E\u0631\u062F\u0627\u062E\u062A\u0646\u06CC)*`;
        await sendMattermostNotification(reportMsg);
        console.log("\u2705 Daily report sent to Mattermost successfully.");
      } catch (error) {
        console.error("\u274C Error generating daily report for Mattermost:", error);
      }
    }
  }, 6e4);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
