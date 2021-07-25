require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));



app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

//Database Schemas

const userSchema = new mongoose.Schema ({
  fName: String,
  lName: String,
  email: String,
  password: String,
});

const globalSchema = new mongoose.Schema({
  postTitle: String,
  postContent: String,
  postAuthor: JSON
})



const Global = new mongoose.model("Global", globalSchema)

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

//Passport's local session strategy
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// //**Get & Post route handling**\\
app.get("/", function(req, res){
  res.render("home")
})

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

//Render Home page on successful Authentication
app.get("/twitterHome", function(req, res){
  
  if (req.isAuthenticated()){
    Global.find(function(err, foundItems){
      if (!err){
        res.render("twitterHome", {posts: foundItems, name: req.user});
      }
    })
    
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

//registration section
app.post("/register", function(req, res){
  //Conditional to validate Email using the validateEmail function from the end of my code file
  if(validateEmail(req.body.username) && req.body.password === req.body.retype_password){

  //Passport.js registration
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/twitterHome");
      });
    }
  });
  }
  else {
    res.render("fail")
  }
});

app.post("/login", function(req, res){
 //
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/twitterHome");
      });
    }
  });
 
});

//Compose Posts 
app.get("/tweet", function(req, res){
  res.render("tweet")
})


app.post("/tweet", function(req, res){
  
  Global.insertMany([{postTitle: req.body.postTitle, postContent: req.body.postContent, postAuthor: req.user}], function(err){
    if (err){
      console.log(err)
    }
    else {
      res.redirect("twitterHome")
    }
  })
})

//Path for direct messaging functionality
app.get("/directmessage", function(req, res){
  res.render("directMessage")
})

app.post("/delete", function(req, res){
  const deleteTitle = req.body.remove
  Global.deleteOne({ postTitle: deleteTitle }, function (err) {
    if (!err) {
      
      res.redirect("/twitterHome")
      
    }
  })
})


//Function to check email formatting
function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000.");
});