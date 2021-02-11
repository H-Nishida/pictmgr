import express = require("express");
export module Main {
    const electron_app = require('electron').app;
    const fs = require('fs');
    const sharp = require('sharp');
    const imageThumbnail = require('image-thumbnail');
    //const genThumbnail = require('simple-thumbnail');
    const pako = require('pako');
    const exif = require('exif-reader')
    const globExt = require('glob-ext');
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
    const isVideo = (x:string)=>(
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
    interface Record {
        imgsrc: string;
        thumbnail: string;
        thumbPath: string;
        metadata: any;
        date: string;
        isVideo: boolean;
    };
    const cacheDataTemplate = {
        version:"1",
        records: [] as Record[],
        lastUpdated: "",
        imageCount: 0,
        videoCount: 0,
        latestFiletime: "",
        updating: false
    };
    let cacheData = Object.assign({}, cacheDataTemplate);
    const USER_DATA = electron_app.getPath('userData');
    const CACHE_DIR = path.join(USER_DATA, "photoCache");
    const CACHE_FILE = path.join(CACHE_DIR, "cache.dat");
    const THUMBNAILS_DIR = path.join(CACHE_DIR, "thumbnails");
    const CONFIG_FILE = path.join(USER_DATA, "config.json");
    console.info("cache-dir is " + CACHE_DIR);
    interface Config {
        PHOTO_SRC_DIR: string
    }
    let config: Config = {
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
            app.use('/photos', express.static(config.PHOTO_SRC_DIR), serveIndex(config.PHOTO_SRC_DIR, { 'icons': true }));
            res.json({result:result});
        })()});
        app.listen(port, () => {
            console.log(`listening at http://localhost:${port}`)
        })

        // Load cache data at startup
        let loadedData = loadData(CACHE_FILE, undefined);
        if (loadedData !== undefined) {
            if (loadedData.version == cacheData.version) {
                console.info("Cahce data loaded");
                cacheData = loadedData;
            } else {
                console.info("Cache data : Unmatch version");
            }
        } else {
            console.info("Cache data : Not found");
        }
    }

    interface TCachePerPath { [id: string]: { idx: number; record: Record } };

    async function doCache() {
        if (cacheUpdating) {
            console.log("Already caching");
            return true;
        }
        console.log("start cache");
        cacheUpdating = true;
        // Make cache per path
        let cachePerPath:TCachePerPath = {};
        for (let idx in cacheData.records) {
            let record = cacheData.records[idx];
            cachePerPath[record.imgsrc] = { idx: parseInt(idx), record: record };
        }
        // Clear cache except records
        let tmpRecords = cacheData.records;
        cacheData = Object.assign({}, cacheDataTemplate);
        cacheData.records = tmpRecords;
        // File search
        let filePathes = await globExt(config.PHOTO_SRC_DIR + "/**", TARGET_EXTS,
            (match:string) => procOneFile(match, cachePerPath).then());
        // Delete unmatched (remained) cache
        for (let key in cachePerPath) {
            let entry = cachePerPath[key];
            let record = cacheData.records[entry.idx];
            // Delete thumbnail
            try {
                fs.unlinkSync(THUMBNAILS_DIR + record.thumbPath);
            } catch (err) {
                console.info("Error at unlink:" + err);
            }
            // Delete entry
            delete cacheData.records[entry.idx];
        }
        // Normalize index and length of array
        cacheData.records = cacheData.records.filter(t => (t !== undefined));
        // Sort by date
        cacheData.records.sort((a, b) => a.date.localeCompare(b.date));
        // write to file
        saveData(cacheData, CACHE_FILE)
        // End
        console.log("end cache len", cacheData.records.length);
        cacheUpdating = false;
    }

    async function procOneFile(match : string, cachePerPath: TCachePerPath) { 
        const relPath = '/photos' + match.substring(config.PHOTO_SRC_DIR.length);
        const thumbPath = relPath + ".thumbnail.png";
        if (relPath in cachePerPath) {
            appendToCache(cachePerPath[relPath].record, false);
            delete cachePerPath[relPath]; // Clear from dict
            return; // Already exist in cache
        }
        const record : Record = {
            imgsrc: relPath,
            thumbnail: '/thumbnails' + thumbPath,
            thumbPath: thumbPath,
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
                appendToCache(record, true);
                console.info('done-image', match);
            }
            catch (err) {
                console.info("catch:" + err);
            }
        } else {
            let metadata:any = {}
            metadata.stats = stats;
            record.metadata = metadata;
            record.date = stats.mtime.toISOString();;
            appendToCache(record, true);
            console.info('done-video', match);
        }
    }

    function asyncFs(match: string) {
        return new Promise<any>((resolve, reject) => fs.stat(match, (err:any, stats:any) => {
            if (err) {
                reject(err);
            }
            resolve(stats);
        }));
    }

    async function appendToCache(record: Record, doPush: boolean) {
        if (doPush) {
            cacheData.records.push(record);
        }
        if (record.isVideo) {
            cacheData.videoCount += 1;
        } else {
            cacheData.imageCount += 1;
        }
        cacheData.latestFiletime = (cacheData.latestFiletime.localeCompare(record.date) > 0 ? cacheData.latestFiletime : record.date);
        cacheData.lastUpdated = new Date().toISOString();
    }

    async function updateConfig(newConfig: Config) {
        config = newConfig;
        return saveData(config, CONFIG_FILE);
    }

    function saveData(data: object, filePath: string) {
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

    function loadData(filePath: string, defaultValue: object) {
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
}
