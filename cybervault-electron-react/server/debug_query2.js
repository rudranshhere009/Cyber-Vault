import mysql from 'mysql2/promise';
(async function(){
  const pool = mysql.createPool({host:'127.0.0.1', port:3306, user:'root', password:'root0930@', database:'cybervault'});
  const [rows] = await pool.query(`SELECT u.id,u.username,u.email,u.created_at,MAX(le.logged_in_at) AS last_login,COUNT(DISTINCT fr.id) AS file_count FROM users u LEFT JOIN login_events le ON le.user_email = u.email LEFT JOIN file_records fr ON fr.user_email = u.email AND fr.deleted = 0 GROUP BY u.id,u.username,u.email,u.created_at LIMIT 10`);
  console.log(JSON.stringify(rows,null,2));
  await pool.end();
})();
