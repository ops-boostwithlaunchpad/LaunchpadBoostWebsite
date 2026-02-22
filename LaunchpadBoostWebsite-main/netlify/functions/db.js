var https = require('https');

var SUPABASE_URL = process.env.SUPABASE_URL;
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function sbRequest(method, path, body) {
    return new Promise(function(resolve, reject) {
        var url = new URL(SUPABASE_URL + '/rest/v1/' + path);
        var options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        };

        var req = https.request(options, function(res) {
            var data = '';
            res.on('data', function(chunk) { data += chunk; });
            res.on('end', function() {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch(e) { resolve({ status: res.statusCode, body: data }); }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        var payload = JSON.parse(event.body);
        var action = payload.action;
        var result;

        // GET CLIENTS
        if (action === 'getClients') {
            result = await sbRequest('GET', 'Launchpad%20Boost%20Client%20Log-Ins?select=*&order=created_at.desc', null);
            return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify(result.body) };
        }

        // ADD CLIENT
        if (action === 'addClient') {
            result = await sbRequest('POST', 'Launchpad%20Boost%20Client%20Log-Ins', payload.data);
            if (result.status >= 400) throw new Error('Add failed');
            return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ success: true }) };
        }

        // DELETE CLIENT
        if (action === 'deleteClient') {
            result = await sbRequest('DELETE', 'Launchpad%20Boost%20Client%20Log-Ins?id=eq.' + payload.id, null);
            return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ success: true }) };
        }

        // VERIFY CLIENT LOGIN
        if (action === 'verifyClient') {
            result = await sbRequest('GET', 'Launchpad%20Boost%20Client%20Log-Ins?select=*', null);
            var clients = result.body;
            var match = null;
            for (var i = 0; i < clients.length; i++) {
                var c = clients[i];
                if (
                    c.business_name &&
                    c.business_name.trim().toLowerCase() === payload.name.toLowerCase() &&
                    c.password === payload.password
                ) { match = c; break; }
            }
            if (match) {
                return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ success: true, client: { id: match.id, businessName: match.business_name } }) };
            } else {
                return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ success: false }) };
            }
        }

        // SAVE SUBMISSION
        if (action === 'saveSubmission') {
            result = await sbRequest('POST', 'submissions', payload.data);
            if (result.status >= 400) throw new Error('Save failed');
            return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ success: true }) };
        }

        // GET SUBMISSIONS
        if (action === 'getSubmissions') {
            result = await sbRequest('GET', 'submissions?select=*&order=created_at.desc', null);
            return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify(result.body) };
        }

        // SAVE EMAIL SIGNUP
        if (action === 'saveEmail') {
            result = await sbRequest('POST', 'email_signups', { email: payload.email });
            return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ success: true }) };
        }

        // UPDATE SUBMISSION
        if (action === 'updateSubmission') {
            result = await sbRequest('PATCH', 'submissions?id=eq.' + payload.id, payload.data);
            return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ success: true }) };
        }

        // UPDATE KEYWORD SEARCH REPORT
        if (action === 'updateKeywordReport') {
            result = await sbRequest('PATCH', 'submissions?id=eq.' + payload.id, { keyword_search_report: payload.value });
            return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ success: true }) };
        }

        // GET EMAIL SIGNUPS
        if (action === 'getEmails') {
            result = await sbRequest('GET', 'email_signups?select=*&order=created_at.desc', null);
            return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify(result.body) };
        }

        return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };

    } catch(err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
