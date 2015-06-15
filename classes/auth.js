"strict mode";
var request = require('request'),
   url = require('url');
var Auth = (function () {
	var listauth = {};
	
	function Auth(provider, local_redirect_uri) {
		var timeout, id, code, token, userid, userinfo, agentid, gettingagentid = false, agentidcallbacks = [];
		id = _getUniqueId();
		token = null;
		agentid = null;
		listauth[id] = this;
		/**
		 * Resets the amount of time before this auth object expires
		 */
		this.touch = function () {
			if (timeout) clearTimeout(timeout);
			timeout = setTimeout(function () { delete listauth[id]; }, 7 * 24 * 60 * 60 * 1000);
		}
		this.touch();
		
		this.getAuthUrl = function (params, extra_scope) {
			params.state = id;
			return provider.getAuthUrl(params, extra_scope);
		};
		
		// Local redirect URI is stored on the server as a fallback for clients without cookies
		this.setRedirect = function (newlocal_redirect_uri) {
			local_redirect_uri = newlocal_redirect_uri;
		}
		this.getRedirect = function () {
			var url_parts;
			url_parts = url.parse(local_redirect_uri, true);
			
			// .search overwrites .query which can cause problems if there's already a token param
			delete url_parts.search;
			url_parts.query.token = id;
			return url.format(url_parts);
		}
		this.getId = function () {
			return id;
		}
		this.setCode = function (newcode) {
			code = newcode;
		};
		this.getAgentId = function (callback) {
			if (typeof callback == 'function') agentidcallbacks.push(callback);
			
			// Only let getagentid be run once at a time per Auth object
			if (gettingagentid) return;
			gettingagentid = true;
			_getAgentId();
			
			function _getAgentId() {
				function _callCallbacks(success) {
					var callbackparam = (success)?agentid:null;
					gettingagentid = false;
					while (agentidcallbacks.length) {
						(agentidcallbacks.shift())(callbackparam);
					}
					
				}
				if (agentid) {
					_callCallbacks(true);
				} else if (userid) {
					_fetchAgentId(userid, function (newagentid) {
						agentid = newagentid;
						if (agentid) _getAgentId();
						else _callCallbacks(false);
					});
				} else if (token) {
					provider.getUserId(token, function (newuserid, newuserinfo) {
						userid = newuserid;
						userinfo = newuserinfo;
						if (userid) _getAgentId();
						else _callCallbacks(false);
					});
					
				} else if (code) {
					provider.getToken(code, function (newtoken) {
						token = newtoken;
						if (token) _getAgentId();
						else _callCallbacks(false);
					});
				} else {
					_callCallbacks(false);
				}
			}
				
		}
		this.getData = function(callback, trustedSource) {
			this.getAgentId(function () {
				var data = userinfo;
				if (trustedSource) data.token = token;
				data.id = agentid;
				callback(data);
			});
		}
		
		function _fetchAgentId(userid, callback) {
			var domain = require('./hosts').get("contacts");
			request({
				url: "http://"+domain+"/identify",
				qs: {
					type: provider.getAccountType(),
					id: userid,
				},
				followRedirect: false
			}, function (error, response, body) {
				var data;
				if (response && response.headers.location) data = response.headers.location.split('/').pop();
				if (error || (response && response.statusCode >= 400) || isNaN(data)) data = null;
				callback(data);
			});
		}
	}
	
	Auth.getById = function(id) {
		var auth;
		if (!listauth.hasOwnProperty(id)) throw "Auth expired";
		auth = listauth[id];
		auth.touch();
		return auth;
	}
	
	/**
	 * Returns an Id which isn't already being used
	 */
	function _getUniqueId() {
		var id = Math.floor(Math.random()*1000000);
		if (id in listauth) return _getUniqueId();
		return id;
	}
	return Auth;
})();
module.exports = Auth;
