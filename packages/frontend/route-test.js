// Simple route verification script
const routes = [
  '/coordinator/donors',
  '/coordinator/monitoring', 
  '/monitoring',
  '/monitoring/map'
];

console.log('Testing routes locally...');

async function testRoutes() {
  for (const route of routes) {
    try {
      const response = await fetch(`http://localhost:3001${route}`);
      console.log(`${route}: ${response.status} ${response.statusText}`);
      
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
      const h2Match = html.match(/<h2[^>]*>([^<]+)<\/h2>/);
      
      const title = titleMatch ? titleMatch[1] : 'No title';
      const heading = h1Match ? h1Match[1] : (h2Match ? h2Match[1] : 'No heading');
      
      console.log(`  Title: ${title}`);
      console.log(`  Heading: ${heading}`);
      console.log('');
    } catch (err) {
      console.log(`${route}: ERROR - ${err.message}`);
    }
  }
}

testRoutes();