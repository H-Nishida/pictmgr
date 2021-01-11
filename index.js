"use strict"
const globExt = require('glob-ext');
const express = require('express')
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
let cacheCount = 0;

async function main() {
    app.use(passwordProtected(config))
    app.post('/', (req, res) => { res.sendStatus(200)})
    app.use('/static', express.static(path.join(__dirname, 'frontend', 'public')))
    app.get('/', function (req, res) {res.redirect(MAIN_PAGE)})
    //app.use('/photos', express.static(PHOTO_SRC_DIR))
    app.use('/photos', express.static(PHOTO_SRC_DIR), serveIndex(PHOTO_SRC_DIR, { 'icons': true }));
    app.get('/api/cache/count', (req, res) => { res.json({ count: cacheCount }) });
    app.post('/api/cache/start', (req, res) => { res.sendStatus(200); doCache().then() });
    app.get('/api/cache/status', (req, res) => {res.json({updating:cacheUpdating})});
    app.listen(port, () => {
        console.log(`listening at http://localhost:${port}`)
    })
}

async function doCache() {
    if (cacheUpdating == false) {
        cacheUpdating = true;
        let filePathes = await globExt(PHOTO_SRC_DIR + "/**", TARGET_EXTS,
        (match) => { console.info(match) });
        cacheCount = filePathes.length;
    }
    cacheUpdating = false;
}

main().then();
