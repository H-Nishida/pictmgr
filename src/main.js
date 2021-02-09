"use strict"
const electron_app = require('electron').app;
const fs = require('fs');
const sharp = require('sharp');
const imageThumbnail = require('image-thumbnail');
//const genThumbnail = require('simple-thumbnail');
const pako = require('pako');
const exif = require('exif-reader')
const globExt = require('glob-ext');
const express = require('express')
const cors = require('cors')
const serveIndex = require('serve-index');
const session = require('express-session')
const passwordProtected = require('express-password-protect')
const path = require('path');
const { strict } = require('assert');
const { resolve } = require('path');
const app = express()
const port = 3000
const TARGET_EXTS = [
    "*.jpg", "*.jpeg", "*.png",
    "*.mp4", "*.mov", "*.mts", "*.m2ts", "*.avi", "*.gp3"
]
const isVideo = (x)=>(
    x.toLowerCase().endsWith(".mp4") ||
    x.toLowerCase().endsWith(".mov") ||
    x.toLowerCase().endsWith(".mts") ||
    x.toLowerCase().endsWith(".m2ts") ||
    x.toLowerCase().endsWith(".avi") ||
    x.toLowerCase().endsWith(".gp3"));
const MAIN_PAGE = "/static/viewer.html"
const configPass = {
    username: "admin",
    password: "feif9f8ug33"
}
let cacheUpdating = false;
let cacheData = {
    version:"1",
    records: [],
    lastUpdated: 0,
    imageCount: 0,
    videoCount: 0,
    latestFiletime: ""
};
const USER_DATA = electron_app.getPath('userData');
const CACHE_DIR = path.join(USER_DATA, "photoCache");
const CACHE_FILE = path.join(CACHE_DIR, "cache.dat");
const THUMBNAILS_DIR = path.join(CACHE_DIR, "thumbnails");
const CONFIG_FILE = path.join(USER_DATA, "config.json");
console.info("cache-dir is " + CACHE_DIR);
let config = {
    PHOTO_SRC_DIR: ""
};

async function main() {
    // Read config
    config = loadData(CONFIG_FILE, config);

    //app.use(passwordProtected(config))
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }));
    app.use(cors()) // TODO: dev only
    app.post('/', (req, res) => { res.sendStatus(200) })
    console.info("path", path.join(__dirname, './public'))
    app.use('/static', express.static(path.join(__dirname, './public')))
    app.get('/', function (req, res) {res.redirect(MAIN_PAGE)})
    app.use('/photos', express.static(config.PHOTO_SRC_DIR), serveIndex(config.PHOTO_SRC_DIR, { 'icons': true }));
    app.use('/thumbnails', express.static(THUMBNAILS_DIR), serveIndex(THUMBNAILS_DIR, { 'icons': true }));
    app.post('/api/cache/count', (req, res) => { res.json({ count: cacheData.records.length }) });
    app.post('/api/cache/start', (req, res) => { res.sendStatus(200); doCache().then() });
    app.post('/api/cache/data', (req, res) => { res.json(cacheData.records.slice(req.body.from, req.body.to)) });
    app.post('/api/cache/stat', (req, res) => {
        const statObj = Object.assign({}, cacheData);
        statObj.records = undefined; // Delete big data
        statObj.updating = cacheUpdating;
        res.json(statObj)
    });
    app.post('/api/config/get', (req, res) => { res.json(config) });
    app.post('/api/config/set', (req, res) => { (async () => {
        let result = await updateConfig(req.body).then();
        res.json({result:result});
    })()});
    app.listen(port, () => {
        console.log(`listening at http://localhost:${port}`)
    })

    // Load cache data at startup
    let loadedData = loadData(CACHE_FILE);
    if (loadedData !== undefined && loadData.version == cacheData.version) {
        console.info("Cahce data loaded");
        cacheData = loadedData;
    }
}

async function doCache() {
    console.log("start cache");
    cacheUpdating = true;
    let cachePerPath = {};
    for (let cacheRecord of cacheData.records) {
        cachePerPath[cacheRecord.imgsrc] = cacheRecord;
    }
    let filePathes = await globExt(config.PHOTO_SRC_DIR + "/**", TARGET_EXTS,
        (match) => procOneFIle(match, cachePerPath).then());
    cacheData.records.sort((a, b) => a.date.localeCompare(b.date));
    console.log("end cache len", cacheData.records.length);
    cacheUpdating = false;
    // write to file
    saveData(cacheData, CACHE_FILE)
}

async function procOneFIle(match, cachePerPath) { 
    const relPath = '/photos' + match.substring(config.PHOTO_SRC_DIR.length);
    const thumbPath = relPath + ".thumbnail.png";
    if (relPath in cachePerPath) {
        return; // Already exist in cache
    }
    const record = {
        imgsrc: relPath,
        thumbnail: '/thumbnails' + thumbPath,
        metadata: null,
        date: null,
        isVideo: isVideo(match)
    };
    // await 
    const stats = await asyncFs(match);

    console.log("proc", match);
    if (!record.isVideo) {
        try {
            // await sharp
            const metadata = await sharp(match).metadata();
            metadata.stats = stats;
            let date = stats.mtime.toISOString();
            if (metadata.exif) {
                metadata.exif = exif(metadata.exif);
                if (metadata.exif.DateTimeOriginal) {
                    date = metadata.exif.DateTimeOriginal;
                }
            }
            record.metadata = metadata;
            record.date = date;
            // await Make image
            const buffer = await imageThumbnail(match);
            fs.mkdirSync(path.dirname(THUMBNAILS_DIR + thumbPath), { recursive: true });
            fs.writeFileSync(THUMBNAILS_DIR + thumbPath, buffer);
            appendToCache(record);
            console.info('done-image', match);
        }
        catch (err) {
            console.info("catch:" + err);
        }
    } else {
        let metadata = {}
        metadata.stats = stats;
        record.metadata = metadata;
        record.date = stats.mtime.toISOString();;
        appendToCache(record);
        console.info('done-video', match);
    }
}

function asyncFs(match) {
    return new Promise((resolve, reject) => fs.stat(match, (err, stats) => {
        if (err) {
            reject(err);
        }
        resolve(stats);
    }));
}

async function appendToCache(record) {
    cacheData.records.push(record);
    if (record.isVideo) {
        cacheData.videoCount += 1;
    } else {
        cacheData.imageCount += 1;
    }
    cacheData.latestFiletime = (cacheData.latestFiletime.localeCompare(record.date) > 0 ? cacheData.latestFiletime : record.date);
    cacheData.lastUpdated = new Date().toISOString();
}

async function updateConfig(newConfig) {
    config = newConfig;
    return saveData(config, CONFIG_FILE);
}

function saveData(data, filePath) {
    try {
        let dataJson = JSON.stringify(data);
        if (!filePath.endsWith(".json")) {
            const enc = new TextEncoder();
            const dataJsonBuf = enc.encode(dataJson);
            const dataJsonBufCompressed = pako.deflate(dataJsonBuf);
            dataJson = dataJsonBufCompressed
        }
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, dataJson);
        return true;
    } catch (e) {
        return false;
    }
}

function loadData(filePath, defaultValue) {
    try {
        let dataJson = fs.readFileSync(filePath);
        if (!filePath.endsWith(".json")) {
            const dataJsonBuf = pako.inflate(dataJson);
            const dec = new TextDecoder("utf-8")
            dataJson = dec.decode(dataJsonBuf);
        }
        const data = JSON.parse(dataJson);
        return data;
    } catch (e) {
        return defaultValue;
    }
}


main().then();