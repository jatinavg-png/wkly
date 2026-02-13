const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= DB CONNECT (FINAL FIX) ================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

/* ================= MODELS ================= */
const EmployeeSchema = new mongoose.Schema({
  empId: String,
  name: String,
  password: String,
  leaveBalance: { type: Number, default: 1 }
});
const Employee = mongoose.model("Employee", EmployeeSchema);

const AttendanceSchema = new mongoose.Schema({
  empId: String,
  date: String,
  checkIn: String,
  checkOut: String,
  otHours: Number
});
const Attendance = mongoose.model("Attendance", AttendanceSchema);

const LeaveSchema = new mongoose.Schema({
  empId: String,
  date: String,
  status: { type: String, default: "pending" }
});
const Leave = mongoose.model("Leave", LeaveSchema);

/* ================= LOGIN (ADMIN FINAL) ================= */
app.post("/login", async (req, res) => {
  const { empId, password } = req.body;

  // ✅ ADMIN LOGIN (FINAL)
  if (empId === "admin" && password === "admin@0610") {
    return res.json({ role: "admin" });
  }

  // employee login
  const user = await Employee.findOne({ empId, password });
  if (!user) {
    return res.status(401).json({ error: "Invalid login" });
  }

  res.json({
    role: "employee",
    empId: user.empId,
    name: user.name,
    leaveBalance: user.leaveBalance
  });
});

/* ================= ADD EMPLOYEE ================= */
app.post("/employees", async (req, res) => {
  const { empId, name, password } = req.body;

  const exists = await Employee.findOne({ empId });
  if (exists) return res.status(400).json({ error: "Employee exists" });

  await Employee.create({ empId, name, password });
  res.json({ success: true });
});

/* ================= DELETE EMPLOYEE ================= */
app.delete("/employees/:id", async (req, res) => {
  await Employee.deleteOne({ empId: req.params.id });
  await Attendance.deleteMany({ empId: req.params.id });
  await Leave.deleteMany({ empId: req.params.id });
  res.json({ success: true });
});

/* ================= CHECK IN ================= */
app.post("/checkin", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const existing = await Attendance.findOne({ empId: req.body.empId, date: today });
  if (existing) return res.json({ message: "Already checked in" });

  await Attendance.create({
    empId: req.body.empId,
    date: today,
    checkIn: new Date().toLocaleTimeString()
  });

  res.json({ success: true });
});

/* ================= CHECK OUT ================= */
app.post("/checkout", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const record = await Attendance.findOne({ empId: req.body.empId, date: today });

  if (!record || record.checkOut) return res.json({ message: "Invalid checkout" });

  record.checkOut = new Date().toLocaleTimeString();
  record.otHours = 0;
  await record.save();

  res.json({ success: true });
});

/* ================= APPLY LEAVE ================= */
app.post("/leave", async (req, res) => {
  await Leave.create({ empId: req.body.empId, date: req.body.date });
  res.json({ success: true });
});

/* ================= ADMIN STATS ================= */
app.get("/admin/stats", async (req, res) => {
  const totalEmployees = await Employee.countDocuments();
  const pendingLeaves = await Leave.countDocuments({ status: "pending" });

  res.json({
    totalEmployees,
    presentToday: 0,
    lateToday: 0,
    pendingLeaves
  });
});

/* ================= DELETE ATTENDANCE RANGE ================= */
app.post("/admin/delete-attendance", async (req, res) => {
  const { fromDate, toDate } = req.body;
  const result = await Attendance.deleteMany({
    date: { $gte: fromDate, $lte: toDate }
  });
  res.json({ deleted: result.deletedCount });
});

/* ================= CSV REPORT ================= */
app.get("/admin/report", async (req, res) => {
  const { from, to } = req.query;
  const data = await Attendance.find({
    date: { $gte: from, $lte: to }
  });

  let csv = "EmpID,Date,CheckIn,CheckOut,OT\n";
  data.forEach(r => {
    csv += `${r.empId},${r.date},${r.checkIn || ""},${r.checkOut || ""},${r.otHours || 0}\n`;
  });

  res.header("Content-Type", "text/csv");
  res.attachment("attendance.csv");
  res.send(csv);
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("WKLY Backend running on port", PORT);
});
