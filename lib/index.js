'use strict';
/**
 * Teamspeak-async
 * written by Nicholai Nissen
 * MIT licensed
 */

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.TeamSpeakClient = undefined;

var _events = require('events');

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _byline = require('byline');

var _byline2 = _interopRequireDefault(_byline);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _request = require('./request');

var _request2 = _interopRequireDefault(_request);

var _queue = require('./queue');

var _queue2 = _interopRequireDefault(_queue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class TeamSpeakClient extends _events.EventEmitter {
	// eslint-disable-line import/prefer-default-export
	constructor({ host, port, user, password, server, disableUse, disableRegister }) {
		super(_events.EventEmitter);

		this.debug = (0, _debug2.default)('TeamSpeakClient');

		this.debug('Trying to create new client with information: %o', { host, port, user, password });

		if (!host || !port) {
			throw new Error('Cannot create instance without ' + !host ? port ? 'host' : 'host and port ' : 'port');
		}

		this.host = host;
		this.port = port || 10011;
		this.user = user;
		this.password = password;
		this.server = server || 1;
		this.disableRegister = disableRegister;
		this.disableUse = disableUse;

		this.debug('Connecting to %s:%s', host, port);
		this.socket = _net2.default.connect({ host, port });

		this._connection = {};
		this._connection.promise = new _bluebird2.default((resolve, reject) => {
			this._connection.resolve = resolve;
			this._connection.reject = reject;
		});

		this.socket.on('connect', reportConnection.bind(this));
		this.socket.on('error', err => this.emit('error', err));

		this.queue = new _queue2.default();
		this.lineCount = 0;
		this.processing = null;

		function reportConnection() {
			this._connection.resolve();
			this.debug('Socket connected');
			this.reader = _byline2.default.createStream(this.socket, { encoding: 'utf-8', keepEmptyLines: false });
			this.reader.on('data', this.readLine.bind(this));
			/* If username and password is supplied during creation, authenticate now */
			if (this.user && this.password) {
				selfAuth.apply(this);
			}
		}
		async function selfAuth() {
			try {
				await this.authenticate(this.user, this.password);
				this.debug('Self-Authenticated');
				if (!this.disableUse) {
					await this.use(this.server);
					this.debug('Self-Using server %d', this.server);
				}
				if (!this.disableRegister) {
					await this.register('server');
					this.debug('Self-registered for server');
				}
			} catch (err) {
				console.error('Teamspeak Authentication error');
				console.error(err);
			}
		}
	}

	send(command, params) {
		this.debug('Enqueuing c:: %s \np:: %s', command, params);
		const request = new _request2.default(command, params);
		this.queue.enqueue(request);
		this.parseQueue();
		return request.promise;
	}

	use(server) {
		return this.send('use', server);
	}

	authenticate(username, password) {
		return this.send('login', [username, password]);
	}

	register(e) {
		return this.send('servernotifyregister', { event: e });
	}

	poke(clid, msg) {
		return this.send('clientpoke', { clid, msg });
	}

	parseQueue() {
		if (Boolean(this.processing) || this.queue.isEmpty()) {
			this.debug(`Skipping parsing. \np::${Boolean(this.processing)} q::${this.queue.isEmpty()}`);
			return null;
		}
		this.processing = this.queue.dequeue();
		this.debug('Writing request :: %s', this.processing.request);
		this.socket.write(this.processing.request + '\n');
	}

	readLine(line) {
		this.lineCount++;
		this.debug('#%d Receiving line :: %s', this.lineCount, line);
		line = line.trim();
		/* Skip greetings */
		if (this.lineCount < 3) {
			this.debug('Skipping handling of greeting #%d', this.lineCount);
			return;
		}

		if (line.indexOf('error') === 0) {
			/* Request done, status message */
			this.debug('#%d Line is status message', this.lineCount);
			const response = parseResponse(line);
			if (response.error && response.msg !== 'ok') {
				this.debug('#%d Carries error %o', this.lineCount, response.error);
				this.processing.done(response);
			} else {
				if (!this.processing._response) {
					this.processing._response = response;
				}
				this.processing.done();
			}
			this.debug('#%d Processing line done', this.lineCount);
			/* Clear processing state regardless of error or success */
			this.processing = null;
			/* Take another piece of the cake, if any left */
			if (!this.queue.isEmpty()) {
				this.debug('Restarting queue');
				this.parseQueue();
			}
		} else if (line.indexOf('notify') === 0) {
			/* Incoming server notification */
			this.debug('#%d Line is notification', this.lineCount);

			const notification = line.substr('notify'.length);
			const type = notification.substr(notification, notification.indexOf(' '));

			this.debug('#%d Emitting event type %s and *', this.lineCount, type);
			this.emit(type, parseResponse(line));
			this.emit('*', parseResponse(line));
		} else if (this.processing) {
			/* Actual response, not status message ,which in teamspeak for some reason goes localhost */
			this.processing._response = parseResponse(line);
			this.debug('#%d Line is response :: %s', this.lineCount, this.processing._response);
		}
	}
	/* End of class */
}

exports.TeamSpeakClient = TeamSpeakClient; /**
                                            * Unescapes a string that has been escaped by Teamspeak.
                                            * @param	{String} string String returned by ServerQuery
                                            * @return {String}				Plain string
                                            */

function unescape(string) {
	return string.replace(/\\s/g, ' ').replace(/\\p/, '|').replace(/[\\]/g, '$&');
}

function parseResponse(data) {
	const parsed = data.split('|').map(group => {
		return group.split(' ').reduce((obj, val) => {
			const [k, v] = val.split('=');
			obj[k] = v ? unescape(v) : '';
			return obj;
		}, {});
	});
	if (parsed.length === 1) {
		return parsed[0];
	}
	return parsed;
}