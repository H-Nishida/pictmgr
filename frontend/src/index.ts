require('file-loader?name=[name].[ext]!./viewer.html');
import 'bootstrap';
import './index.css';
import UiMain from "./main";

declare global {
    interface Document {
        uiMain: UiMain;
        isDevserver: boolean;
        devHost: string;
    }
}

async function main() {
    var uiMain = new UiMain();
    document.uiMain = uiMain; // for debug purpose;
    document.isDevserver = false;
    document.devHost = "";
    if (document.location.port == "9998") { // DevServer
        document.isDevserver = true;
        document.devHost = "http://localhost:3000"
    }
    await uiMain.init();
}
window.onload = () => {
    main().then();
};
