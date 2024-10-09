# lucos auth
Authentication for lucos services

## Dependencies
* docker
* docker-compose

## Setup
Two config files are used to run lucos_auth, both should be placed in a docker volume named `lucos_authentication_config` (This gets mounted in the container at `/etc/authconfig`)
### providers.json
A json file which contains data about various authentication providers.  This should be in the form of an object, where the keys are unique ids for each provider matching the account types used by lucos_contacts and the value is an object of key/value pairs about the provider.  The following fields are accepted:
* **name**: The name of the provider (user facing)
* **auth_url**: The url for the provider's oauth2 endpoint
* **clientid**: The id used by the lucos app with that provider
* **clientsecret**: The secret used by the lucos app with that provider
* **scope**: The scope of information request from provider (optional, depending on provider)
* **token_host**: The domain of the provider's endpoint for requesting tokens
* **token_path**: The path of the provider's endpoint for requesting tokens
* **userinfoendpoint**: The endpoint for identifying the current user from the provider

### appkeys.conf
This file consists of a newline separated list of keys which can be used by other modules which request sensitive data from the authentication service (eg tokens for third party services).  Modules which don't have any apikey can still use the authentication service, but won't be privy to any of this information.

The application should continue to run if appkeys.conf is missing, with no sensitive data returned to services callling it.

## Running
`docker-compose up -d`

## Building
The build is configured to run in Dockerhub when a commit is pushed to the `main` branch in github.