const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const initializePassport = require('./passportConfig');

const app = express();

app.set("view engine", "ejs");
initializePassport(passport);

// All of the app.use stuff
app.use(express.static('public'));
app.use(express.urlencoded({
    extended: true
}));
app.use(
    session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

//So that the icon error doesnt pop up in console
app.get('/favicon.ico', (req, res) => res.status(204));

module.exports = app;