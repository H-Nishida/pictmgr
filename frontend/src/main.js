
import PhotoTable from "./photoTable";

export default class UiMain {
    constructor() {
        this.photoTable = new PhotoTable();
    }
    async init() {
        await this.photoTable.init();
    }
}
