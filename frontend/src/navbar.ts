import RestApi from "./restApi";
import UiMain from "./main";

export default class NavBar {
    uiMain: UiMain;

    constructor(uiMain: UiMain) {
        this.uiMain = uiMain;
    }
    async init() {
        // Add click handler
        Array.from(document.getElementsByClassName("targetNav")).forEach((element:any) => {
            element.onclick = () => this.onClickNav(element.hash.substring(1), false);
        });

        // URL Parse
        const hashInUrl = window.location.hash;
        if (hashInUrl && hashInUrl.startsWith("#Article")) {
            this.onClickNav(hashInUrl.substring(1), true);
        } else {
            this.onClickNav("ArticlePhoto", true);
        }
    }

    onClickNav(targetId:string, initial:boolean) {
        // Hide all
        Array.from(document.getElementsByClassName("topArticle")).forEach((element:any) => {
            element.style.display = "none";
        });
        // Show target
        document.getElementById(targetId).style.display = "initial";
        // Special handling
        if (targetId == "ArticlePhoto") {
            if (!initial) {
                setTimeout(() => location.reload(), 100);
            }
        }
        this.uiMain.cache.startUpdating(targetId == "ArticleCache").then();
    }
}
