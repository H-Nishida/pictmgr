import 'bootstrap';
import './index.css';
import UiMain from "./main";

async function main() {
    var uiMain = new UiMain();
    document.uiMain = uiMain; // for debug purpose;
    await uiMain.init();
}
window.onload = () => {
    main().then();
};
