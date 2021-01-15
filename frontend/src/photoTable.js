var jQuery = require('jquery')
window.$ = jQuery;
window.jQuery = jQuery;
require('jquery-migrate')
require('jquery.event.drag/jquery.event.drag.js')($)
require('slickgrid/slick.core')
require('slickgrid/slick.grid')


export default class PhotoTable {
    constructor(restApi) {
        this.data = {length:0};
        this.grid = null;
        this.restApi = restApi;
        this.pictWidth = 230;
        this.pictColNum = 1;
    }

    async init() {
        var columns = [
            {id: "date", name: "Date", field: "date", maxWidth:100},
            {id: "photos", name: "Photos", field: "photos", headerCssClass:"photosHeaderCls", formatter: this.renderPhoto1, asyncPostRender: this.renderPhoto2},
        ];

        var options = {
            rowHeight: 140,
            editable: false,
            enableAddRow: false,
            enableCellNavigation: false,
            enableColumnReorder: false,
            forceFitColumns: true,
            enableAsyncPostRender: true,
            minRowBuffer: 30
        };
        this.grid = new Slick.Grid("#photoGridArea", this.data, columns, options);
        this.setResize();
        
    }

    async readAllData() {
        const step = this.pictColNum;
        const cacheCount = await this.restApi.getCacheCount();
        this.data.length = Math.ceil(cacheCount / step);
        this.setData(0, cacheCount);
    }

    async setData(from, to) {
        const step = this.pictColNum;
        let cache = await this.restApi.getCacheData(from, to * step);
        for(let i = from ; i < to; i += step) {
            this.data[Math.floor(i / step)] = {
                date:i / step,
                photos:cache.slice(i - from, i - from + step)
            }
            this.grid.invalidateRow(i);
        }
        this.grid.updateRowCount();
        this.grid.render();
    }

    renderPhoto1(row, cell, value, m, item, self) {
        // console.log(row);

        let htmlStr = '';
        htmlStr += `loading...`;

        // htmlStr = '';
        // for(let url of value) {
        //     htmlStr += `<img class='photoImg' src=${document.devHost + url}>`;
        // }

        return htmlStr;
    }

    renderPhoto2(cellNode, row, dataContext, colDef) {
        console.log(cellNode[0].innerHTML, row);
        let htmlStr = '';
        for(let url of dataContext.photos) {
            htmlStr += `<img class='photoImg' src=${document.devHost + url}>`;
        }
        cellNode[0].innerHTML = htmlStr;
    }

    setResize() {
        const resizeImpl = () => {
            const hWindow = $(window).height();
            const hHeader = $('#headerArea').height();
            $('#photoGridArea').css('height', hWindow - hHeader)
            this.grid.resizeCanvas();

            const width = $('.photosHeaderCls').width();
            this.pictColNum = Math.floor(width / this.pictWidth);
            this.readAllData();
        };
        $(window).on("resize", resizeImpl);
        resizeImpl();
    }
}
