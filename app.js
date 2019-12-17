require('dotenv').config()
var nconf = require('nconf');
// nconf.argv()
// 	.env()
// 	.file({ file: 'path/to/config.json' });
// nconf.set('database:host', '127.0.0.1');
// nconf.set('database:port', 5984);
// nconf.save(function (err) {
// 	require('fs').readFile('path/to/your/config.json', function (err, data) {
// 		console.dir(JSON.parse(data.toString()))
// 	});
// });
/////// app.js
const bcrypt = require("bcryptjs");
const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//SECURE bELOW
const mongoDb = "mongodb+srv://" + process.env.DB_USER + ":" + 
	process.env.DB_PASS + "@" + process.env.DB_HOST + "/express-auth?retryWrites=true&w=majority";

mongoose.connect(mongoDb, { useNewUrlParser: true });
const db = mongoose.connection;
// const db = require('db')
// db.connect({
//   host: process.env.DB_HOST,
//   username: process.env.DB_USER,
//   password: process.env.DB_PASS
// })

db.on("error", console.error.bind(console, "mongo connection error"));

const User = mongoose.model(
	"User",
	new Schema({
		username: { type: String, required: true },
		password: { type: String, required: true }
	})
);

const app = express();
app.set("views", __dirname);
app.set("view engine", "hbs");

passport.use(
	new LocalStrategy((username, password, done) => {
		User.findOne({ username: username }, (err, user) => {
			if (err) { 
				return done(err);
			}
			if (!user) {
				return done(null, false, { msg: "Incorrect username" });
			}
			bcrypt.compare(password, user.password, (err, res) => {
				if (res) {
					return done(null, user);
				} else {
					return done(null, false, {msg: "Incorrect password"});
				}
			})
		});
	})
);

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});

app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  next();
});

app.get("/", (req, res) => { 
	res.render("index", { user: req.user });
});

app.get("/sign-up", (req, res) => res.render("sign-up-form"));

app.post("/sign-up", (req, res, next) => {
	bcrypt.genSalt(10, function(err, salt) {
		bcrypt.hash(req.body.password, salt, function(err, hash){
			const user = new User({
				username: req.body.username,
				password: hash
			}).save(err => {
				if (err) { 
					return next(err);
				};
				res.redirect("/");
			});
		})		
	});	
});

app.post(
	"/log-in",
	passport.authenticate("local", {
		successRedirect: "/",
		failureRedirect: "/"
	})
);

app.get("/log-out", (req, res) => {
	req.logout();
	res.redirect("/");
});

app.listen(3000, () => console.log("app listening on port 3000!"));