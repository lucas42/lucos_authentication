const request = require('request');


/**
 * Gets the lucos agentId for a given provider and user Id
 */
function fetchAgentId(accountType, userid, callback) {
	const domain = "contacts.l42.eu";
	const url = `https://${domain}/identify?type=${accountType}&userid=${userid}`;
	console.log(`Fetch agent id from contacts service ${url}`);
	request({
		url,
		followRedirect: false
	}, function (error, response, body) {
		var data;
		if (response && response.headers.location) data = response.headers.location.split('/').pop();
		if (error || (response && response.statusCode >= 400) || isNaN(data)) data = null;
		if (!data) console.error(`Failed to get agent from contacts service.  ${error}`);
		callback(data);
	});
}

module.exports = {
	fetchAgentId,
}