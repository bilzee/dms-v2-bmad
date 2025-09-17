const https = require('https');
const http = require('http');

// Test function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Comprehensive map functionality test
async function testMapFunctionality() {
  console.log('🗺️  Interactive Map Functionality Test');
  console.log('=====================================\n');
  
  // Test results
  const results = {
    authentication: false,
    entitiesAPI: false,
    assessmentsAPI: false,
    responsesAPI: false,
    homepage: false,
    errors: []
  };
  
  try {
    console.log('📋 Testing Homepage...');
    const homeResponse = await makeRequest('http://localhost:3001/');
    if (homeResponse.status === 200) {
      results.homepage = true;
      console.log('✅ Homepage accessible (HTTP 200)');
    } else {
      results.errors.push(`Homepage returned HTTP ${homeResponse.status}`);
      console.log(`❌ Homepage returned HTTP ${homeResponse.status}`);
    }
    
    console.log('\n🔐 Testing Authentication Redirect...');
    const mapResponse = await makeRequest('http://localhost:3001/monitoring/map');
    if (mapResponse.status === 307) {
      results.authentication = true;
      console.log('✅ Authentication redirect working (HTTP 307)');
      console.log(`   Redirects to: ${mapResponse.headers.location}`);
    } else {
      results.errors.push(`Map page returned HTTP ${mapResponse.status} instead of redirect`);
      console.log(`❌ Map page returned HTTP ${mapResponse.status} instead of redirect`);
    }
    
    console.log('\n📍 Testing Entities API...');
    const entitiesResponse = await makeRequest('http://localhost:3001/api/v1/monitoring/map/entities');
    if (entitiesResponse.status === 200) {
      const entitiesData = JSON.parse(entitiesResponse.data);
      if (entitiesData.success && entitiesData.data) {
        results.entitiesAPI = true;
        console.log('✅ Entities API working');
        console.log(`   Found ${entitiesData.data.length} entities`);
        console.log(`   Data types: ${[...new Set(entitiesData.data.map(e => e.type))].join(', ')}`);
      } else {
        results.errors.push('Entities API returned unsuccessful response');
        console.log('❌ Entities API returned unsuccessful response');
      }
    } else {
      results.errors.push(`Entities API returned HTTP ${entitiesResponse.status}`);
      console.log(`❌ Entities API returned HTTP ${entitiesResponse.status}`);
    }
    
    console.log('\n📊 Testing Assessments API...');
    const assessmentsResponse = await makeRequest('http://localhost:3001/api/v1/monitoring/map/assessments');
    if (assessmentsResponse.status === 200) {
      const assessmentsData = JSON.parse(assessmentsResponse.data);
      if (assessmentsData.success && assessmentsData.data) {
        results.assessmentsAPI = true;
        console.log('✅ Assessments API working');
        console.log(`   Found ${assessmentsData.data.length} assessments`);
        console.log(`   Status breakdown: Pending: ${assessmentsData.meta.statusBreakdown.pending}, Verified: ${assessmentsData.meta.statusBreakdown.verified}, Rejected: ${assessmentsData.meta.statusBreakdown.rejected}`);
      } else {
        results.errors.push('Assessments API returned unsuccessful response');
        console.log('❌ Assessments API returned unsuccessful response');
      }
    } else {
      results.errors.push(`Assessments API returned HTTP ${assessmentsResponse.status}`);
      console.log(`❌ Assessments API returned HTTP ${assessmentsResponse.status}`);
    }
    
    console.log('\n🚚 Testing Responses API...');
    const responsesResponse = await makeRequest('http://localhost:3001/api/v1/monitoring/map/responses');
    if (responsesResponse.status === 200) {
      const responsesData = JSON.parse(responsesResponse.data);
      if (responsesData.success && responsesData.data) {
        results.responsesAPI = true;
        console.log('✅ Responses API working');
        console.log(`   Found ${responsesData.data.length} responses`);
        console.log(`   Total delivery items: ${responsesData.meta.totalDeliveryItems}`);
      } else {
        results.errors.push('Responses API returned unsuccessful response');
        console.log('❌ Responses API returned unsuccessful response');
      }
    } else {
      results.errors.push(`Responses API returned HTTP ${responsesResponse.status}`);
      console.log(`❌ Responses API returned HTTP ${responsesResponse.status}`);
    }
    
  } catch (error) {
    results.errors.push(`Connection error: ${error.message}`);
    console.log(`❌ Connection error: ${error.message}`);
  }
  
  // Final report
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  
  const totalTests = Object.keys(results).filter(key => key !== 'errors').length;
  const passedTests = Object.values(results).filter(value => value === true).length;
  
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  console.log('\n✅ Successful Tests:');
  if (results.homepage) console.log('  • Homepage accessible');
  if (results.authentication) console.log('  • Authentication redirect working');
  if (results.entitiesAPI) console.log('  • Entities API functional');
  if (results.assessmentsAPI) console.log('  • Assessments API functional');
  if (results.responsesAPI) console.log('  • Responses API functional');
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors Found:');
    results.errors.forEach(error => console.log(`  • ${error}`));
  }
  
  console.log('\n🎯 Map Functionality Assessment:');
  if (results.entitiesAPI && results.assessmentsAPI && results.responsesAPI) {
    console.log('✅ Map should display correctly with all data layers');
    console.log('✅ Layer controls should work properly');
    console.log('✅ Map markers should be visible');
    console.log('✅ No API errors detected');
  } else {
    console.log('❌ Some map functionality may be impaired');
  }
  
  console.log('\n🔑 Test Credentials Available:');
  console.log('   Coordinator: coordinator-alt@test.com / coordinator123');
  console.log('   Super User: superuser-alt@test.com / superuser123');
  console.log('   Admin: admin-alt@test.com / admin123');
  
  console.log('\n📁 Test Files Created:');
  console.log('   • interactive-map-test-report.md (detailed report)');
  console.log('   • test-map-functionality.html (browser test)');
  console.log('   • test-interactive-map.js (automated test)');
  
  return results;
}

// Run the test
testMapFunctionality().catch(console.error);