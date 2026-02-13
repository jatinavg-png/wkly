const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

/* ================= DB CONNECT ================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));

/* ================= SCHEMAS ================= */

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
  hours: Number,
  otHours: Number,
  otStatus: { type: String, default: "pending" } // pending/approved/rejected
});
const Attendance = mongoose.model("Attendance", AttendanceSchema);

const LeaveSchema = new mongoose.Schema({
  empId: String,
  date: String,
  status: { type: String, default: "pending" } // pending/approved/rejected
});
const Leave = mongoose.model("Leave", LeaveSchema);

/* ================= LOGIN ================= */
app.post("/login", async (req, res) => {
  const { empId, password } = req.body;

  if (empId === "admin" && password === "admin@0610") {
    return res.json({ role: "admin" });
  }

  const emp = await Employee.findOne({ empId, password });
  if (!emp) return res.status(401).json({ error: "Invalid login" });

  res.json({ role: "employee", emp });
});

/* ================= EMPLOYEE ================= */

// add
app.post("/employees", async (req, res) => {
  const emp = await Employee.create(req.body);
  res.json(emp);
});

// list
app.get("/employees", async (req, res) => {
  const emps = await Employee.find();
  res.json(emps);
});

// delete
app.delete("/employees/:id", async (req, res) => {
  await Employee.deleteOne({ empId: req.params.id });
  await Attendance.deleteMany({ empId: req.params.id });
  await Leave.deleteMany({ empId: req.params.id });
  res.json({ success: true });
});

/* ================= ATTENDANCE ================= */

app.post("/checkin", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const exists = await Attendance.findOne({ empId: req.body.empId, date: today });
  if (exists) return res.json(exists);

  const att = await Attendance.create({
    empId: req.body.empId,
    date: today,
    checkIn: new Date().toLocaleTimeString()
  });
  res.json(att);
});

app.post("/checkout", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const att = await Attendance.findOne({ empId: req.body.empId, date: today });
  if (!att) return res.status(400).json({ error: "No check-in" });

  const out = new Date();
  const [h, m, s] = att.checkIn.split(":");
  const inTime = new Date();
  inTime.setHours(h, m, s || 0);

  const diff = (out - inTime) / 3600000;
  const ot = diff > 8 ? +(diff - 8).toFixed(2) : 0;

  att.checkOut = out.toLocaleTimeString();
  att.hours = +diff.toFixed(2);
  att.otHours = ot;
  att.otStatus = ot > 0 ? "pending" : "approved";
  await att.save();

  res.json(att);
});

/* ================= LEAVE ================= */

app.post("/leave", async (req, res) => {
  const emp = await Employee.findOne({ empId: req.body.empId });
  if (emp.leaveBalance <= 0)
    return res.status(400).json({ error: "No leave balance" });

  await Leave.create(req.body);
  res.json({ success: true });
});

app.get("/admin/leaves", async (req, res) => {
  const leaves = await Leave.find({ status: "pending" });
  res.json(leaves);
});

app.post("/admin/leave/approve", async (req, res) => {
  const leave = await Leave.findById(req.body.id);
  if (!leave) return res.sendStatus(404);

  leave.status = "approved";
  await leave.save();

  await Employee.updateOne(
    { empId: leave.empId },
    { $inc: { leaveBalance: -1 } }
  );

  res.json({ success: true });
});

app.post("/admin/leave/reject", async (req, res) => {
  await Leave.findByIdAndUpdate(req.body.id, { status: "rejected" });
  res.json({ success: true });
});

/* ================= OT APPROVAL ================= */

app.get("/admin/ot", async (req, res) => {
  const ot = await Attendance.find({ otStatus: "pending", otHours: { $gt: 0 } });
  res.json(ot);
});

app.post("/admin/ot/approve", async (req, res) => {
  await Attendance.findByIdAndUpdate(req.body.id, { otStatus: "approved" });
  res.json({ success: true });
});

app.post("/admin/ot/reject", async (req, res) => {
  await Attendance.findByIdAndUpdate(req.body.id, { otStatus: "rejected" });
  res.json({ success: true });
});

/* ================= DASHBOARD STATS ================= */

app.get("/admin/stats", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  res.json({
    totalEmployees: await Employee.countDocuments(),
    presentToday: await Attendance.countDocuments({ date: today }),
    lateToday: 0,
    pendingLeaves: await Leave.countDocuments({ status: "pending" })
  });
});

/* ================= CSV REPORT ================= */

app.get("/admin/report", async (req, res) => {
  const data = await Attendance.find({
    date: { $gte: req.query.from, $lte: req.query.to }
  });

  let csv = "EmpId,Date,Hours,OT,OT Status\n";
  data.forEach(d => {
    csv += `${d.empId},${d.date},${d.hours || 0},${d.otHours || 0},${d.otStatus}\n`;
  });

  res.setHeader("Content-Disposition", "attachment; filename=wkly-report.csv");
  res.type("text/csv");
  res.send(csv);
});

/* ================= DELETE ATTENDANCE ================= */

app.post("/admin/delete-attendance", async (req, res) => {
  const r = await Attendance.deleteMany({
    date: { $gte: req.body.fromDate, $lte: req.body.toDate }
  });
  res.json({ deleted: r.deletedCount });
});

/* ================= START ================= */
app.listen(PORT, () => {
  console.log("WKLY Backend running on", PORT);
});
