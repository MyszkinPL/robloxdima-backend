
import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:deyzcgtmomxsq337@57.128.218.227:12385/postgres"
  });

  await client.connect();

  const adminId = '7644426232';

  try {
    await client.query(`
      INSERT INTO users (id, "firstName", role, balance, "createdAt")
      VALUES ($1, 'Admin', 'admin', 0, NOW())
      ON CONFLICT (id) 
      DO UPDATE SET role = 'admin';
    `, [adminId]);
    
    console.log('User role updated successfully');
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
    await client.end();
  }
}

main();
