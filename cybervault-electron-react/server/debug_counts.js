import mysql from 'mysql2/promise';
(async function(){
  const pool = mysql.createPool({host:'127.0.0.1', port:3306, user:'root', password:'root0930@', database:'cybervault'});
  const [rows] = await pool.query('SELECT user_email, COUNT(*) AS cnt FROM file_records WHERE deleted = 0 GROUP BY user_email');
  console.log(JSON.stringify(rows,null,2));
  await pool.end();
})();
