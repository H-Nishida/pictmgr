var jQuery = require('jquery')
window.$ = jQuery;
window.jQuery = jQuery;
require('jquery-migrate')
require('jquery.event.drag/jquery.event.drag.js')($)
require('slickgrid/slick.core')
require('../libs/slickgrid/slick.grid')


export default class PhotoTable {
    constructor(restApi) {
        this.data = {length:0};
        this.grid = null;
        this.restApi = restApi;
        this.pictWidth = 230;
        this.pictColNum = 1;
        this.readPageSize = 200;
        this.cacheCount = 0;
        this.loadingTimer;
    }

    async init() {
        var columns = [
            {id: "date", name: "Date", field: "date", maxWidth:100, formatter:this.dateFormat},
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
            minRowBuffer: 30,
            asyncPostRenderDelay: 50,
            rowBufferExtra: 10,
            asyncPostRenderReadExtraRows: 10,
        };
        this.grid = new Slick.Grid("#photoGridArea", this.data, columns, options);
        this.grid.onViewportChanged.subscribe((e, args) => {
            var vp = this.grid.getViewport();
            clearTimeout(this.loadingTimer);
            this.loadingTimer = setTimeout(
                () => this.viewPortChanged(vp.top, vp.bottom).then(),
                options.asyncPostRenderDelay    
            );
        });
        this.setResize();
        this.viewPortChanged(0, 0);
    }

    async viewPortChanged(from, to) {
        let i;
        let allDataOK = true;
        for (i = from; i <= to; i++) {
            if (this.data[i] === undefined) {
                allDataOK = false;
                break;
            }
        }
        if (!allDataOK) {
            let fromPageIdx = this.idxToPageFloor(from) - this.readPageSize;
            let toPageIdx = this.idxToPageFloor(to) + this.readPageSize * 2;
            await this.setData(fromPageIdx, toPageIdx);
            for (i = fromPageIdx; i <= toPageIdx; i++) {
                this.grid.invalidateRow(i);
            }
            this.grid.render();
        }
    }

    idxToPageFloor(idx) {
        return Math.floor(idx / this.readPageSize) * this.readPageSize;
    }

    async updateCacheCount() {
        const cacheCount = await this.restApi.getCacheCount();
        this.cacheCount = cacheCount;
        const nextLength = Math.ceil(cacheCount / this.pictColNum);
        if (nextLength != this.data.length) {
            this.data.length = nextLength;
            this.grid.updateRowCount();
        }
    }

    async setData(from, to) {
        const step = this.pictColNum;
        const fromIdx = Math.max(0, from * step);
        const toIdx = Math.min(this.cacheCount - 1, to * step);
        let cache = await this.restApi.getCacheData(fromIdx, toIdx);
        for(let i = fromIdx ; i < toIdx; i += step) {
            this.data[Math.floor(i / step)] = {
                date:cache[i - fromIdx].date,
                photos:cache.slice(i - fromIdx, i - fromIdx + step)
            }
        }
    }

    dateFormat(row, cell, value, m, item, self) {
        return value.substring(0, 4) + "<br>" + value.substring(5, 10);
    }

    renderPhoto1(row, cell, value, m, item, self) {
        console.log("format", row);
        let htmlStr = '';
        htmlStr += `loading...`;
        return htmlStr;
    }

    renderPhoto2(cellNode, row, dataContext, colDef) {
        if (dataContext) {
            console.log(cellNode[0].innerHTML, row);
            let htmlStr = '';
            for (let photo of dataContext.photos) {
                const imgsrc = document.devHost + photo.imgsrc;
                const isMovie = (
                    photo.imgsrc.toLowerCase().endsWith(".mp4") ||
                    photo.imgsrc.toLowerCase().endsWith(".mov") ||
                    photo.imgsrc.toLowerCase().endsWith(".mts") ||
                    photo.imgsrc.toLowerCase().endsWith(".m2ts") ||
                    photo.imgsrc.toLowerCase().endsWith(".avi") ||
                    photo.imgsrc.toLowerCase().endsWith(".gp3"));
                if (isMovie) {
                    htmlStr += `<video class='photoImg' src=${imgsrc} controls>`;
                } else {
                    htmlStr += `<img class='photoImg' src=${imgsrc}>`;
                }
            }
            cellNode[0].innerHTML = htmlStr;
        }
    }

    setResize() {
        const resizeImpl = () => {
            const hWindow = $(window).height();
            const hHeader = $('#headerArea').height();
            $('#photoGridArea').css('height', hWindow - hHeader)
            this.grid.resizeCanvas();

            const width = $('.photosHeaderCls').width();
            this.pictColNum = Math.floor(width / this.pictWidth);
            this.updateCacheCount();
        };
        $(window).on("resize", resizeImpl);
        resizeImpl();
    }
}
