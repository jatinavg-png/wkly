const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// In-memory data (PC + Mobile both use same server)
let employees = [];

// Health check
app.get("/", (req, res) => {
  res.send("Attendance Backend Running ✅");
});

// Admin login
app.post("/login", (req, res) => {
  const { empId, password } = req.body;

  // ✅ FINAL ADMIN CREDENTIALS
  if (empId === "admin" && password === "admin@0610") {
    return res.json({ role: "admin" });
  }

  const emp = employees.find(
    e => e.empId === empId && e.password === password
  );

  if (!emp) {
    return res.status(401).json({ error: "Invalid login" });
  }

  res.json({ role: "employee", emp });
});

// Get all employees (Admin)
app.get("/employees", (req, res) => {
  res.json(employees);
});

// Add employee (Admin)
app.post("/employees", (req, res) => {
  const emp = req.body;

  if (!emp.empId || !emp.name || !emp.password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  employees.push(emp);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
