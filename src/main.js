"use strict"
const fs = require('fs');
const sharp = require('sharp');
const imageThumbnail = require('image-thumbnail');
const genThumbnail = require('simple-thumbnail');
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
const PHOTO_SRC_DIR = "/Volumes/disk1/photos/2019-06"
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
const config = {
    username: "admin",
    password: "feif9f8ug33"
}
let cacheUpdating = false;
let cacheDataArray = [];
const USER_DATA = app.getPath('userData');
const CACHE_FILE = path.join(USER_DATA, "cache/cache.dat");
const CACHE_DIR = path.join(USER_DATA, "cache");
const THUMBNAILS_DIR = CACHE_DIR + "/thumbnails"
console.info("cache-dir is " + CACHE_DIR);
    
async function main() {
    //app.use(passwordProtected(config))
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }));
    app.use(cors()) // TODO: dev only
    app.post('/', (req, res) => { res.sendStatus(200) })
    console.info("path", path.join(__dirname, './public'))
    app.use('/static', express.static(path.join(__dirname, './public')))
    app.get('/', function (req, res) {res.redirect(MAIN_PAGE)})
    app.use('/photos', express.static(PHOTO_SRC_DIR), serveIndex(PHOTO_SRC_DIR, { 'icons': true }));
    app.use('/thumbnails', express.static(THUMBNAILS_DIR), serveIndex(THUMBNAILS_DIR, { 'icons': true }));
    app.post('/api/cache/count', (req, res) => { res.json({ count: cacheDataArray.length }) });
    app.post('/api/cache/start', (req, res) => { res.sendStatus(200); doCache().then() });
    app.post('/api/cache/data', (req, res) => { res.json(cacheDataArray.slice(req.body.from, req.body.to)) });
    app.post('/api/cache/status', (req, res) => {res.json({updating:cacheUpdating})});
    app.listen(port, () => {
        console.log(`listening at http://localhost:${port}`)
    })

    // TODO : test
    let loadedData = loadData(CACHE_FILE);
    if (loadedData == undefined) {
        doCache().then();
    } else {
        cacheDataArray = loadedData;
    }
}

async function doCache() {
    console.log("start cache");
    cacheUpdating = true;
    let cachePerPath = {};
    for (let cacheRecord of cacheDataArray) {
        cachePerPath[cacheRecord.imgsrc] = cacheRecord;
    }
    let filePathes = await globExt(PHOTO_SRC_DIR + "/**", TARGET_EXTS,
        (match) => { 
            const relPath = '/photos' + match.substring(PHOTO_SRC_DIR.length);
            const thumbPath = relPath + ".thumbnail.png";
            if (relPath in cachePerPath) {
                return; // Already exist in cache
            }
            fs.stat(match, (err, stats) => {
                if (err) {
                    throw err;
                }
                console.log("proc", match);
                if (! isVideo(match)) {
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
                            imgsrc: relPath,
                            thumbnail: '/thumbnails' + thumbPath,
                            metadata: metadata,
                            date: date,
                            isVideo: false
                        };
                        cacheDataArray.push(record);
                        imageThumbnail(match).then((buffer) => {
                            fs.mkdirSync(path.dirname(THUMBNAILS_DIR + thumbPath), { recursive: true });
                            fs.writeFileSync(THUMBNAILS_DIR + thumbPath, buffer);
                            console.info('done-image', match)
                        });
                    }).catch((reason) => {
                        console.error(reason);
                    });
                } else {
                    let metadata = {}
                    metadata.stats = stats;
                    let date = stats.mtime.toISOString();
                    const record = {
                        imgsrc: relPath,
                        thumbnail: '/thumbnails' + thumbPath,
                        metadata: metadata,
                        date: date,
                        isVideo: true
                    };
                    cacheDataArray.push(record);
                    fs.mkdirSync(path.dirname(THUMBNAILS_DIR + thumbPath), { recursive: true });
                    genThumbnail(match, THUMBNAILS_DIR + thumbPath, '250x?')
                        .then(() => console.info('done-video', match))
                        .catch(err => console.error(err))
                }
            });
        });
    cacheDataArray.sort((a, b) => a.date.localeCompare(b.date));
    await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10 sec for thumbnail
    console.log("end cache len", cacheDataArray.length);
    cacheUpdating = false;
    // write to file
    saveData(cacheDataArray, CACHE_FILE)
}

function saveData(data, filePath) {
    try {
        const enc = new TextEncoder();
        const dataJson = JSON.stringify(data);
        const dataJsonBuf = enc.encode(dataJson);
        const dataJsonBufCompressed = pako.deflate(dataJsonBuf);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
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