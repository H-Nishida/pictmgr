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
                date: "Task " + i,
                photo: "photo" + 1,
            };
        }
        var columns = [
            {id: "date", name: "Date", field: "date", maxWidth:100},
            {id: "photo", name: "Photos",field: "photo", formatter: this.renderPhoto},
        ];

        var options = {
            rowHeight: 140,
            editable: false,
            enableAddRow: false,
            enableCellNavigation: false,
            enableColumnReorder: false,
            //enableAsyncPostRender: true
            forceFitColumns: true
        };
        this.grid = new Slick.Grid("#photoGridArea", this.data, columns, options);
        this.setResize();

    }

    renderPhoto(cellNode, row, dataContext, colDef) {
        return "<img class='photoImg' src=http://localhost:3000/photos/2018-04/IMG_20180422_152127.jpg>";
    }

    setResize() {
        const resizeImpl = () => {
            const hWindow = $(window).height();
            const hHeader = $('#headerArea').height();
            $('#photoGridArea').css('height', hWindow - hHeader)
            this.grid.resizeCanvas();
        };
        $(window).on("resize", resizeImpl);
        resizeImpl();
    }
}
