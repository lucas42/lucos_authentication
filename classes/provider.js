"strict mode";
var request = require('request'),
   url = require('url'),
   querystring = require('querystring');


var redirect_uri = 'http://'+require('./hosts').get('auth')+'/providercallback';

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
		function getToken(querydata, callback) {
			request({
				url: "https://"+token_host+token_path,
				method: 'POST',
				form: querydata
			}, function (error, response, body) {
				if (error) {
					console.error("Can't request https://"+token_host+token_path);
					console.error(error);
					return;
				}
				var contenttype = response.headers['content-type'].replace(/;.*/,'');
				data=null;
				switch (contenttype) {
					case "application/json":
						data = JSON.parse(body);
						break;
					case "text/plain":
						data = querystring.parse(body);
						break;
					default:
						throw "Unknown content-type "+contenttype;
				}
				if (data.access_token) callback(data.access_token);
				else console.error("No access token", data);
			});
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
		this.getUserId = function (token, callback) {
			request({
				url: userinfoendpoint,
				qs: {
					access_token: token
				}
			}, function (error, response, body) {
				var data = JSON.parse(body);
					callback(data.id, {name: data.name, username: data.username});
			});
	};
	}
	

	(function loadProviders() {
		var file, providerlist, key, conf, provider;
		var fs = require('fs');
		try {
			file = fs.readFileSync('providers.json');
		} catch (e) {
			console.error("providers.json could not be read: "+e);
			return;
		}
		providerlist = JSON.parse(file.toString());
		for(key in providerlist) {
			conf = providerlist[key];
			provider = new Provider(conf.name, conf.auth_url, conf.clientid, conf.clientsecret, conf.scope, conf.accountType, conf.token_host, conf.token_path, conf.userinfoendpoint);
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