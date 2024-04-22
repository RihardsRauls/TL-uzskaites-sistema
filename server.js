//Importing configs
const app = require("./configs/expressConfig");
const { pool } = require('./configs/dbConfig');
const upload = require('./configs/multerConfig.js');
//Imports for passports and generation
const { v4: uuidv4 } = require('uuid');
const passport = require('passport');
const bcrypt = require('bcrypt');

const PORT = process.env.PORT || 3000;

//All of the routes and methods
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/help", (req, res) => {
    res.render("help");
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
            WHERE email = $1`, [email], 
            (err, results)=>{
                if(err){
                    throw err;
                }
                if(results.rows.length > 0){
                    errors.push(
                        {message: "Šī epasta adrese jau tiek izmantota!"}
                        );
                    res.render("register", {errors});
                }
                else{
                    pool.query(
                        `INSERT INTO users 
                        (
                            userid, name, 
                            surname, email, 
                            password, admin
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING userid, password`, 
                        [
                            uuidv4(), name, 
                            surname, email, 
                            hashedPassword, 'False'
                        ], 
                        (err, results)=>{
                        if(err){
                            throw err;
                        }

                        req.flash(
                            'success_msg', 
                            "Lietotājs ir reģistrēts! Var pieslēgties."
                            );
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

app.post(
    "/users/login", passport.authenticate('local', 
        {successRedirect: '/users/dashboard', 
        failureRedirect: '/users/login', 
        failureFlash:true}
    )
);

app.get("/users/dashboard", checkNotAuthenticated , (req, res) =>{
    //console.log(req.user)
    pool.query(`SELECT * FROM cars WHERE car_id = $1`, [req.query.carid], 
    (err, results)=>{
        if(err){
            throw err;
        };
        //console.log(results.rows)
        if(results.rows.length > 0){
            edit = results.rows
        }
        else{
            

            edit = [{
                userid: '',
                name: '',
                surname: '',
                phone: '',
                start_date: '',
                model: '',
                brand: '',
                vin: '',
                license_plate: '',
                description: "",
                active: '',
                car_id: uuidv4(),
                filename: ''
            }]
        }
    });

    pool.query(`SELECT * FROM cars WHERE userid = $1`, [req.user.userid], 
    (err, results)=>{
        if(err){
            throw err;
        };
        //console.log(results.rows)
        if(results.rows.length > 0){
            res.render("dashboard", { 
                rows: results.rows, 
                user: req.user.name + " " + req.user.surname 
            });
        }
        else{
            res.render("dashboard", { 
                rows: [], 
                user: req.user.name + " " + req.user.surname,
                edit: edit
            });
        };
    });
});

app.post("/users/dashboard", upload.single('image'), 
(req, res) => {
    const { name, 
        surname, 
        phone, 
        start_date, 
        model, brand, 
        vin, 
        license_plate, 
        description, 
        car_id
    } = req.body;

    const userid = req.user.userid;

    //I wanted to have a solution that makes uses carid as the file name, 
    //but i couldnt get it to work
    //Soo i added another value to the table, for the filename... 
    //could probably make it so that it can have multiple paths this way
    //But i have no idea

    let filename = 'none.jpg'; 
    // Declare 'filename' variable outside of the if statement

    if (req.file && req.file.filename) {
        filename = req.file.filename;
    }; // Check if req.file exists before accessing its properties

    //console.log(filename)   
    
    pool.query(`INSERT INTO cars (
        userid, name, 
        surname, phone, 
        start_date, model, 
        brand, vin, 
        license_plate, description,
        active, car_id, 
        filename
        )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (car_id) DO UPDATE
    SET 
        userid = EXCLUDED.userid,
        name = EXCLUDED.name,
        surname = EXCLUDED.surname,
        phone = EXCLUDED.phone,
        start_date = EXCLUDED.start_date,
        model = EXCLUDED.model,
        brand = EXCLUDED.brand,
        vin = EXCLUDED.vin,
        license_plate = EXCLUDED.license_plate,
        description = EXCLUDED.description,
        active = EXCLUDED.active,
        filename = EXCLUDED.filename;
        `, 
        [   
            userid, name, 
            surname, phone, 
            start_date, model, 
            brand, vin, 
            license_plate, description, 
            'True', car_id, 
            filename
        ], 
        (err, results) => {
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

    pool.query(`SELECT * FROM cars WHERE car_id = $1`, [req.query.carid], 
    (err, results)=>{
        if(err){
            throw err;
        };
        //console.log(results.rows)
        if(results.rows.length > 0){
            res.render("view_car", { 
                data: results.rows, 
                user: req.user.name + " " + req.user.surname 
            });
        }
        else{
            res.redirect("/users/dashboard");
        };
    });
});


//Middleware that checks if there is a signed in user or not

function checkAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        return res.redirect('/users/dashboard');
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