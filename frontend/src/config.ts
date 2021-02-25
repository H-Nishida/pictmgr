
const JSONEditor = require("@json-editor/json-editor");
import UiMain from "./main";

export default class Config {
    uiMain: UiMain;
    element: HTMLElement;
    editor: any;

    constructor(uiMain: UiMain) {
        this.uiMain = uiMain;
        this.element = null;
        this.editor = null;
    }
    async init() {
        this.element = document.getElementById("configArea");
        this.editor = new JSONEditor.JSONEditor(this.element, {
            theme: 'bootstrap4',
            schema: {
                type: "object",
                properties: {
                    PHOTO_SRC_DIR: {
                        type: "string",
                        title: "PHOTO_SRC_DIR",
                        description: "Specify directory path which includes photos."
                    },
                    PORT_NUMBER: {
                        type: "number",
                        title: "PORT_NUMBER",
                        description: "Port number. The changes will reflect after reboot",
                    }
                },
                title: "config.json",
                required: ["PHOTO_SRC_DIR"]
            }
        });
        document.getElementById("ButtonSave").onclick = (() => (this.onSaveClicked().then()));
        document.getElementById("ButtonReset").onclick = (() => (this.onResetClicked().then()));
        await this.onResetClicked();
    }
    async onSaveClicked() {
        this.uiMain.restApi.setConfig(this.editor.getValue());
    }
    async onResetClicked() {
        const curJson = await this.uiMain.restApi.getConfig()
        this.editor.setValue(curJson);
    }
}
