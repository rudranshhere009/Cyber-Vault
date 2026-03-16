import { getInsights } from './mysql.js';
(async ()=>{
  const insights = await getInsights(200);
  console.log(JSON.stringify(insights, null, 2));
})();
