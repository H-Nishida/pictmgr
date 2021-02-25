import UiMain from "./main";


export default class Help {
    uiMain: UiMain;

    constructor(uiMain : UiMain) {
        this.uiMain = uiMain;
    }
    async init() {
        // Browser link
        let urlArea: HTMLBaseElement = <HTMLBaseElement>document.getElementById("urlArea");
        const config = await this.uiMain.restApi.getConfig();
        urlArea.textContent = `http://localhost:${config.PORT_NUMBER}/static/viewer.html`;
    }
    
}
