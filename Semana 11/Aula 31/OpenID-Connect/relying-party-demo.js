const express = require('express')
const app = express()
var request = require('request');
// more info at:
// https://github.com/auth0/node-jsonwebtoken
// https://jwt.io/#libraries
var jwt = require('jsonwebtoken');

const port = 3001

// system variables where RP credentials are stored
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET


console.log(CLIENT_ID)
console.log(CLIENT_SECRET)


app.get('/', (req, resp) => {
    resp.send('<a href=/login>Use Google Account</a>')
})

// More information at:
//  https://developers.google.com/identity/protocols/OpenIDConnect

app.get('/login', (req, resp) => {
    resp.redirect(302,
    // authorization endpoint
    'https://accounts.google.com/o/oauth2/v2/auth?'
    // client id
    + 'client_id='+ CLIENT_ID +'&'
    // scope "openid email"
    + 'scope=openid%20email&'
    // parameter state should bind the user's session to a request/response
    + 'state=some-id-based-on-user-session&'
    // response_type for "authorization code grant"
    + 'response_type=code&'
    // redirect uri used to register RP
    + 'redirect_uri=http://localhost:3001/googlecallback')
})

app.get('/googlecallback', (req, resp) => {
    //
    // TODO: check if *state* is correct for this session

    console.log('making request to token endpoint')
    // https://www.npmjs.com/package/request#examples
    // content-type: application/x-www-form-urlencoded (URL-Encoded Forms)
    request
        .post(
            { 
                url: 'https://www.googleapis.com/oauth2/v3/token',
                // body parameters
                form: {
                    code: req.query.code,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    redirect_uri: 'http://localhost:3001/googlecallback',
                    grant_type: 'authorization_code'
                }
            }, 
            function(err, httpResponse, body){
                //
                // TODO: check err and httpresponse

                var json_response = JSON.parse(body);
                // decode does not check signature
                var jwt_payload = jwt.decode(json_response.id_token)

                console.log(body);
                console.log(jwt_payload);

                resp.send(
                    // send code and id_token to user-agent, *just* for this demo/debug
                      '<div> callback with code = ' + req.query.code + '</div>'
                    + '<div> id_token = ' + json_response.id_token + '</div>'
                    // use 'email' claim from id_token
                    + '<div> Olá <b>' + jwt_payload.email + '</b> </div>'
                );    
            }
        );
})

app.listen(port, (err) => {
    if (err) {
        return console.log('something bad happened', err)
    }
    console.log(`server is listening on ${port}`)
})
