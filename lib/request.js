'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
class Request {
  constructor(command, params) {

    this.promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    this.command = command;
    this.params = params;
    this._response = null;
    this.request = buildRequest(command, params);
  }

  done(err = null) {
    if (!!err) {
      return this._reject(err);
    }
    return this._resolve(this._response);
  }
}

exports.default = Request; /**
                            * Escapes a string into TeamSpeak Server Query specifications
                            * http://media.teamspeak.com/ts3_literature/TeamSpeak%203%20Server%20Query%20Manual.pdf
                            * @param  {String|Number} string Some string or Number
                            * @return {String}        Escaped string
                            */

function escape(string) {
  return ('' + string).replace(/[\\\/\n\r\t\v\f]/g, '\\$&').replace(/\|/g, '\\p').replace(/ /g, '\\s');
}

function buildRequest(command, params = '') {
  if (typeof params === 'string' || typeof params === 'number') {
    return `${escape(command)} ` + escape(params);
  } else if (Array.isArray(params)) {
    return `${escape(command)} ` + spreadArray(params);
  } else if (typeof params === 'object') {
    return `${escape(command)} ` + spreadArray(Object.keys(params).map(key => {
      if (Array.isArray(params[key])) {
        return pipeArray(pairArray(params[key], key));
      }
      return valuePair(key, params[key]);
    }));
  }
}

function spreadArray(array) {
  return array.join(' ');
}

function pipeArray(array) {
  return array.join('|');
}

function pairArray(array, prop) {
  return array.map(value => valuePair(prop, value));
}

function valuePair(prop, value) {
  return `${escape(prop)}=${escape(value)}`;
}