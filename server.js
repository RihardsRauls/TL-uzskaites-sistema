// Importing for website
const express = require('express');
const { pool } = require('./dbConfig');
const session = require('express-session');
const flash = require('express-flash');
//So i can generate random uuids
const { v4: uuidv4 } = require('uuid');
//for login
const passport = require('passport');
const initializePassport = require('./passportConfig');
const bcrypt = require('bcrypt');
//for images
const multer = require('multer');

const app = express();
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        let ext = file.originalname.substring(file.originalname.lastIndexOf('.'), file.originalname.length);
        cb(null, uniqueSuffix + ext)
    }
})
const imageFilter = function (req, file, cb) {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

// Configure Multer middleware with storage and file filter
const upload = multer({ 
    storage: storage,
    fileFilter: imageFilter
});


const PORT = process.env.PORT || 3000;
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


//All of the routes and methods
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
                        `INSERT INTO users (userid, name, surname, email, password, admin)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING userid, password`, [uuidv4(), name, surname, email, hashedPassword, 'False'], (err, results)=>{
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
    pool.query(`SELECT * FROM cars WHERE userid = $1`, [req.user.userid], (err, results)=>{
        if(err){
            throw err;
        };
        //console.log(results.rows)
        if(results.rows.length > 0){
            res.render("dashboard", { rows: results.rows, user: req.user.name + " " + req.user.surname });
        }
        else{
            res.render("dashboard", { rows: [], user: req.user.name + " " + req.user.surname });
        }
    });
});

app.post("/users/dashboard", upload.single('image'), (req, res) => {
    const { name, surname, phone, start_date, model, brand, vin, license_plate, description, car_id} = req.body;
    const userid = req.user.userid;

    //I wanted to have a solution that makes uses carid as the file name, but i couldnt get it to work
    //Soo i added another value to the table, for the filename... could probably make it so that it can have multiple paths this way
    //But i have no idea
    let filename = 'none.jpg'; // Declare 'filename' variable outside of the if statement

    if (req.file && req.file.filename) { // Check if req.file exists before accessing its properties
        filename = req.file.filename;
    }

    //console.log(filename)
    
    pool.query(`INSERT INTO cars (userid, name, surname, phone, start_date, model, brand, vin, license_plate, description, active, car_id, filename)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [userid, name, surname, phone, start_date, model, brand, vin, license_plate, description, 'True', car_id, filename], (err, results) => {
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

app.get('/users/view', checkNotAuthenticated, (req, res) => {

    pool.query(`SELECT * FROM cars WHERE car_id = $1`, [req.query.carid], (err, results)=>{
        if(err){
            throw err;
        };
        //console.log(results.rows)
        if(results.rows.length > 0){
            //console.log({ rows: results.rows, user: req.user.name + " " + req.user.surname });
            res.render("view_car", { data: results.rows, user: req.user.name + " " + req.user.surname });
        }
        else{
            res.redirect("/users/dashboard");
        };
    });
});


//Middleware that checks if there is a signed in user or not

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

//So that the app runs.

app.listen(PORT, ()=>{
    console.log(`Server port ${PORT}`);
});