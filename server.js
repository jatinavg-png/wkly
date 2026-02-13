const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= DB ================= */
mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log("MongoDB Connected"))
  .catch(err=>console.log(err));

/* ================= MODELS ================= */
const Employee = mongoose.model("Employee", new mongoose.Schema({
  empId:String,
  name:String,
  password:String,
  leaveBalance:{type:Number,default:1}
}));

const Attendance = mongoose.model("Attendance", new mongoose.Schema({
  empId:String,
  date:String,
  checkIn:String,
  checkOut:String,
  hours:Number,
  otHours:Number,
  late:Boolean
}));

const Leave = mongoose.model("Leave", new mongoose.Schema({
  empId:String,
  date:String,
  status:{type:String,default:"pending"}
}));

const OT = mongoose.model("OT", new mongoose.Schema({
  empId:String,
  date:String,
  hours:Number,
  status:{type:String,default:"pending"}
}));

const Notification = mongoose.model("Notification", new mongoose.Schema({
  empId:String,
  message:String,
  date:{type:Date,default:Date.now}
}));

/* ================= LOGIN ================= */
app.post("/login", async(req,res)=>{
  const {empId,password}=req.body;

  if(empId==="admin" && password==="admin@0610"){
    return res.json({role:"admin"});
  }

  const user = await Employee.findOne({empId,password});
  if(!user) return res.status(401).json({error:"Invalid login"});

  res.json({
    role:"employee",
    empId:user.empId,
    leaveBalance:user.leaveBalance
  });
});

/* ================= EMPLOYEE ================= */
app.post("/employees", async(req,res)=>{
  const {empId,name,password}=req.body;
  if(await Employee.findOne({empId}))
    return res.status(400).json({error:"Exists"});
  await Employee.create({empId,name,password});
  res.json({success:true});
});

app.delete("/employees/:id", async(req,res)=>{
  const id=req.params.id;
  await Employee.deleteOne({empId:id});
  await Attendance.deleteMany({empId:id});
  await Leave.deleteMany({empId:id});
  await OT.deleteMany({empId:id});
  res.json({success:true});
});

/* ================= ATTENDANCE ================= */
app.post("/checkin", async(req,res)=>{
  const today=new Date().toISOString().slice(0,10);
  const time=new Date();

  if(await Attendance.findOne({empId:req.body.empId,date:today}))
    return res.json({message:"Already checked in"});

  await Attendance.create({
    empId:req.body.empId,
    date:today,
    checkIn:time.toLocaleTimeString(),
    late:time.getHours()>=11
  });

  res.json({success:true});
});

app.post("/checkout", async(req,res)=>{
  const today=new Date().toISOString().slice(0,10);
  const rec=await Attendance.findOne({empId:req.body.empId,date:today});
  if(!rec || rec.checkOut) return res.json({message:"Invalid"});

  const out=new Date();
  rec.checkOut=out.toLocaleTimeString();

  const diff=(out - new Date(`${today} ${rec.checkIn}`))/(1000*60*60);
  rec.hours=diff;
  rec.otHours=Math.max(0,diff-8);
  await rec.save();

  if(rec.otHours>0){
    await OT.create({empId:req.body.empId,date:today,hours:rec.otHours});
  }

  res.json({success:true});
});

/* ================= LEAVE ================= */
app.post("/leave", async(req,res)=>{
  const emp=await Employee.findOne({empId:req.body.empId});

  if(emp.leaveBalance>0){
    emp.leaveBalance--;
    await emp.save();
    return res.json({autoApproved:true});
  }

  await Leave.create({empId:req.body.empId,date:req.body.date});
  res.json({autoApproved:false});
});

/* ================= ADMIN ================= */
app.get("/admin/stats", async(req,res)=>{
  const today=new Date().toISOString().slice(0,10);
  res.json({
    totalEmployees:await Employee.countDocuments(),
    presentToday:await Attendance.countDocuments({date:today}),
    lateToday:await Attendance.countDocuments({date:today,late:true}),
    pendingLeaves:await Leave.countDocuments({status:"pending"})
  });
});

app.get("/admin/leaves", async(req,res)=>{
  res.json(await Leave.find({status:"pending"}));
});

app.post("/admin/leave-action", async(req,res)=>{
  const {id,action}=req.body;
  const leave=await Leave.findById(id);
  leave.status=action;
  await leave.save();

  if(action==="approved"){
    await Notification.create({
      empId:leave.empId,
      message:`Leave approved for ${leave.date}`
    });
  }
  res.json({success:true});
});

/* ================= CSV ================= */
app.get("/admin/report", async(req,res)=>{
  const {from,to}=req.query;
  const data=await Attendance.find({date:{$gte:from,$lte:to}});
  let csv="EmpID,Date,Hours,OT\n";
  data.forEach(r=>{
    csv+=`${r.empId},${r.date},${r.hours||0},${r.otHours||0}\n`;
  });
  res.header("Content-Type","text/csv");
  res.send(csv);
});

/* ================= CLEANUP ================= */
app.post("/admin/delete-attendance", async(req,res)=>{
  const {fromDate,toDate}=req.body;
  const r=await Attendance.deleteMany({date:{$gte:fromDate,$lte:toDate}});
  res.json({deleted:r.deletedCount});
});

/* ================= START ================= */
const PORT=process.env.PORT||10000;
app.listen(PORT,()=>console.log("WKLY backend running",PORT));
