Open 3 console windows, one for each server: authorization server, protected resource server, and client server.
In each, run:

npm install

Then, start each server in its own window

node authorizationServer.js

node protectedResource.js

node client.js

Open a Web browser and enter client URI (OAuth Client is listening at http://127.0.0.1:9000)

1. Define client-id and client-secret

var client = {
	"client_id": "oauth-client-1",
	"client_secret": "oauth-client-secret-1",
	"redirect_uris": ["http://localhost:9000/callback"]
};

2. '/authorize' route

// To initiate the authorization process, we need to redirect the user to the server’s autho-
// rization endpoint and include all of the appropriate query parameters on that URL.
var authorizeUrl = buildUrl(authServer.authorizationEndpoint, {
	response_type: 'code',
	client_id: client.client_id,
	redirect_uri: client.redirect_uris[0]
});
// Now we can send an HTTP redirect to the user’s browser, which will send them to the
// authorization endpoint.
// The redirect function is part of the express.js framework and sends an HTTP
// 302 Redirect message to the browser in response to the request on http://
// localhost:9000/authorize .
res.redirect(authorizeUrl);



3. '/callback' route

// read back the authorization code from the authorization server, in the code parameter.
	var code = req.query.code;

	console.log('code = %s', code);

	// Now we need to take this authorization code and send it directly to the token endpoint
	// using an HTTP POST. We’ll include the code as a form parameter in the request body.
	var form_data = qs.stringify({
		grant_type: 'authorization_code',
		code: code,
		redirect_uri: client.redirect_uris[0]
	});
	// NOTE: 
	// According to the OAuth specification, if the redirect URI is
	// specified in the authorization request, that same URI must also be included in the
	// token request. This practice prevents an attacker from using a compromised redirect
	// URI with an otherwise well-meaning client by injecting an authorization code from
	// one session into another.

	// We also need to send a few headers to tell the server that this is an HTTP form-
	// encoded request, as well as authenticate our client using HTTP Basic. The Authori-
	// zation header in HTTP Basic is a base64 encoded string made by concatenating the
	// username and password together, separated by a single colon (:) character. OAuth 2.0
	// tells us to use the client ID as the username and the client secret as the password, but
	// with each of these being URL encoded first. 1 We’ve given you a simple utility function
	// to handle the details of the HTTP Basic encoding.
	var headers = {
		'Content-Type': 'application/x-www-form-urlencoded',
		'Authorization': 'Basic ' + encodeClientCredentials(client.client_id,
		client.client_secret)
	};
	// We’ll then need to wire that in with a POST request to the server’s authorization
	// endpoint:
	var tokRes = request('POST', authServer.tokenEndpoint,
	{
		body: form_data,
		headers: headers
	});
	
	console.log('Requesting access token for code %s',code);
	if (tokRes.statusCode >= 200 && tokRes.statusCode < 300) {
		// If the request is successful, the authorization server will return a JSON object which
		// includes the access token value, among a few other things.		
		var body = JSON.parse(tokRes.getBody());
		// Save this token so that we can use it later
		access_token = body.access_token;
				
		console.log('Got access token: %s', access_token);
				
		res.render('index', {access_token: access_token, scope: scope});
	} else {
		res.render('error', 
			{error: 'Unable to fetch access token, server response: ' + tokRes.statusCode})
	}



4. '/fetch_resource' route

if (!access_token) {
		res.render('error', {error: 'Missing access token.'});
		return;
	}
	// We need to send the token using the OAuth-defined
	// Authorization: Bearer header, with the token as the value of the header.
	var headers = {
		'Authorization': 'Bearer ' + access_token
	};
	var resource = request('POST', protectedResource,
		{headers: headers}
	);
	// This sends a request to the protected resource. If it’s successful, we’ll parse the returned
	// JSON and hand it to our data template. Otherwise, we’ll send the user to an error page.
	if (resource.statusCode >= 200 && resource.statusCode < 300) {
		var body = JSON.parse(resource.getBody());
		res.render('data', {resource: body});
		return;
	} else {
		res.render('error', {error: 'Server returned response code: ' + resource.
		statusCode});
		return;
	}


