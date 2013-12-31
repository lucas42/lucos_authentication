"strict mode";
var request = require('request');

var hosts = {};
var hosts_url = "";

function setDomain(services_domain) {	
	hosts_url = "http://"+services_domain+"/api/hosts";
}

function getHost(id) {
	return hosts[id];
}

function updateHosts(callback) {
	request({
			url: hosts_url
		}, function (error, response, body) {
			if (error) {
				throw "Cannot get hosts data from "+hosts_url+"\n"+error;
			}
			try {
				hosts = JSON.parse(body);
			} catch (e) {
				throw "Cannot parse hosts JSON: "+body;
			}
			callback();
		});
}

module.exports = {
	get: getHost,
	update: updateHosts,
	setDomain: setDomain,
}