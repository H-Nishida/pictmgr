var jQuery = require('jquery')
window.$ = jQuery;
window.jQuery = jQuery;
require('jquery-migrate')
require('jquery.event.drag/jquery.event.drag.js')($)
require('slickgrid/slick.core')
require('../libs/slickgrid/slick.grid')
const Viewer = require('viewerjs')

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
            {id: "photos", name: "Photos", field: "photos", headerCssClass:"photosHeaderCls", formatter: this.renderPhoto1, asyncPostRender: this.renderPhoto2.bind(this)},
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
            asyncPostRenderReadExtraRows: 10
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
        await this.updateCacheCount();
        await this.viewPortChanged(0, 100);
        this.viewerG = new Viewer(document.getElementById("photoGridArea"), {
            view(ev) {
                const info = JSON.parse(ev.detail.originalImage.dataset.imginfo);
                if (info.isVideo) {
                    
                } else {
                    ev.detail.image.src = info.imgpath;
                    ev.detail.originalImage.src = info.imgpath;
                }
            },
            title: [true, (image, imageData) => `${image.alt.replace(".thumbnail.png", "")} (${imageData.naturalWidth} × ${imageData.naturalHeight})`]
        });
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
        this.updatePictColNum();
        if (nextLength != this.data.length) {
            console.log("data length changed", nextLength)
            this.data.length = nextLength;
            this.grid.updateRowCount();
            this.grid.render();
            let vp = this.grid.getViewport();
            this.grid.scrollRowToTop(vp.top);
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
            let htmlStr = "<span class='photoOuter'>";
            for (let photo of dataContext.photos) {
                const thumbnail = document.devHost + photo.thumbnail;
                photo.imgpath = document.devHost + photo.imgsrc;
                if (photo.isVideo) {
                    //htmlStr += `<video class='photoImg' src=${thumbnail} controls></video>`;
                    htmlStr += `<div><image class='photoImg' src="${thumbnail}" data-imginfo='${JSON.stringify(photo)}'></image></div>`;
                } else {
                    htmlStr += `<div><image class='photoImg' src="${thumbnail}" data-imginfo='${JSON.stringify(photo)}'></image></div>`;
                }
            }
            htmlStr += "</span>";
            cellNode[0].innerHTML = htmlStr;
            const imgDoms = cellNode[0].getElementsByClassName('photoImg');
            for (const imgDom of imgDoms) {
                // TODO
            }
            this.viewerG.update();
        }
    }

    updatePictColNum() {
        const width = $('.photosHeaderCls').width();
        this.pictColNum = Math.floor(width / this.pictWidth);
    }

    setResize() {
        const resizeImpl = () => {
            const hWindow = $(window).height();
            const hHeader = $('#headerArea').height();
            $('#photoGridArea').css('height', hWindow - hHeader)
            this.grid.resizeCanvas();
            this.updateCacheCount();
        };
        $(window).on("resize", resizeImpl);
        resizeImpl();
    }
}
