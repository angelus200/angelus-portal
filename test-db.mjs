import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  try {
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_NAME:', process.env.DB_NAME);
    
    const connection = await createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'angelus_portal',
    });
    
    console.log('✅ Verbindung erfolgreich');
    
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Tabellen:', tables);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }
}

testConnection();
