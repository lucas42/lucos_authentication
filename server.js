"strict mode";

var http = require('http'),
   https = require('https'),
   url = require('url'),
   querystring = require('querystring'),
   fs = require('fs');


var appkeys = {};
(function getAppKeys() {
	var file, appkeylist, ii, key;
	try {
		file = fs.readFileSync('appkeys.conf');
	} catch (e) {
		console.log("appkeys.conf could not be read");
		return;
	}
	appkeylist = file.toString().split("\n");
	for(ii in appkeylist) {
		key = appkeylist[ii].replace(/\s*(#|\/\/).*$/,'').trim();
		if (!key) continue;
		appkeys[key] = true;
	}
}());
function isTrusted(apikey) {
	if (!(apikey in appkeys)) return false;
	return appkeys[apikey];
}
function exit(errorstring, errornumber, showusage) {
	if (showusage) console.log("Usage: nodejs server.js port servicesdomain\n");
	console.log("Error: "+errorstring+"\n\n");
	process.exit(errornumber);
}
var port;
(function parseArgs() {
	port = parseInt(process.argv[2], 10);
	if (isNaN(port) || port <= 0) {
		exit("Port must be number greater than zero", 1, true);
	}
 })();

try {
	start_server(port);
} catch (e) {
	exit(e, 3);
}

function start_server(port) {
	var Provider = require('./classes/provider');
	var Auth = require('./classes/auth');


	http.ServerResponse.prototype.sendError = function sendError(code, message, headers) {
		try {
			if (this.finished) throw new Error("Response already finished.");
			if (!headers) headers = {};
			if (!('Content-Type' in headers)) headers['Content-Type'] = 'text/html';
			this.writeHead(code, headers);
			if (headers['Content-Type'] == 'text/html') this.write('<br/><strong>Error:</strong> '+message);
			else this.write(message);
			this.end();
		} catch (error) {
			console.error("Can't send error page: \"" + message + "\"");
			console.error(error);
		}
	};


	http.ServerResponse.prototype.sendFile = function sendFile(filename, mimetype, modifications) {
		var res = this;
		fs.readFile(filename, function(err, data) {
			if (err) res.sendError(500, 'File "'+filename+'" can\'t be read from disk');
			else {
				if (typeof modifications == 'function') data = modifications(data);
				res.writeHead(200, {'Content-Type': mimetype || 'text/html' });
				res.write(data);
				res.end();
			}
		});
	};

	http.createServer(function (req, res) {
		var url_parts = url.parse(req.url, true);
		var path = url_parts.pathname;
		var params = url_parts.query;
		var provider, auth, authurl, redirectparams, setcookie;
		var cookies = {};
		if (req.headers.cookie) {
			cookies = querystring.parse(req.headers.cookie, '; ');
		}

		switch (path) {
			case "/authenticate":
				
				// If the user has an auth_token cookie which is still valid, then just use it and don't bother authenticating
				// N.B: If re-authentication is required (e.g. to add another provider's token), then the service should send to user directly to /providers
				if (cookies.auth_token) {
					try {
						auth = Auth.getById(cookies.auth_token);
						if (params.redirect_uri || cookies.redirect_uri) auth.setRedirect(params.redirect_uri || cookies.redirect_uri);
						res.sendError(307, "Go back to service", {'Location': auth.getRedirect()});
						break;
					} catch (e) {
					}
				}
			
				if (!params.redirect_uri) res.sendError(404, "Redirect URI parameter required");
				redirectparams = querystring.stringify({
					redirect_uri: params.redirect_uri
				});
				
				// Store the redirect uri in the URL and cookies in case the client doesn't support cookies
				res.sendError(307, "Need to select a provider", {'Location': '/providers?'+redirectparams, 'Set-Cookie': redirectparams});
				break;
			case "/providers":
			
				if (!params.redirect_uri) res.sendError(404, "Redirect URI parameter required");
				else res.sendFile('providers.html', null, function (data) {
					var types, provider, provideroutput = '', ii, ll, providerparams;
					types = Provider.getTypes();
					for (ii=0, ll=types.length; ii<ll; ii++) {
						provider = new Provider(types[ii]);
						
						// If the redirect uri is in a cookie, then it doesn't need appending to the urls
						if (cookies.redirect_uri) {
							providerparams = querystring.stringify({
								type: types[ii]
							});
							
						// If not, add to the urls in case the client doesn't support cookies
						} else {
							providerparams = querystring.stringify({
								type: types[ii],
								redirect_uri: params.redirect_uri
							});
						}
						provideroutput += "<li><a href='/provider?"+providerparams+"'>";
						provideroutput += "<img src='/providerimg?"+providerparams+"' alt='"+provider.getName()+"'/>";
						provideroutput += "</a></li>";
					}
					return data.toString().replace('$providerList$', provideroutput);
				});
				break;
			case "/provider":
				if (!params.redirect_uri && !cookies.redirect_uri) res.sendError(404, "Redirect URI parameter required");
				
				try {
					provider = new Provider(params.type);
				} catch (e) {
					res.sendError(404, 'Provider not found');
				}
				try {
					auth = new Auth(provider, params.redirect_uri);
					auth.setRedirect(params.redirect_uri || cookies.redirect_uri);
					authurl = auth.getAuthUrl({
						redirect_uri: Provider.redirect_uri,
						response_type: 'code'
						}, params.scope);
						
					setcookie = querystring.stringify({
						redirect_uri: params.redirect_uri || cookies.redirect_uri
					});
					
					res.sendError(307, "Authenticate with provider", {'Location': authurl, 'Set-Cookie': setcookie});
				} catch (e) {
					res.sendError(500, "Error getting provider data");
					console.error(e);
				}
				break;
			case "/providercallback":
				try {
					auth = Auth.getById(params.state);
				} catch (e) {
					res.sendError(410, "Auth Timed Out <a href=\"/providers\">Retry</a>");
					break;
				}
				auth.setCode(params.code);
				
				// If the user has a redirect_uri cookie, this value should overwrite whatever is on the server
				if (params.redirect_uri) auth.setRedirect(params.redirect_uri);
				
				// Store a cookie so that auth doesn't need to be done next time
				setcookie = querystring.stringify({
					auth_token: auth.getId()
				});
				res.sendError(307, "Go back to service", {'Location': auth.getRedirect(), 'Set-Cookie': setcookie});
				
				// Begin the requests for finding agentids so that /data dosen't have to wait so long later
				auth.getAgentId();
				break;
			case "/data":
				if (!params.token) {
					res.sendError(404, "Token required");
					break;
				}
				var trusted = isTrusted(params.apikey);
				try {
					auth = Auth.getById(params.token);
				} catch (e) {
					res.sendError(401, JSON.stringify({"error": "Auth Timed Out"}), {'Content-Type': "application/json"});
					break;
				}
				auth.getData(function (data) {
					res.writeHead(200, {'Content-Type': "application/json"});
					res.write(JSON.stringify(data));
					res.end();
				}, trusted);
				break;
			case "/whoami":
				try {
					auth = Auth.getById(cookies.auth_token);
					auth.getAgentId(function (agentid) {
						res.writeHead(200, {'Content-Type': "application/json", "Access-Control-Allow-Origin": req.headers.origin, "Access-Control-Allow-Credentials": true, "Vary": "Access-Control-Allow-Origin"});
						res.write(JSON.stringify({agentid: agentid}));
						res.end();
					});
				} catch (e) {
					res.writeHead(200, {'Content-Type': "application/json", "Access-Control-Allow-Origin": req.headers.origin, "Access-Control-Allow-Credentials": true, "Vary": "Access-Control-Allow-Origin"});
					res.write(JSON.stringify({agentid: null}));
					res.end();
				}
				break;
			case "/apptoken":
				var trusted = isTrusted(params.apikey);
				if (!trusted) {
					res.sendError(403, "Permission denied");
					break;
				}
				try {
					provider = new Provider(params.type);
				} catch (e) {
					res.sendError(404, 'Provider not found');
					break;
				}
				provider.getAppToken(function (data) {
					res.writeHead(200, {'Content-Type': "application/json"});
					res.write(JSON.stringify({
						access_token: data,
						client_id: provider.getClientId()
					}));
					res.end();
				});
				break;
			case "/favicon.ico":
				res.sendFile('img/favicon.ico', 'image/png');
				break;
			case "/robots.txt":
				res.sendFile('robots.txt', 'text/plain');
				break;
			case "/providerimg":
				try {
					provider = new Provider(params.type);
				} catch (e) {
					res.sendError(404, 'Provider not found');
				}
				res.sendFile('img/providers/'+params.type+'.png', 'image/png');
				break;
			case "/":
			
				// For now, redirect homepage to /authenticate
				res.sendError(302, "File has moved", {'Location': '/authenticate'});
				break;
			default:
				res.sendError(404, 'File not found');
				break;
		}
	}).listen(port);
	console.log('Server running at http://127.0.0.1:'+port+'/');
}
