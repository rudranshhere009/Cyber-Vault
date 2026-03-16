import mysql from 'mysql2/promise';
(async function(){
  const pool = mysql.createPool({host:'127.0.0.1', port:3306, user:'root', password:'root0930@', database:'cybervault'});
  const [rows] = await pool.query('SELECT id,user_email,data_id,file_name,deleted,deleted_at FROM file_records WHERE user_email = ? ORDER BY id', ['test@example.com']);
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
})();
