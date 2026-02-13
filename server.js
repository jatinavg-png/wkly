const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

/* ===== MongoDB Connect ===== */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.error("MongoDB Error ❌", err));

/* ===== Models ===== */
const Employee = mongoose.model("Employee", new mongoose.Schema({
  empId: String,
  name: String,
  password: String,
  role: { type: String, default: "employee" }
}));

const Attendance = mongoose.model("Attendance", new mongoose.Schema({
  empId: String,
  date: String,          // YYYY-MM-DD
  checkIn: String,
  checkOut: String
}));

/* ===== Routes ===== */
app.get("/", (req, res) => res.send("Attendance Backend Running ✅"));

/* Login */
app.post("/login", async (req, res) => {
  const { empId, password } = req.body;

  if (empId === "admin" && password === "admin@0610") {
    return res.json({ role: "admin" });
  }

  const user = await Employee.findOne({ empId, password });
  if (!user) return res.status(401).json({ error: "Invalid login" });

  res.json({ role: "employee", user });
});

/* Add Employee (Admin) */
app.post("/employees", async (req, res) => {
  const emp = await Employee.create(req.body);
  res.json(emp);
});

/* Check-in */
app.post("/checkin", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const att = await Attendance.create({
    empId: req.body.empId,
    date: today,
    checkIn: new Date().toLocaleTimeString()
  });
  res.json(att);
});

/* Check-out */
app.post("/checkout", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const att = await Attendance.findOneAndUpdate(
    { empId: req.body.empId, date: today },
    { checkOut: new Date().toLocaleTimeString() },
    { new: true }
  );
  res.json(att);
});

/* Admin: Delete Attendance by Date Range */
app.post("/admin/delete-attendance", async (req, res) => {
  const { fromDate, toDate } = req.body;
  const result = await Attendance.deleteMany({
    date: { $gte: fromDate, $lte: toDate }
  });
  res.json({ deleted: result.deletedCount });
});

/* Start */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
