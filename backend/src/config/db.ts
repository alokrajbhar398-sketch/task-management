import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let databaseAvailable = false;

// Create a connection pool instead of a single connection
// This allows to handle concurrent users efficiently as mentioned in the requirements
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'task_management_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export const isDatabaseAvailable = () => databaseAvailable;

export const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        databaseAvailable = true;
        console.log(`✅ MySQL Database Connected successfully!`);
        connection.release();
        return true;
    } catch (error) {
        databaseAvailable = false;
        console.warn(`⚠️ MySQL is not available; switching to local in-memory storage for this demo.`);
        console.warn(`Details: ${(error as Error).message || 'Unknown database error'}`);
        return false;
    }
};

export default pool;
