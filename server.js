const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

/* ================= MONGODB CONNECT ================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.error("MongoDB Error ❌", err));

/* ================= MODELS ================= */
const EmployeeSchema = new mongoose.Schema({
  empId: String,
  name: String,
  password: String,
  role: { type: String, default: "employee" }
});
const Employee = mongoose.model("Employee", EmployeeSchema);

const AttendanceSchema = new mongoose.Schema({
  empId: String,
  date: String,
  checkIn: String,
  checkOut: String,
  status: String
});
const Attendance = mongoose.model("Attendance", AttendanceSchema);

/* ================= ROUTES ================= */

// health check
app.get("/", (req, res) => {
  res.send("Attendance Backend Running ✅");
});

// admin / employee login
app.post("/login", async (req, res) => {
  const { empId, password } = req.body;

  // admin login
  if (empId === "admin" && password === "admin@0610") {
    return res.json({ role: "admin" });
  }

  const emp = await Employee.findOne({ empId, password });
  if (!emp) {
    return res.status(401).json({ error: "Invalid login" });
  }

  res.json({ role: "employee", emp });
});

// add employee (admin)
app.post("/employees", async (req, res) => {
  const emp = await Employee.create(req.body);
  res.json(emp);
});

// get employees
app.get("/employees", async (req, res) => {
  const emps = await Employee.find();
  res.json(emps);
});

// check-in
app.post("/checkin", async (req, res) => {
  const { empId } = req.body;
  const today = new Date().toISOString().split("T")[0];

  const att = await Attendance.create({
    empId,
    date: today,
    checkIn: new Date().toLocaleTimeString(),
    status: "IN"
  });

  res.json(att);
});

// check-out
app.post("/checkout", async (req, res) => {
  const { empId } = req.body;
  const today = new Date().toISOString().split("T")[0];

  const att = await Attendance.findOneAndUpdate(
    { empId, date: today },
    { checkOut: new Date().toLocaleTimeString(), status: "OUT" },
    { new: true }
  );

  res.json(att);
});

/* ================= START ================= */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
