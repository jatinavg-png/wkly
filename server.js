const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 MongoDB connection (FREE Atlas)
mongoose.connect(
  "mongodb+srv://attendance:attendance123@cluster0.mongodb.net/attendance",
  { useNewUrlParser: true, useUnifiedTopology: true }
);

const EmployeeSchema = new mongoose.Schema({
  empId: String,
  name: String,
  password: String,
  leaveBal: Number,
  present: Number,
  lateToday: Boolean
});

const Employee = mongoose.model("Employee", EmployeeSchema);

// 🔹 TEST
app.get("/", (req, res) => {
  res.send("Attendance Backend Running");
});

// 🔹 ADMIN: Add employee
app.post("/add-employee", async (req, res) => {
  const emp = new Employee({
    empId: req.body.empId,
    name: req.body.name,
    password: req.body.password,
    leaveBal: 1,
    present: 0,
    lateToday: false
  });
  await emp.save();
  res.json({ success: true });
});

// 🔹 LOGIN
app.post("/login", async (req, res) => {
  if (req.body.empId === "admin" && req.body.password === "admin123") {
    return res.json({ role: "admin" });
  }

  const emp = await Employee.findOne({
    empId: req.body.empId,
    password: req.body.password
  });

  if (!emp) return res.status(401).json({ error: "Invalid" });
  res.json({ role: "employee", emp });
});

// 🔹 GET ALL EMPLOYEES (admin)
app.get("/employees", async (req, res) => {
  const emps = await Employee.find();
  res.json(emps);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);
