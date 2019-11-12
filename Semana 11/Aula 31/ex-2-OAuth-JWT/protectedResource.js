var express = require("express");
var bodyParser = require('body-parser');
var cons = require('consolidate');
var nosql = require('nosql').load('database.nosql');
var cors = require('cors');

var app = express();

app.use(bodyParser.urlencoded({ extended: true })); // support form-encoded bodies (for bearer tokens)

app.engine('html', cons.underscore);
app.set('view engine', 'html');
app.set('views', 'files/protectedResource');
app.set('json spaces', 4);

app.use('/', express.static('files/protectedResource'));
app.use(cors());

// ADDED:
const base64url = require('base64url');

var resource = {
	"name": "Protected Resource",
	"description": "This data has been protected by OAuth 2.0"
};

var getAccessToken = function(req, res, next) {
	// check the auth header first
	var auth = req.headers['authorization'];
	var inToken = null;
	if (auth && auth.toLowerCase().indexOf('bearer') == 0) {
		inToken = auth.slice('bearer '.length);
	} else if (req.body && req.body.access_token) {
		// not in the header, check in the form body
		inToken = req.body.access_token;
	} else if (req.query && req.query.access_token) {
		inToken = req.query.access_token
	}
	
	console.log('Incoming token: %s', inToken);
	//
	// COMMENTED
	//
	// nosql.one(function(token) {
	// 	if (token.access_token == inToken) {
	// 		return token;	
	// 	}
	// }, function(err, token) {
	// 	if (token) {
	// 		console.log("We found a matching token: %s", inToken);
	// 	} else {
	// 		console.log('No matching token was found.');
	// 	}
	// 	req.access_token = token;
	// 	next();
	// 	return;
	// });
	//
	// ADDED:
	//
	// Now it’s time to have our protected resource check the incoming token for its infor-
	// mation instead of looking up the token value in a database. 
	// First we need to parse the token by performing the opposite actions that the authorization server used
	// to create it: we split it on the dot characters to get the different sections. Then we’ll
	// decode the second part, the payload, from Base64 URL and parse the result as a JSON
	// object.
	var tokenParts = inToken.split('.');
	var payload = JSON.parse(base64url.decode(tokenParts[1]));
	console.log('Payload', payload);
	//
	// We’re going to make sure that the token is coming from the expected issuer, that its timestamps fit
	// the right ranges, and that our resource server is the intended audience of the token.
	// Although these kinds of checks are often strung together with boolean logic, we’ve
	// broken these out into individual if statements so that each check can be read more
	// clearly and independently.
	if (payload.iss == 'http://localhost:9001/') {
		console.log('issuer OK');
		if ((Array.isArray(payload.aud) && __.contains(payload.aud, 'http://localhost:9002/')) || 
			payload.aud == 'http://localhost:9002/') {
			console.log('Audience OK');
			
			var now = Math.floor(Date.now() / 1000);
			
			if (payload.iat <= now) {
				console.log('issued-at OK');
				if (payload.exp >= now) {
					console.log('expiration OK');
					
					console.log('Token valid!');
	
					req.access_token = payload;
				}
			}
		}
		
	}

	// If all of those checks pass, we’ll hand the token’s parsed payload on to the rest of the
	// application, which can make authorization decisions based on fields such as the sub-
	// ject, if it so chooses. This is analogous to loading the data stored by the authorization
	// server in its database in the previous version of the application.
	next();
	return;
};

app.options('/resource', cors());
app.post("/resource", cors(), getAccessToken, function(req, res){

	if (req.access_token) {
		res.json(resource);
	} else {
		res.status(401).end();
	}
	
});

var server = app.listen(9002, 'localhost', function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('OAuth Resource Server is listening at http://%s:%s', host, port);
});
 
