const fetch = require('node-fetch'); // actually fetch is global in Node 18+

async function test() {
  try {
    const loginRes = await fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'mutation { login(email: "admin@gmail.com", password: "123456") { token } }'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.login.token;

    const createRouteRes = await fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        query: 'mutation { createRoute(departureProvince: "Test1", arrivalProvince: "Test2", isActive: true) { id } }'
      })
    });
    const createRouteData = await createRouteRes.json();
    console.log(JSON.stringify(createRouteData, null, 2));
    
    // Test logs
    const logsRes = await fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        query: '{ listEventLogs { logs { action entity details } } }'
      })
    });
    console.log(await logsRes.json());
  } catch (err) {
    console.error(err);
  }
}
test();
