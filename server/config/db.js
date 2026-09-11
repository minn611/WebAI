const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '123456',
  database: process.env.DB_NAME || 'teajoy_store',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Test DB Connection function
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected successfully to MySQL Database:', process.env.DB_NAME || 'teajoy_store');
    connection.release();
    return true;
  } catch (error) {
    console.warn('⚠️ Could not connect to local MySQL Server:', error.message);
    console.warn('💡 Tip: Make sure MySQL is running on port 3306 and teajoy_store database is created using database/teajoy.sql.');
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
