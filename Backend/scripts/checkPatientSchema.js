const pool = require('../utils/db');

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Patients table columns:\n');
    result.rows.forEach(col => {
      console.log(`   ${col.column_name.padEnd(30)} ${col.data_type}`);
    });
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
