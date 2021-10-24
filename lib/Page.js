class Page {
    hasNext = null;
    next = null;
    hasPrev = null;
    prev = null;
    items = [];
    tag = null;
    limit = null;

    constructor(raw, opts = {limit: 30, tag: null}) {
        this.items = raw.items;
        this.hasNext = raw.paging.hasNext;
        this.next = raw.paging.cursors.next;
        this.hasPrev = raw.paging.hasPrev;
        this.prev = raw.paging.cursors.prev;
        this.tag = opts.tag ? opts.tag : null;
        this.limit = opts.limit;
    }
}

module.exports = Page;