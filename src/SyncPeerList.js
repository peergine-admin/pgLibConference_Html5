function SyncPeer(sObjPeer, iKeepStamp) {
    this.sObjPeer = sObjPeer;
    this.iKeepStamp = iKeepStamp;
}

function SyncPeerList(opts) {
    this.m_listSyncPeer = [];
    //搜索加入会议的节点
    this.OutString = function () {
        return opts.OutString;
    };
}

SyncPeerList.prototype.Search = function (sObjPeer) {
    var self = this;
    var listSyncPeer = this.m_listSyncPeer;
    if (sObjPeer == "") {
        self.OutString("VideoPeerSearch can't Search Start");
        return {
            Object: null,
            Ind: -1
        };
    }
    for (var i = 0; i < listSyncPeer.length; i++) {
        if (listSyncPeer[i].sObjPeer == sObjPeer) {
            return {
                Object: listSyncPeer[i],
                Ind: i
            };
        }
    }

    return {
        Object: null,
        Ind: -1
    };
};

SyncPeerList.prototype.Add = function (sObjPeer, iStamp) {
    var self = this;
    var osvPeer = self.Search(sObjPeer);

    if (osvPeer.Object == null) {
        var oSync = new SyncPeer(sObjPeer, iStamp);
        self.m_listSyncPeer.push(oSync);
    }
};

SyncPeerList.prototype.Del = function (sObjPeer) {
    var self = this;
    var osvPeer = self.Search(sObjPeer);
    if (osvPeer.Ind > -1) {
        self.m_listSyncPeer.splice(osvPeer.Ind, 1);
    }
};


module.exports = SyncPeerList;