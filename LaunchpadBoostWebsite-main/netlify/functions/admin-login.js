exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        var body = JSON.parse(event.body);
        var password = body.password;
        var correctPassword = process.env.ADMIN_PASSWORD;

        if (!correctPassword) {
            return {
                statusCode: 500,
                body: JSON.stringify({ success: false, error: 'Server misconfigured' })
            };
        }

        if (password === correctPassword) {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: true })
            };
        } else {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: false })
            };
        }
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: 'Server error' })
        };
    }
};
