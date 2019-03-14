var Peer = require('./VideoPeer');

function VideoPeerList(pNode) {
    this.Node = pNode;
    this.Peers = [];
}

VideoPeerList.prototype.Search = function(sObjPeer) {
    var self = this;
    if(typeof sObjPeer != "string"){
        return {
            Object : null,
            Ind: -1
        };
    }
    
    for (var i = 0;i < self.Peers.length ;i++) {
        if (self.Peers[i].sObjPeer == sObjPeer) {
            return {
                Object : self.Peers[i],
                Ind: i
            };
        }
        i++;
    }
    return {
        Object : null,
        Ind: -1
    };
};

VideoPeerList.prototype.Add = function(sObjPeer){
    var self = this;
    var Node = this.Node;
    var ret = self.Search(sObjPeer);
    if(ret.Object != null){
        return ret.Object;
    }
    var oPeer = new Peer(sObjPeer,Node);
    self.Peers.push(oPeer);
    return oPeer;
};

VideoPeerList.prototype.DeleteAt = function(index ){
    if(index < 0 || index > this.Peers.length - 1) {
        return;
    }

    
};

VideoPeerList.prototype.Delete = function(sObjPeer){
    var self = this;
    var ret = self.Search(sObjPeer);
    if(ret.Ind > -1){
        self.Peers.splice(ret.Ind, 1);
    }
    
};

VideoPeerList.prototype.Clean = function(){
    var self = this;
    var i = 0;
    while (i < self.Peers.length ) {
        self.Peers[i].Release();
        i++;
    }
   
    self.Peers = [];
};

VideoPeerList.prototype.Traversing = function(callback,args){
    if(typeof callback != "function"){
        return;
    }
    var self = this;
    for (var i = 0; i < self.Peers.length; i++) {
        callback(self.Peers[i],i,args);
    }
};

module.exports = VideoPeerList;