const { Client } = require('pg');
const fs = require('fs');

async function runSchema() {
  const client = new Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.uevbwtfjbscsdgfdbrov',
    password: 'Abdo77samy@gmail',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase!');

    const schema = fs.readFileSync('./supabase-schema.sql', 'utf8');

    // Split by semicolons but handle function definitions
    const statements = schema
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await client.query(statement + ';');
        console.log('Executed:', statement.substring(0, 50) + '...');
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          console.error('Error:', err.message.substring(0, 100));
        }
      }
    }

    console.log('\n✅ Schema setup complete!');
  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSchema();
