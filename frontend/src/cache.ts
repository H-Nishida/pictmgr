import UiMain from "./main";

const JSONEditor = require("@json-editor/json-editor");

export default class Cache {
    uiMain: UiMain;
    start: boolean;
    cacheUpdating: HTMLElement;
    cacheImageCount: HTMLElement;
    cacheVideoCount: HTMLElement;
    cacheLastUpdate: HTMLElement;
    cacheLatestTimestamp: HTMLElement;

    constructor(uiMain : UiMain) {
        this.uiMain = uiMain;
        this.start = false;
    }
    async init() {
        document.getElementById("ButtonUpdateCache").onclick = (() => (this.onUpdateCacheClicked().then()));
        this.cacheUpdating = document.getElementById("cacheUpdating");
        this.cacheImageCount = document.getElementById("cacheImageCount");
        this.cacheVideoCount = document.getElementById("cacheVideoCount");
        this.cacheLastUpdate = document.getElementById("cacheLastUpdate");
        this.cacheLatestTimestamp = document.getElementById("cacheLatestTimestamp");
    }
    async onUpdateCacheClicked() {
        await this.uiMain.restApi.startCache();
    }
    async startUpdating(start: boolean) {
        const sleep = ((msec:number) => new Promise(resolve => setTimeout(resolve, msec)));
        if (start) {
            if (this.start == false) {
                this.start = true;
                while (this.start) {
                    await sleep(1500);
                    const stat = await this.uiMain.restApi.getCacheStat();
                    console.info(stat);
                    this.cacheUpdating.innerText = stat.updating;
                    this.cacheImageCount.innerText = stat.imageCount;
                    this.cacheVideoCount.innerText = stat.videoCount;
                    this.cacheLastUpdate.innerText = stat.lastUpdated;
                    this.cacheLatestTimestamp.innerText = stat.latestFiletime;
                }
            }
        } else {
            this.start = false;
        }
    }
}
