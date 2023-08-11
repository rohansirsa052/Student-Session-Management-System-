const express = require("express");
const app = express();
const hbs = require("hbs");
const path = require("path");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const fs= require("fs");



console.log(path.join(__dirname, "./patials"));
const partialsPath = path.join(__dirname, "./partials");



app.set("view engine", "hbs");
hbs.registerPartials(partialsPath);

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/register", (req, res) => {
  res.render("register");
});
app.get("/login", (req, res) => {
  res.render("login");
});

const mongoose = require("mongoose");

mongoose
  .connect("mongodb://127.0.0.1:27017/student-Registration")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

  const sessionSchema = new mongoose.Schema({
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Available", "Booked"],
      default: "Available",
    },
    bookedBy:{
      type: String
    }
  });
  
const studentSchema = new mongoose.Schema({
  name:{
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    validate(value) {
      if (!validator.isEmail(value)) throw new Error("email is invalid");
    },
  },

  pass: {
    type: String,
  },
  Cpass: {
    type: String,
  },
  bookedSessions:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }],
});

const DeanSchema = new mongoose.Schema({
  Univercity_id: {
    type: String,
    unique: true,
  },

  pass: {
    type: String,
  },
  Cpass: {
    type: String,
  }
});

const secrectKeyDean= "Thisisthedeansecrectkey";
const secretKeyStudent = "thisisthestudentsecrectkey";

const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers["authorization"];
  // console.log(bearerHeader);
  if (typeof bearerHeader !== "undefined") {
    const berear = bearerHeader.split(" ");
    const token = berear[1];
    req.token = token;
    next();
  } else {
    res.send("Token Is invalid");
  }
};

studentSchema.pre("save", async function (next) {
  if (this.isModified("pass")) {
    //console.log(`${this.pass}`);
    this.pass = await bcrypt.hash(this.pass, 10);
    //console.log(`${this.pass}`);
  }
  next();
});

DeanSchema.pre("save", async function (next) {
  if (this.isModified("pass")) {
    //console.log(`${this.pass}`);
    this.pass = await bcrypt.hash(this.pass, 10);
    //console.log(`${this.pass}`);
  }
  next();
});

const Registration = new mongoose.model("Student_Registration", studentSchema);
const Session = new mongoose.model("Session", sessionSchema);
const Dean = new mongoose.model("Dean", DeanSchema);



  const jsonData = fs.readFileSync("./sessions.json", "utf-8");
  const parsedData = JSON.parse(jsonData);
  console.log(parsedData);
  const availableSessions= parsedData.availableSessions;

Session.create(availableSessions)
  .then(() => console.log("Available sessions added to the database"))
  .catch((err) => console.error("Error adding available sessions:", err));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/register", async (req, res) => {
  try {
    const pass = req.body.pass;
    const confirmPass = req.body.Cpass;
    if (pass === confirmPass) {
      const first_document = new Registration({
        name: req.body.name,
        email: req.body.email,
        pass: req.body.pass,
        Cpass: req.body.Cpass,
      });

      const result = await first_document.save(); // To save the data into database
      console.log(result);
      res.status(201).render("index");
    } else {
      res.send("Passwords are not matching");
    }
  } catch (err) {
    res.status(400).send(err);
  }
});


app.post("/Dean_register", async (req, res) => {
  try {
    const pass = req.body.pass;
    const confirmPass = req.body.Cpass;
    if (pass === confirmPass) {
      const first_document = new Dean({
        Univercity_id: req.body.Univercity_id, // Use the correct property name here
        pass: req.body.pass,
        Cpass: req.body.Cpass,
      });

      const result = await first_document.save(); // To save the data into the database
      console.log(result);
      res.status(201).send(result);
    } else {
      res.send("Passwords are not matching");
    }
  } catch (err) {
    res.status(400).send(err);
  }
});





app.post("/login", async (req, res) => {
 
  try {
    const user = {
      Useremail: req.body.email,
      pass: req.body.password,
    };

    const result = await Registration.findOne({ email: user.Useremail });
    if (!result) {
      return res.status(400).send("Email not found");
    }

    const isMatch = await bcrypt.compare(user.pass, result.pass);

    if (isMatch) {
      jwt.sign({ user },secretKeyStudent, { expiresIn: "3000s" }, (err, token) => {
        res.json({ success: true, token });
      });
    } else {
      res.send("Passwords are not matching");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});
app.post("/Dean_login", async (req, res) => {
 
  try {
    const user = {
      Univercity_id: req.body.Univercity_id,
      pass: req.body.pass,
    };

    const result = await Dean.findOne({ Univercity_id: user.Univercity_id });
    console.log(result);
   
    if (!result) {
      return res.status(400).send("Email not found");
    }

    const isMatch = await bcrypt.compare(user.pass, result.pass);
    console.log(isMatch);

    if (isMatch) {
      jwt.sign({ user }, secrectKeyDean, { expiresIn: "3000s" }, (err, token) => {
        res.json({ success: true, token });
      });
    } else {
      res.send("Passwords are not matching");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});



app.get("/available-sessions", verifyToken, async (req, res) => {

  try {
    jwt.verify(req.token,  secretKeyStudent, async (err, authData) => {
      if (err) {
        console.log(err);
        res.sendStatus(403); // Forbidden status when token verification fails
      } else {
        const availableSessions = await Session.find({status: "Available"});
        res.status(200).json({ sessions: availableSessions });
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.get("/pending-sessions", verifyToken, async (req, res) => {
  try {
    jwt.verify(req.token, secrectKeyDean, async (err, authData) => {
      if (err) {
        console.log(err);
        res.sendStatus(403); // Forbidden status when token verification fails
      } else {
        const currentTime = new Date();
        
        const pendingSessions= await Session.find({status: "Booked"});
        const sessionStartTime = new Date(`${pendingSessions.date} ${pendingSessions.startTime}`);
        console.log(sessionStartTime);
        res.status(200).json({ sessions: pendingSessions });
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/bookSessions", verifyToken, async (req, res) => {
  try {
    jwt.verify(req.token, secretKeyStudent, async (err, authData) => {
      if (err) {
        console.log(err);
        res.sendStatus(403); 
      } else {
        // const email = req.body.email;
        // const studentA = await Registration.findOne({ email: email });
        // if (!studentA) {
        //   return res.status(404).json({ error: "User not found." });
        // }
        const booked_Session= await Session.findById({ _id: "64ce3053d5dcb4de4e3c7eae" });
        console.log(booked_Session);
        if(booked_Session!==null && booked_Session.status!== "Booked"){
          const studentA = await Registration.findOne({ email: authData.user.Useremail });

          if (!studentA) {
            return res.status(404).json({ error: "User not found." });
          }

          studentA.bookedSessions.push(booked_Session);
          await studentA.save();

      
        const updateSession = await Session.findByIdAndUpdate(
          "64ce3053d5dcb4de4e3c7eae",
          { status: "Booked", bookedBy: studentA.name },
          { new: true } // This option returns the updated document
        );
        res.json({"success": true, updateSession,  "message": "Session booked successfully."});
       // console.log(updateSession);
        }
        else{
          res.json({"success" : false, "Message" : "The Session is not available or Already booked"});
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// const securePass = async (password) => {
//   const passHash = await bycrypt.hash(password, 10);
//   console.log(password);
// };
// securePass("Rohan@123");

const port = process.env.PORT || 8070;
app.listen(port, () => console.log(`Server running at ${port}`));
