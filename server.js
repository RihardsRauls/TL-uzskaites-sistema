// Importing stuff
const express = require('express');
const app = express();
const { pool } = require('./dbConfig');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const initializePassport = require('./passportConfig');
const { v4: uuidv4 } = require('uuid');


const PORT = process.env.PORT || 3000;
app.set("view engine", "ejs");
initializePassport(passport);

// All of the app.use stuff
app.use(express.static('public'));
app.use(express.urlencoded({
    extended: false
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

//Lai konsolē nerāditos ka meklē šo icon
app.get('/favicon.ico', (req, res) => res.status(204));

app.get("/", (req, res) => {
    res.render("index");
});


app.get("/users/register", checkAuthenticated , (req, res) =>{
    res.render("register");
});

app.post("/users/register", async (req, res) =>{
    let {name, surname, email, password, password2} = req.body;

    let errors = [];

    if(!name || !surname || !email || !password || !password2){
        errors.push({message: "Lūdzu aizpildiet visus laukus!"});
    };

    if(password.length < 8){
        errors.push({message: "Parolei jābūt vismaz 8 rakstzīmēm garai!"});
    };

    if (password !== password2){
        errors.push({message: "Paroles nav vienādas!"});
    };

    if(errors.length > 0){
        res.render("register", {errors});
    }
    else{
        let hashedPassword = await bcrypt.hash(password, 10);
        pool.query(
            `SELECT * FROM users
            WHERE email = $1`, [email], (err, results)=>{
                if(err){
                    throw err;
                }
                if(results.rows.length > 0){
                    errors.push({message: "Šī epasta adrese jau tiek izmantota!"});
                    res.render("register", {errors});
                }
                else{
                    pool.query(
                        `INSERT INTO users (userid, name, surname, email, password)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING userid, password`, [uuidv4(), name, surname, email, hashedPassword], (err, results)=>{
                        if(err){
                            throw err;
                        }
                        req.flash('success_msg', "Lietotājs ir reģistrēts! Var pieslēgties.");
                        res.redirect('/users/login');
                    });
                };
            }   
        );
    };
});

app.get("/users/login", checkAuthenticated , (req, res) =>{
    res.render("login");
});

app.post("/users/login", passport.authenticate('local', {successRedirect: '/users/dashboard', failureRedirect: '/users/login', failureFlash:true}));

app.get("/users/dashboard", checkNotAuthenticated , (req, res) =>{
    //console.log(req.user)
    pool.query(`SELECT * FROM clientcars WHERE userid = $1`, [req.user.userid], (err, results)=>{
        if(err){
            throw err;
        };
        console.log(results.rows)
        if(results.rows.length > 0)
            res.render("dashboard", { rows: results.rows, user: req.user.name + " " + req.user.surname });
        else{
            res.render("dashboard", { rows: [], user: req.user.name + " " + req.user.surname });
        }
    });
});
app.post("/users/dashboard", (req, res) => {
    const { name, surname, phone, start_date, model, brand, vin, license_plate, description, payment_id } = req.body;
    var userid = req.user.userid;

    console.log(userid, name, surname, phone, start_date, model, brand, vin, license_plate, description, payment_id)

    pool.query(`INSERT INTO clientcars (userid, name, surname, phone, start_date, model, brand, vin, license_plate, description, payment_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [userid, name, surname, phone, start_date, model, brand, vin, license_plate, description, payment_id], (err, results) => {
        if (err) {
            throw err;
        }
        res.redirect('/users/dashboard');
    });
});

app.get('/users/logout', (req, res) => {
    if (req.isAuthenticated()) {
        req.logout((err) => {
            if (err) {
                console.error(err);
                return next(err);
            }
            req.flash('success_msg', 'Jūs esat izgājis no profila.');
            res.redirect('/users/login');
        });
    } else {
        req.flash('error_msg', 'Jūs neesat pieslēdzies.');
        res.redirect('/users/login');
    }
});

function checkAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        return res.redirect('/users/dashboard')
    }
    next();
}

function checkNotAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        return next();
    }
    res.redirect('/users/login')
}

app.listen(PORT, ()=>{
    console.log(`Server port ${PORT}`);
});
