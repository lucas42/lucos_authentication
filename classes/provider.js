"strict mode";
const url = require('url'),
   querystring = require('querystring');


// TODO: Get the domain from the host header?
var redirect_uri = 'https://auth.l42.eu/providercallback';

var Provider = (function () {
	var list = {}, providers;
	
	// Actual constructor is private so that providers aren't created outside this scope
	function Provider (name, auth_url, clientid, clientsecret, scope, accountType, token_host, token_path, userinfoendpoint) {
		this.getName = function () {
			return name;
		};
		this.getAuthUrl = function (params, extra_scope) {
			var key, url_parts;
			url_parts = url.parse(auth_url, true);
			for (key in params) {
				url_parts.query[key] = params[key];
			}
			url_parts.query.client_id = clientid;
			url_parts.query.scope = scope;
			if (extra_scope) url_parts.query.scope += " "+extra_scope;
			
			return url.format(url_parts);
		};
		
		/**
		 * Returns the id for the accountType in lucOS contacts
		 */
		this.getAccountType = function () {
			return accountType;
		}
		async function getToken(rawformdata, callback) {
			const url = "https://"+token_host+token_path;
			const formdata = new FormData();
			for (const key in rawformdata) {
				formdata.append(key, rawformdata[key]);
			}
			try {
				const response = await fetch(url, {method: 'POST', body: formdata});
				const contenttype = response.headers.get('content-type').replace(/;.*/,'');
				let data;
				switch (contenttype) {
					case "application/json":
						data = await response.json();
						break;
					case "text/plain":
						const body = await response.text();
						data = querystring.parse(body);
						break;
					default:
						throw "Unknown content-type "+contenttype;
				}
				if (data.access_token) callback(data.access_token);
				else console.error("No access token", data);
			} catch (error) {
				console.error(`Can't request ${url}`);
				console.error(error);
				return;
			}
		}
				
		this.getToken = function(code, callback) {
			getToken({
				code: code,
				client_id: clientid,
				client_secret: clientsecret,
				redirect_uri: redirect_uri,
				grant_type: 'authorization_code'
			}, callback);
		}
		this.getAppToken = function(callback) {
			getToken({
				client_id: clientid,
				client_secret: clientsecret,
				redirect_uri: redirect_uri,
				grant_type: 'client_credentials'
			}, callback);
		}
		this.getClientId = function () {
			return clientid;
		}
		this.getUserId = async function (token, callback) {
			const url = userinfoendpoint + "?access_token=" + encodeURIComponent(token)
			const response = await fetch(url);
			const data = await response.json();
			callback(data.id, {name: data.name, username: data.username});
		};
	}
	

	(function loadProviders() {
		var file, providerlist, key, conf, provider;
		var fs = require('fs');
		try {
			file = fs.readFileSync('/etc/authconfig/providers.json');
		} catch (e) {
			console.error("/etc/authconfig/providers.json could not be read: "+e);
			return;
		}
		providerlist = JSON.parse(file.toString());
		for(key in providerlist) {
			conf = providerlist[key];
			provider = new Provider(conf.name, conf.auth_url, conf.clientid, conf.clientsecret, conf.scope, key, conf.token_host, conf.token_path, conf.userinfoendpoint);
			list[key] = provider;
		}
	}());

	// Create a dummy constructor which just returns a previously constructed object
	function DummyProvider(type) {
		if (!(type in list)) throw "Unknown Provider type";
		return list[type];
	}
	DummyProvider.getTypes = function() {
		var type, types = [];
		for (type in list) types.push(type);
		return types;
	}
	return DummyProvider;
})();
Provider.redirect_uri = redirect_uri;
module.exports = Provider;
