const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/*
  TEMP STORAGE (abhi memory me)
  NOTE: Render free plan restart pe reset ho jaata hai
*/
let employees = [];

/* ================= LOGIN ================= */
app.post("/login", (req, res) => {
  const { id, password } = req.body;

  // Admin login
  if (id === "admin" && password === "admin123") {
    return res.json({ role: "admin" });
  }

  // Employee login
  const emp = employees.find(
    e => e.empId === id && e.password === password
  );

  if (!emp) {
    return res.status(401).json({ error: "Invalid login" });
  }

  res.json({ role: "employee", emp });
});

/* ================= ADD EMPLOYEE (ADMIN) ================= */
app.post("/employee", (req, res) => {
  const { empId, name, password } = req.body;

  if (!empId || !name || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  employees.push({
    empId,
    name,
    password,
    leaveBal: 1,
    present: 0,
    lateToday: false,
    attendance: {},
    approvals: []
  });

  res.json({ success: true });
});

/* ================= GET ALL EMPLOYEES (ADMIN) ================= */
app.get("/employees", (req, res) => {
  res.json(employees);
});

/* ================= CHECK IN ================= */
app.post("/checkin", (req, res) => {
  const { empId } = req.body;
  const emp = employees.find(e => e.empId === empId);

  if (!emp) return res.status(404).json({ error: "Employee not found" });

  const now = new Date();
  emp.attendance.in = now;
  emp.lateToday = now.getHours() >= 11;

  res.json(emp);
});

/* ================= CHECK OUT ================= */
app.post("/checkout", (req, res) => {
  const { empId } = req.body;
  const emp = employees.find(e => e.empId === empId);

  if (!emp || !emp.attendance.in) {
    return res.status(400).json({ error: "Invalid checkout" });
  }

  const out = new Date();
  const hours =
    (out - new Date(emp.attendance.in)) / (1000 * 60 * 60);

  emp.attendance.out = out;

  if (hours >= 4) emp.present++;

  res.json({
    emp,
    hours: hours.toFixed(2)
  });
});

/* ================= APPLY LEAVE ================= */
app.post("/leave", (req, res) => {
  const { empId, date } = req.body;
  const emp = employees.find(e => e.empId === empId);

  if (!emp) return res.status(404).json({ error: "Employee not found" });

  if (emp.leaveBal > 0) {
    emp.leaveBal--;
    return res.json({ status: "approved" });
  } else {
    emp.approvals.push(date);
    return res.json({ status: "pending" });
  }
});

/* ================= BASIC TEST ================= */
app.get("/", (req, res) => {
  res.send("Attendance Backend Running");
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
