"use strict"
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
    doCache().then();
}

async function doCache() {
    if (cacheUpdating == false) {
        cacheUpdating = true;
        cacheData = [];
        let filePathes = await globExt(PHOTO_SRC_DIR + "/**", TARGET_EXTS,
            (match) => { 
                const relPath = match.substring(PHOTO_SRC_DIR.length);
                cacheData.push('/photos' + relPath);
                //console.info(relPath) 
            });
    }
    cacheUpdating = false;
}

main().then();
