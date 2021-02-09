import RestApi from "./restApi";

export default class NavBar {
    constructor(uiMain) {
        this.uiMain = uiMain;
    }
    async init() {
        // Add click handler
        document.getElementsByClassName("targetNav").forEach(element => {
            element.onclick = () => this.onClickNav(element.hash.substring(1));
        });
        // URL Parse
        const hashInUrl = window.location.hash;
        if (hashInUrl && hashInUrl.startsWith("#Article")) {
            this.onClickNav(hashInUrl.substring(1));
        } else {
            this.onClickNav("ArticlePhoto");
        }
    }

    onClickNav(targetId) {
        // Hide all
        document.getElementsByClassName("topArticle").forEach(element => {
            element.style.display = "none";
        });
        // Show target
        document.getElementById(targetId).style.display = "initial";
        // Special handling
        if (targetId == "ArticlePhoto") {
            this.uiMain.photoTable.doResize();
            setTimeout(() =>this.uiMain.photoTable.doResize(), 500);
        }
        this.uiMain.cache.startUpdating(targetId == "ArticleCache").then();
    }
}
