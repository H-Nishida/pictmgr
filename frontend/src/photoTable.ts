import UiMain from "./main";
import 'jquery';
const jQuery = require('jquery');
import RestApi from "./restApi";

declare global {
    interface Window {
        $: any;
        jQuery: any;
        Slick: any;
    }
}
declare var Slick: any;

window.$ = jQuery;
window.jQuery = jQuery;
require('jquery-migrate')
require('jquery.event.drag/jquery.event.drag')($)
require('slickgrid')
require('../libs/slickgrid/slick.grid')
const Viewer = require('viewerjs')
const videojs = require('video.js').default;

export default class PhotoTable {
    uiMain: UiMain;
    data: any;
    grid: any;
    restApi: RestApi;
    pictWidth: number;
    pictColNum: number;
    readPageSize: number;
    cacheCount: number;
    loadingTimer: NodeJS.Timeout;
    viewerG: any;


    constructor(uiMain: UiMain) {
        this.uiMain = uiMain;
        this.data = {length:0};
        this.grid = null;
        this.restApi = uiMain.restApi;
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
        this.grid.onViewportChanged.subscribe((e:any, args:any) => {
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
            view(ev: any) {
                const info = JSON.parse(ev.detail.originalImage.dataset.imginfo);
                if (info.isVideo) {
                    ev.detail.image.classList.add("videoImage");
                } else {
                    ev.detail.image.src = info.imgpath;
                    ev.detail.originalImage.src = info.imgpath;
                }
            },
            title: [true, (image:any, imageData:any) => `${image.alt.replace(".thumbnail.png", "")} (${imageData.naturalWidth} × ${imageData.naturalHeight})`]
        });
    }

    async viewPortChanged(from:number, to:number) {
        let i;
        let allDataOK = true;
        for (i = from; i < Math.min(to, this.data.length); i++) {
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

    idxToPageFloor(idx:number) {
        return Math.floor(idx / this.readPageSize) * this.readPageSize;
    }

    async updateCacheCount() {
        const cacheCount = await this.restApi.getCacheCount();
        this.cacheCount = cacheCount;
        const nextLength = Math.ceil(cacheCount / this.pictColNum);
        this.updatePictColNum();
        if (nextLength != this.data.length) {
            console.log("data length changed", nextLength);
            for (let idx in this.data) {
                this.data[idx] = undefined;
            }
            this.data.length = nextLength;
            this.grid.updateRowCount();
            this.grid.render();
            let vp = this.grid.getViewport();
            this.grid.scrollRowToTop(vp.top);
        }
    }

    async setData(from:number, to:number) {
        const step = this.pictColNum;
        const fromIdx = Math.max(0, from * step);
        const toIdx = Math.min(this.cacheCount, to * step);
        let cache = await this.restApi.getCacheData(fromIdx, toIdx);
        for(let i = fromIdx ; i < toIdx; i += step) {
            this.data[Math.floor(i / step)] = {
                date:cache[i - fromIdx].date,
                photos:cache.slice(i - fromIdx, Math.min(i - fromIdx + step, cache.length))
            }
        }
    }

    dateFormat(row:number, cell:number, value:any, m:any, item:any, self:any) {
        return `<h4><div class="badge badge-dark">${value.substring(0, 4)}<br>${value.substring(5, 10)}</div></h4>`;
    }

    renderPhoto1(row:number, cell:any, value:any, m:any, item:any, self:any) {
        console.log("format", row);
        let htmlStr = '';
        htmlStr += `loading...`;
        return htmlStr;
    }

    renderPhoto2(cellNode:any, row:number, dataContext:any, colDef:any) {
        if (dataContext) {
            console.log(cellNode[0].innerHTML, row);
            let htmlStr = "<span class='photoOuter'>";
            for (let photo of dataContext.photos) {
                const thumbnail = document.devHost + photo.thumbnail;
                photo.imgpath = document.devHost + photo.imgsrc;
                if (photo.isVideo) {
                    htmlStr += `
                        <video class='photoImg video-js  vjs-default-skin vjs-big-play-centered' data-setup='{}' preload="auto" controls>
                            <source src="${photo.imgpath}">
                        </video>
                        `;
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
            const videoDoms = cellNode[0].getElementsByTagName('video');
            for (let videoDom of videoDoms) {
                videojs(videoDom);
            }
        }
    }

    updatePictColNum() {
        const width = $('.photosHeaderCls').width();
        this.pictColNum = Math.floor(width / this.pictWidth);
    }

    setResize() {
        $(window).on("resize", () => this.doResize());
        this.doResize();
    }

    doResize() {
        const hWindow = $(window).height();
        const hHeader = $('#headerArea').height();
        $('#photoGridArea').css('height', hWindow - hHeader)
        if (this.grid) {
            this.grid.resizeCanvas();
            this.updateCacheCount();
        }
    }
}
