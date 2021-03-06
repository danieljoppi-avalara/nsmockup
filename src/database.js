'use strict';
var vmSim = require('./vm-sim'),
    srvconf = require('./server/server-config'),
    URI = srvconf.URI,
    fs = require('fs'),
    low = require('lowdb'),
    storage = require('lowdb/file-sync');

// Default nsmockup directory
const NS_DIR = '.nsmockup';

exports.load = (cb) => {
    let nsDir = NS_DIR,
        //baseDir = nsDir + '/temp-' + (new Date().toJSON().replace(/[-:Z]/g, '')),
        baseDir = nsDir + '/base',
        cabinetDir = baseDir + '/cabinet',
        dbDir = baseDir + '/db';

    // create directories
    [nsDir, baseDir, cabinetDir, dbDir].forEach(f => {
        !fs.existsSync(f) && fs.mkdirSync(f);
    });

    let dbFile = dbDir + '/db.json';

    // create JSON database
    !fs.existsSync(dbFile) && fs.writeFileSync(dbFile, '{}');

    let db = low(dbFile, { storage }, false);

    let change = false;
    // create default collections
    ['__metadata', '__scripts'].forEach(c => {
        if (!db.object[c]) {
            db.object[c] = [];
            !change && (change = true);
        }
    });
    try {
        change && db.write();
    } catch (e) {
        console.error(e);
    }

    db.$path = baseDir;
    db.$pathDB = dbDir;
    db.$pathCabinet = cabinetDir;

    // HashMap for SuiteScripts
    db.$scripts = {};

    global.$db = db;
    if (cb) return cb(db);
    else return db;
};

/**
 * Create a SuiteScript in new context and add his reference in database.
 *
 * @param data {{
 *    id: number,
 *    code: string,
 *    name: string,
 *    type: string,
 *    deployment: string,
 *    files: [string | [string]],
 *    params: {}
 * }}
 */
exports.createSuiteScript = (data) => {
    if (!data || !data.type) {
        throw new Error('Not found type of SuiteScript');
    }
    if (!~['suitelet', 'restlet', 'schedule', 'user-event'].indexOf(data.type.toLowerCase())) {
        throw  new Error(`Invalid type of SuiteScript: ${data.type}`);
    } else {
        data.type = data.type.toLocaleLowerCase();
    }

    let scripts = $db('__scripts');
    if (!data.id) data.id = (scripts.size() + 1);

    data.uri = URI[data.type]; // only suitelet and restlet
    if (data.uri) {
        data.url = `http://localhost:${srvconf.port}${data.uri}?script=${data.id}&deploy=1`;
    }

    // create script in other context
    let context = vmSim.importSuiteScript({
        code: data.code,
        name: data.name,
        files: data.files,
        params: data.params
    });

    // save script reference in database
    scripts.push(data);
    try {
        $db.write();
        return context;
    } catch (e) {
        console.error(e);
        return null;
    }
};