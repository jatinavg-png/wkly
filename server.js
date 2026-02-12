const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let attendance = [];

app.get("/", (req, res) => {
  res.send("Attendance Backend Running");
});

app.post("/checkin", (req, res) => {
  const { empId, name, time } = req.body;
  attendance.push({ empId, name, time });
  res.json({ success: true });
});

app.get("/attendance", (req, res) => {
  res.json(attendance);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
