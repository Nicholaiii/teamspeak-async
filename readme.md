# Teamspeak-Async
### A node library to interface the ServerQuery protocol on your Teamspeak Server.

## Usage
Targets Node `>= 7.6` and uses async/await. Transpile with Babel for older versions.

If provided with user and password, it will automatically authenticate on the server, and unless specified otherwise, it will `use 1` and register for `server` notifications.
This default is sensible for most users, but if you want to use another server, you can pass the option not to, same goes for registering for  `server` notifications.

```js
/* If using Babel, you can of course import it instead */
const TeamSpeakClient = require('teamspeak-async').TeamSpeakClient
const client = new TeamSpeakClient({host: 'example.com'})

async function getClientNames(){
	let clients = await client.send('clientlist')
	return clients.map(client => return client.client_nickname)
}

/* Print names of everyone online */
getClientNames()
  .then(names => {
    names.map(name => console.log(name))
  })

/* Make everyone online hate you */
client.send('clientlist').then(clients => {
  clients.map(user => client.send('clientpoke', {clid:user.clid, msg:`Hello ${user.client_nickname}`}))
})
```

I recommend using the [module config](https://www.npmjs.com/package/config), that enables a project-global config, with many great features like JSON5 support.

```js
/* config example */
const config = require('config')
const TeamSpeakClient = require('teamspeak-async').TeamSpeakClient
const client = new TeamSpeakClient(config.teamspeak) /* or: config.get('teamspeak') */
```

Options:
- host: IP or Hostname for Teamspeak server - **required**
- port: Port for ServerQuery, default `10011` - *optional*
- user: Username to authenticate with - *optional*
- password: Password to authenticate with - *optional*
- server: Server ID to select, default `1` - *optional*
- disableUse: Disables automatically using server, default `false` - *optional*
- disableRegister: Disables registering for `server` notifications, default `false` - *optional*

Methods:
- send(command, params): Send a request to the ServerQuery
- authenticate(user, password): Authenticate on your server
- register(event): Registers for an event
- use(server): Use a particular server

## Contributions
Feel free to contribute to this repo. Just send a PR.

TODO:
- Webpack instead of Babel, with uglify et al.
- Unit tests with AVA
- Linting with XO

## Acknowledgements
Parsing of lines largely based on xbenjii/Teamspeak, the module that inspired me to create a modernised async Teamspeak ServerQuery client.

`class Queue` based on Queue.js by Stephen Morley
