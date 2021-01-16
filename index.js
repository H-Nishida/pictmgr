"use strict"
const fs = require('fs');
const sharp = require('sharp');
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
const PHOTO_SRC_DIR = "/Volumes/disk1/photos"
const TARGET_EXTS = [
    "*.jpg", "*.jpeg", "*.png",
    "*.mp4", "*.mov", "*.mts", "*.m2ts", "*.avi", "*.gp3"
]
const MAIN_PAGE = "/static/viewer.html"
const config = {
    username: "admin",
    password: "feif9f8ug33"
}
let cacheUpdating = false;
let cacheData = [];
const CACHE_FILE = "cache.dat";
    
async function main() {
    //app.use(passwordProtected(config))
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }));
    app.use(cors()) // TODO: dev only
    app.post('/', (req, res) => { res.sendStatus(200)})
    app.use('/static', express.static(path.join(__dirname, 'frontend', 'public')))
    app.get('/', function (req, res) {res.redirect(MAIN_PAGE)})
    app.use('/photos', express.static(PHOTO_SRC_DIR), serveIndex(PHOTO_SRC_DIR, { 'icons': true }));
    app.post('/api/cache/count', (req, res) => { res.json({ count: cacheData.length }) });
    app.post('/api/cache/start', (req, res) => { res.sendStatus(200); doCache().then() });
    app.post('/api/cache/data', (req, res) => { res.json(cacheData.slice(req.body.from, req.body.to)) });
    app.post('/api/cache/status', (req, res) => {res.json({updating:cacheUpdating})});
    app.listen(port, () => {
        console.log(`listening at http://localhost:${port}`)
    })

    // TODO : test
    let loadedData = loadData(CACHE_FILE);
    if (loadedData == undefined) {
        doCache().then();
    } else {
        cacheData = loadedData;
    }
}

async function doCache() {
    console.log("start cache");
    cacheUpdating = true;
    cacheData = [];
    let filePathes = await globExt(PHOTO_SRC_DIR + "/**", TARGET_EXTS,
        (match) => { 
            fs.stat(match, (err, stats) => {
                if (err) {
                    throw err;
                }
                console.log(match)
                const relPath = match.substring(PHOTO_SRC_DIR.length);
                sharp(match).metadata().then(function (metadata) {
                    metadata.stats = stats;
                    let date = stats.mtime.toISOString();
                    if (metadata.exif) {
                        metadata.exif = exif(metadata.exif);
                        if (metadata.exif.DateTimeOriginal) {
                            date = metadata.exif.DateTimeOriginal;
                        }
                    }
                    const record = {
                        imgsrc: '/photos' + relPath,
                        metadata: metadata,
                        date: date
                    };
                    cacheData.push(record);
                }).catch((reason) => {
                    let metadata = {}
                    metadata.stats = stats;
                    let date = stats.mtime.toISOString();
                    const record = {
                        imgsrc: '/photos' + relPath,
                        metadata: metadata,
                        date: date
                    };
                    cacheData.push(record);
                });
            });

        });
    cacheData.sort((a, b) => a.date.localeCompare(b.date));
    console.log("end cache len", cacheData.length);
    cacheUpdating = false;
    // write to file
    saveData(cacheData, CACHE_FILE)

}

function saveData(data, filePath) {
    try {
        const enc = new TextEncoder();
        const dataJson = JSON.stringify(data);
        const dataJsonBuf = enc.encode(dataJson);
        const dataJsonBufCompressed = pako.deflate(dataJsonBuf);
        fs.writeFileSync(filePath, dataJsonBufCompressed);
        return true;
    } catch (e) {
        return false;
    }
}

function loadData(filePath) {
    try {
        const dec = new TextDecoder("utf-8")
        const dataJsonBufCompressed = fs.readFileSync(filePath);
        const dataJsonBuf = pako.inflate(dataJsonBufCompressed);
        const dataJson = dec.decode(dataJsonBuf);
        const data = JSON.parse(dataJson);
        return data;
    } catch (e) {
        return undefined;
    }
}


main().then();
