/**
 * Gets the lucos agentId for a given provider and user Id
 */
async function fetchAgentId(accountType, userid, callback) {
	const domain = "contacts.l42.eu";
	const url = `https://${domain}/identify?type=${accountType}&userid=${userid}`;
	console.log(`Fetch agent id from contacts service ${url}`);
	try {
		const response = await fetch(url, { redirect: "manual" });
		const agentid = response.headers.get("Location").split('/').pop();
		console.log(`Received agentid ${agentid}`);
		if (isNaN(agentid)) throw `agentid is not a number.  "${agentid}"`;
		callback(agentid);
	} catch (error) {
		console.error(`Failed to get agent from contacts service.  ${error}`);
		callback(null);
	}
}

module.exports = {
	fetchAgentId,
}