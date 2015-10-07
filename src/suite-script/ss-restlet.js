'use strict';
var database = require('../database'),
    ssValidate = require('./utils/ss-validate'),
    should = require('should');

/**
 * RESTlet Function idea from Netsuite API.
 *
 * @param opt {{
 *    name: String,
  *   files: [String],
  *   params: Object,
  *   funcs: {
  *     [post]: String,
  *     [get]: String,
  *     [delete]: String,
  *     [put]: String
  *   }
 * }}
 */
module.exports = (opt, cb) => {
    if (!opt || !opt.files || opt.files.length === 0) return;

    if (!opt.funcs) {
        return ssValidate.throwError('principal functions not def: "opt.funcs"');
    }

    let funcs = Object.keys(opt.funcs);
    if (!funcs || funcs.length === 0) {
        return ssValidate.throwError('principal functions was empty: "opt.funcs"');
    }

    // save reference
    let context = database.createScript({
        type: 'restlet',
        name: opt.name,
        funcs: opt.funcs,
        files: opt.files,
        params: opt.params
    });

    for (let i=0; i<funcs.length; i++) {
        let method = funcs[i].toLowerCase();
        if (~['post', 'get', 'delete', 'put'].indexOf(method)) {
            ssValidate.principalFunction(opt.funcs, method, context);
        } else {
            should(method).be.equal(null, `invalid method ${method}}`);
        }
    }

    return cb && cb(context);
};