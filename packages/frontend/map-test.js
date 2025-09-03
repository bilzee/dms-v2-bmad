// Test /monitoring/map content specifically
async function testMapRoute() {
  try {
    const response = await fetch('http://localhost:3001/monitoring/map');
    console.log(`Status: ${response.status}`);
    
    const html = await response.text();
    
    // Look for specific content indicators
    const interactiveMapIndicators = [
      'Interactive Mapping',
      'Geographic visualization',
      'MapWrapper',
      'Layer Controls',
      'Interactive Map'
    ];
    
    const situationDisplayIndicators = [
      'Real-Time Situation Display',
      'Situation Display',
      'Data Freshness Overview'
    ];
    
    console.log('\nChecking for Interactive Map content:');
    interactiveMapIndicators.forEach(indicator => {
      const found = html.includes(indicator);
      console.log(`  ${indicator}: ${found ? '✅' : '❌'}`);
    });
    
    console.log('\nChecking for Situation Display content (should NOT be here):');
    situationDisplayIndicators.forEach(indicator => {
      const found = html.includes(indicator);
      console.log(`  ${indicator}: ${found ? '❌ WRONG CONTENT' : '✅'}`);
    });
    
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  }
}

testMapRoute();