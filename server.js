const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// 🔥 MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ Mongo Error:", err));

// ===== Schemas =====
const employeeSchema = new mongoose.Schema({
  empId: String,
  name: String,
  password: String,
});

const Employee = mongoose.model("Employee", employeeSchema);

// ===== Routes =====

// Health check
app.get("/", (req, res) => {
  res.send("Attendance Backend Running ✅");
});

// Get employees
app.get("/employees", async (req, res) => {
  const employees = await Employee.find();
  res.json(employees);
});

// Add employee
app.post("/employees", async (req, res) => {
  const { empId, name, password } = req.body;

  if (!empId || !name || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const exists = await Employee.findOne({ empId });
  if (exists) {
    return res.status(409).json({ error: "Employee already exists" });
  }

  const emp = new Employee({ empId, name, password });
  await emp.save();

  res.json({ success: true });
});

// Login
app.post("/login", async (req, res) => {
  const { empId, password } = req.body;

  // 🔐 Admin login
  if (empId === "admin" && password === "admin@0610") {
    return res.json({ role: "admin" });
  }

  const emp = await Employee.findOne({ empId, password });

  if (!emp) {
    return res.status(401).json({ error: "Invalid login" });
  }

  res.json({ role: "employee", emp });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
