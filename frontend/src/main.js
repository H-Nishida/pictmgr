import RestApi from "./restApi";
import PhotoTable from "./photoTable";

export default class UiMain {
    constructor() {
        this.restApi = new RestApi();
        this.photoTable = new PhotoTable(this.restApi);
    }
    async init() {
        await this.restApi.init();
        await this.photoTable.init();
    }
}
