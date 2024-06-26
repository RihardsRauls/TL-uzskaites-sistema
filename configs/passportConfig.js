const LocalStrategy = require('passport-local').Strategy;
const { pool } = require('./dbConfig');
const bcrypt = require('bcrypt');

function initialize(passport){
    const authenticateUser = (email, password, done)=>{
        pool.query(
            `SELECT * FROM users WHERE email = $1`, [email], (err, results)=>{
                if(err){
                    throw err;
                };
                
                //console.log(results.rows);

                if(results.rows.length > 0){
                    const user = results.rows[0];

                    bcrypt.compare(password, user.password, (err, isMatch)=>{
                        if(err){
                            throw err;
                        }
                        if(isMatch){
                            return done(null, user);
                        }
                        else{
                            return done(
                                null, 
                                false, 
                                {message: 'Parole nav pareiza.'}
                                )
                        };
                    });
                }
                else{
                    return done(
                        null, 
                        false, 
                        {message: 'Šāds lietotājs nav atrasts.'}
                        )
                };
            }
        );
    };

    passport.use(
        new LocalStrategy({
            usernameField:'email',
            passwordField: 'password',
        }, authenticateUser)
    );

    passport.serializeUser((user, done)=>done(null, user.userid));
    passport.deserializeUser((userid, done)=>{
        pool.query(
            `SELECT * FROM users WHERE userid = $1`, [userid], 
            (err, results)=>{
                if(err){
                    throw err;
                };
                return done(null, results.rows[0]);
            }
        );
    });
};

module.exports = initialize;