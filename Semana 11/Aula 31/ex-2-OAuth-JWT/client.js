// 
// Adapted from original code of "OAuth 2 in Action" book
// By Justin Richer and Antonio Sanso
// URL: https://www.manning.com/books/oauth-2-in-action
// Source code: https://www.manning.com/downloads/1528
//

var express = require("express");
var request = require("sync-request");
var url = require("url");
var qs = require("qs");
var querystring = require('querystring');
var cons = require('consolidate');
var randomstring = require("randomstring");
var __ = require('underscore');
__.string = require('underscore.string');

var app = express();

app.engine('html', cons.underscore);
app.set('view engine', 'html');
app.set('views', 'files/client');

// authorization server information
var authServer = {
	authorizationEndpoint: 'http://localhost:9001/authorize',
	tokenEndpoint: 'http://localhost:9001/token'
};

// client information

/*
 * Add the client information in here
 */
var client = {
	"client_id": "oauth-client-1",
	"client_secret": "oauth-client-secret-1",
	"redirect_uris": ["http://localhost:9000/callback"]
};

var protectedResource = 'http://localhost:9002/resource';

var state = null;

var access_token = null;
var scope = null;

app.get('/', function (req, res) {
	res.render('index', {access_token: access_token, scope: scope});
});

app.get('/authorize', function(req, res){
	/*
	 * Send the user to the authorization server
	 */

	//
	// Cross site protection
	//
	// access_token = null;
	// state = randomstring.generate();	 

	// To initiate the authorization process, we need to redirect the user to the server’s autho-
	// rization endpoint and include all of the appropriate query parameters on that URL.
	var authorizeUrl = buildUrl(authServer.authorizationEndpoint, {
		response_type: 'code',
		client_id: client.client_id,
		redirect_uri: client.redirect_uris[0]
		// , state: state
	});

	console.log('authorizeUrl = %s', authorizeUrl);

	// Now we can send an HTTP redirect to the user’s browser, which will send them to the
	// authorization endpoint.
	// The redirect function is part of the express.js framework and sends an HTTP
	// 302 Redirect message to the browser in response to the request on http://
	// localhost:9000/authorize .
	res.redirect(authorizeUrl);

});

app.get('/callback', function(req, res){
	/*
	 * Parse the response from the authorization server and get a token
	 */

	//
	// Cross site protection
	//
	// console.log('req.query.state = %s, state = %s', req.query.state, state);

	// if (req.query.state != state) {
	// 	console.log('State DOES NOT MATCH: expected %s got %s', state, req.query.state);
	// 	res.render('error', {error: 'State value did not match'});
	// 	return;
	// }
	// //////////////////////////////////////////////	

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
	// E.g., qs.stringify({ foo: 'bar', baz: ['qux', 'quux'], corge: '' });
    // Returns 'foo=bar&baz=qux&baz=quux&corge='

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

	//////////////////////////////////// 
	/// DEBUG
	console.log('form_data = %s', form_data);
	console.log('headers = ');
	__.each(headers, function(value, key, list) {
		console.log('key = %s, value = %s', key, value);
	});
	////////////////////////////////////

	// We’ll then need to wire that in with a POST request to the server’s authorization
	// endpoint:
	var tokRes = request('POST', authServer.tokenEndpoint,
	{
		body: form_data,
		headers: headers
	});
	
	// SEE https://www.npmjs.com/package/sync-request for info about request function

	console.log('Requesting access token for code %s',code);

	if (tokRes.statusCode >= 200 && tokRes.statusCode < 300) {
		// If the request is successful, the authorization server will return a JSON object which
		// includes the access token value, among a few other things.	
		console.log('tokRes.getBody() = %s', tokRes.getBody());
		
		var body = JSON.parse(tokRes.getBody());
		// Save this token so that we can use it later
		access_token = body.access_token;
				
		console.log('Got access token: %s', access_token);
				
		res.render('index', {access_token: access_token, scope: scope});
	} else {
		res.render('error', 
			{error: 'Unable to fetch access token, server response: ' + tokRes.statusCode})
	}

});

app.get('/fetch_resource', function(req, res) {
	/*
	 * Use the access token to call the resource server
	 */

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
});
///////////////////////////////////////////////////////////////////////////
//
// Auxiliary functions and settings
//
var buildUrl = function(base, options, hash) {
	var newUrl = url.parse(base, true);
	delete newUrl.search;
	if (!newUrl.query) {
		newUrl.query = {};
	}
	
	__.each(options, function(value, key, list) {
		newUrl.query[key] = value;
	});
	if (hash) {
		newUrl.hash = hash;
	}
	
	return url.format(newUrl);
};

var encodeClientCredentials = function(clientId, clientSecret) {
	return new Buffer(querystring.escape(clientId) + ':' 
	+ querystring.escape(clientSecret)).toString('base64');
};

app.use('/', express.static('files/client'));

var server = app.listen(9000, 'localhost', function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('OAuth Client is listening at http://%s:%s', host, port);
});
 
