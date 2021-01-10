import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'slickgrid/slick.grid.css'
import UiMain from "./main";

async function main() {
    var uiMain = new UiMain();
    document.uiMain = uiMain; // for debug purpose;
    await uiMain.init();
}
window.onload = () => {
    main().then();
};
