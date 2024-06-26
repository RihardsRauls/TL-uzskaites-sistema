require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const host = process.env.DB_HOST;
const port = process.env.DB_PORT;
const database = process.env.DB_DATABASE;

const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;
const isProduction = process.env.NODE_ENV === "production";

async function createDatabaseIfNotExists() {
    try {
        
        const pool = new Pool({
            connectionString: `postgresql://${user}:${password}@${host}:${port}`
        });

        const client = await pool.connect();

        // Check if the database already exists
        const result = await client.query(
            "SELECT EXISTS(SELECT datname FROM pg_catalog.pg_database WHERE datname = $1)",
            [database]
        );

        const databaseExists = result.rows[0].exists;

        if (!databaseExists) {
            // Create the database if it doesn't exist
            await client.query(`CREATE DATABASE ${database}`);
            console.log(`Database '${database}' created successfully.`);
        } else {
            console.log(`Database '${database}' already exists.`);
        }

        client.release();
        
    } catch (error) {
        console.error('Error occurred while creating database:', error);
        process.exit(1); // Exit the process with an error code
    }
}

async function createTables() {
    const client = new Pool({
        connectionString: connectionString
    });

    const result = await client.query(
        "SELECT EXISTS(SELECT datname FROM pg_catalog.pg_database WHERE datname = $1)",
        [database]
    );
    // console.log(result)

    try {
        // Create users table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                userid UUID PRIMARY KEY,
                email TEXT NOT NULL,
                name TEXT NOT NULL,
                surname TEXT NOT NULL,
                password TEXT NOT NULL,
                admin TEXT NOT NULL
            )
        `);

        console.log(`Table 'users' created or exists.`);

/*         // Check if the admin user exists
        const adminQueryResult = await client.query(`
            SELECT EXISTS(SELECT 1 FROM users WHERE userid = $1) AS "adminExists"
        `, ['9a87f8e0-a274-4d43-af8e-1b69c66fc9be']);

        const adminExists = adminQueryResult.rows[0].adminExists;

        if (!adminExists) {
            // Insert initial admin user if it doesn't exist
            hashedPassword = bcrypt.hash(password, 10)

            await client.query(`
                INSERT INTO users 
                (
                    userid, email, 
                    name, surname, 
                    password, admin
                )
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                '9a87f8e0-a274-4d43-af8e-1b69c66fc9be', 'admin@a.a', 
                'administrators', user, 
                hashedPassword, 'True'
            ]);

            console.log(`Admin user inserted successfully.`);
        } else {
            console.log(`Admin user already exists.`);
        } */

        // Create cars table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS cars (
                userid UUID NOT NULL,
                name TEXT NOT NULL,
                surname TEXT NOT NULL,
                phone TEXT NOT NULL,
                start_date TIMESTAMP WITH TIME ZONE NOT NULL,
                model TEXT NOT NULL,
                brand TEXT NOT NULL,
                vin TEXT NOT NULL,
                license_plate TEXT NOT NULL,
                description TEXT NOT NULL,
                active TEXT NOT NULL,
                car_id TEXT NOT NULL UNIQUE,
                filename TEXT NOT NULL
            )
        `);

        console.log(`Table 'cars' created or exists.`);
    } catch (error) {
        console.error('Error creating tables:', error.message);
    } finally {
        client.end();
    }
}

(async () => {
    // Call the function to create the database
    await createDatabaseIfNotExists();
    createTables();
})();

const pool = new Pool({
    connectionString: isProduction ? process.env.DATABASE_URL : connectionString,
    ssl: isProduction
});
  
module.exports = { pool };