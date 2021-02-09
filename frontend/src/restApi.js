
import PhotoTable from "./photoTable";

export default class RestApi {
    constructor() {
    }
    async init() {
        
    }
    async getCacheCount() {
        const jsonRes = await this.fetchImpl('/api/cache/count');
        return jsonRes["count"];
    }
    async getCacheStat() {
        const jsonRes = await this.fetchImpl('/api/cache/stat');
        return jsonRes;
    }
    async getCacheData(from, to) {
        const jsonRes = await this.fetchImpl('/api/cache/data', {from:from, to:to});
        return jsonRes;
    }
    async startCache() {
        const jsonRes = await this.fetchImpl('/api/cache/start', {});
    }
    async getConfig() {
        const jsonRes = await this.fetchImpl('/api/config/get', {});
        return jsonRes;
    }
    async setConfig(newConfig) {
        const jsonRes = await this.fetchImpl('/api/config/set', newConfig);
        return jsonRes;
    }
    async fetchImpl(url, postJson) {
        url = document.devHost + url;
        const response = await fetch(url, {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'same-origin', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: postJson ? JSON.stringify(postJson):undefined, // body data type must match "Content-Type" header
        });
        return response.json(); // parses JSON response into native JavaScript objects
    }
}
