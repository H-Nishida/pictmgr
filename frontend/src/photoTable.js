var jQuery = require('jquery')
window.$ = jQuery;
window.jQuery = jQuery;
require('jquery-migrate')
require('jquery.event.drag/jquery.event.drag.js')($)
require('slickgrid/slick.core')
require('slickgrid/slick.grid')


export default class PhotoTable {
    constructor() {
        this.data = [];
        this.grid = null;
    }
    async init() {
        for (var i = 0; i < 100; i++) {
            this.data[i] = {
                title: "Task " + i,
                duration: "5 days",
                percentComplete: Math.round(Math.random() * 100),
                start: "01/01/2009",
                finish: "01/05/2009",
                effortDriven: (i % 5 == 0)
            };
        }
        var columns = [
            {id: "title", name: "Title", field: "title"},
            {id: "duration", name: "Duration", field: "duration"},
            {id: "%", name: "% Complete", field: "percentComplete"},
            {id: "start", name: "Start", field: "start"},
            {id: "finish", name: "Finish", field: "finish"},
            {id: "effort-driven", name: "Effort Driven", field: "effortDriven"}
        ];

        var options = {
            rowHeight: 140,
            editable: false,
            enableAddRow: false,
            enableCellNavigation: false,
            enableColumnReorder: false
        };
        this.grid = new Slick.Grid("#photoGridArea", this.data, columns, options);

    }
}
