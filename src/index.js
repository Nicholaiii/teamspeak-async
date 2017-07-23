'use strict'
/**
 * teamspeak-async
 * written by Nicholai Nissen
 * MIT licensed
 */

import { EventEmitter } from 'events'
import debug from 'debug'
import net from 'net'

import byline from 'byline'
import Promise from 'bluebird'

import Request from './request'
import Queue from './queue'

export class TeamSpeakClient extends EventEmitter {
  constructor ({host, port, user, password, server, disableUse, disableRegister}) {
    super(EventEmitter)

    this.debug = debug('TeamSpeakClient')

    this.debug('Trying to create new client with information: %o', {host:host, port:port, user:user, password:password})

    if(!host || !port) {
      throw new Error('Cannot create instance without ' + !host ? (!port ? 'host and port ' : 'host') : 'port')
    }

    this.host = host
    this.port = port || 10011
    this.user = user
    this.password = password
    this.server = server || 1
    this.disableRegister = disableRegister
    this.disableUse = disableUse

    this.debug('Connecting to %s:%s', host, port)
    this.socket = net.connect({host, port})

    this._connection = {}
    this._connection.promise = new Promise((resolve, reject) => {
      this._connection.resolve = resolve
      this._connection.reject = reject
    })

    this.socket.on('connect', reportConnection.bind(this))
    this.socket.on('error', err => this.emit('error', err))

    this.queue = new Queue()
    this.lineCount = 0
    this.processing = null

    function reportConnection(){
      this._connection.resolve()
      this.debug("Socket connected")
      this.reader = byline.createStream(this.socket, {encoding: 'utf-8', keepEmptyLines: false})
			this.reader.on('data', this.readLine.bind(this))
      /* If username and password is supplied during creation, authenticate now*/
      if(this.user && this.password){
        selfAuth.apply(this)
      }
    }
    async function selfAuth(){
      try {
        await this.authenticate(this.user, this.password)
        this.debug("Self-Authenticated")
        if(!this.disableUse){
          await this.use(this.server)
          this.debug("Self-Using server %d", this.server)
        }
        if(!this.disableRegister){
          await this.register('server')
          this.debug("Self-registered for server")
        }
      } catch(error) {
        console.error("Teamspeak Authentication error")
        console.error(err)
      }
    }
  }

  send(command, params){
    this.debug("Enqueuing c:: %s \np:: %s", command, params)
    let request = new Request(command, params)
    this.queue.enqueue(request)
    this.parseQueue()
    return request.promise
  }

  use(server){
    return this.send('use', server)
  }

  authenticate(username, password) {
    return this.send('login', [username, password])
  }

  register(e){
    return this.send('servernotifyregister', {event: e})
  }

  parseQueue(){
    if(!!this.processing || this.queue.isEmpty()) {
      this.debug(`Skipping parsing. \np::${!!this.processing} q::${this.queue.isEmpty()}`)
      return null
    }
    this.processing = this.queue.dequeue()
    this.debug("Writing request :: %s", this.processing.request)
    this.socket.write(this.processing.request+'\n')
  }

  readLine(line){
    this.lineCount++
    this.debug("#%d Receiving line :: %s", this.lineCount, line)
    line = line.trim()
    /* Skip greetings */
    if(this.lineCount < 3){
      this.debug("Skipping handling of greeting #%d", this.lineCount)
      return
    }

    if(line.indexOf("error") === 0){
      /* Request done, status message */
      this.debug("#%d Line is status message", this.lineCount)
      let response = parseResponse(line)
      if(response.error && response.msg !== 'ok') {
        this.debug('#%d Carries error %o', this.lineCount, response.error)
        this.processing.done(response)
      } else {
        if(!this.processing._response) {
          this.processing._response = response
				}
        this.processing.done()
      }
      this.debug("#%d Processing line done", this.lineCount)
      /* Clear processing state regardless of error or success */
      this.processing = null
      /* Take another piece of the cake, if any left */
      if(!this.queue.isEmpty()) {
        this.debug("Restarting queue")
        this.parseQueue()
      }

    } else if(line.indexOf("notify") === 0) {
      /* Incoming server notification */
      this.debug("#%d Line is notification", this.lineCount)

      const notification = line.substr('notify'.length)
      const type = notification.substr(notification, notification.indexOf(" "))

      this.debug("#%d Emitting event type %s and *", this.lineCount, type)
			this.emit(type, parseResponse(line))
			this.emit('*', parseResponse(line))
    } else if(this.processing) {
      /* Actual response, not status message ,which in teamspeak for some reason goes localhost */
      this.processing._response = parseResponse(line)
      this.debug("#%d Line is response :: %s", this.lineCount, this.processing._response)
    }

  }
  /* end of class */
}


/**
 * Unescapes a string that has been escaped by Teamspeak.
 * @param  {String} string String returned by ServerQuery
 * @return {String}        Plain string
 */
function unescape(string) {
  	return string.replace(/\\s/g, ' ')
		.replace(/\\p/, '|')
		.replace(/[\\]/g, '$&')
}


function parseResponse (data) {
  const parsed = data.split('|').map(group => {
    return group.split(' ').reduce((obj, val) => {
        let [k, v] = val.split('=')
        obj[k] = v ? unescape(v) : ''
        return obj
    	}, {})
  	})
  	if(parsed.length === 1) {
  		return parsed[0]
  	}
  	return parsed
}