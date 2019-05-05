# lucos auth
Authentication for lucos services

## Dependencies
* docker

## Setup
Two config are required to run lucos_auth, both should be placed in a docker volume mounted in the container at `/etc/authconfig`
### providers.json
A json file which contains data about various authentication providers.  This should be in the form of an object, where the keys are unique ids for each provider and the value is an object of key/value pairs about the provider.  The following fields are accepted:
* **name**: The name of the provider (user facing)
* **auth_url**: The url for the provider's oauth2 endpoint
* **clientid**: The id used by the lucos app with that provider
* **clientsecret**: The secret used by the lucos app with that provider
* **scope**: The scope of information request from provider (optional, depending on provider)
* **accountType**: The id of the provider's corresponding account type in lucos_contacts
* **token_host**: The domain of the provider's endpoint for requesting tokens
* **token_path**: The path of the provider's endpoint for requesting tokens
* **userinfoendpoint**: The endpoint for identifying the current user from the provider

### appkeys.conf
This file consists of a newline separated list of keys which can be used by other modules which request sensitive data from the authentication service (eg tokens for third party services).  Modules which don't have any apikey can still use the authentication service, but won't be privy to any of this information.

## Running
The web server is designed to be run within lucos_services, but can be run standalone by running server.js with nodejs, passing in the port to run on as the first parameter.

## Running
`docker run -d -p 8006:8080 --name authentication --mount source=authconfig,target=/etc/authconfig lucas42/lucos_authentication`
