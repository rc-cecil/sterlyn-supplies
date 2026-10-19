import 'dotenv/config';
import pg from 'pg';
const url=new URL(process.env.DATABASE_URL!);url.pathname='/postgres';const client=new pg.Client({connectionString:url.toString()});await client.connect();const exists=await client.query("SELECT 1 FROM pg_database WHERE datname='sterlyn_test'");if(!exists.rowCount)await client.query('CREATE DATABASE sterlyn_test');await client.end();console.log('Isolated sterlyn_test database ready.');
