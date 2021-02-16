import RestApi from "./restApi";
import PhotoTable from "./photoTable";
import NavBar from "./navbar";
import Config from "./config";
import Cache from "./cache";

export default class UiMain {
    restApi: RestApi;
    navbar: NavBar;
    config: Config;
    cache: Cache;
    photoTable: PhotoTable;
    
    constructor() {
        this.restApi = new RestApi(this);
        this.navbar = new NavBar(this);
        this.config = new Config(this);
        this.cache = new Cache(this);
        this.photoTable = new PhotoTable(this);
    }
    async init() {
        await this.restApi.init();
        await this.navbar.init();
        await this.config.init();
        await this.cache.init();
        await this.photoTable.init();
    }
}
