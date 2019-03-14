function VideoPeer(sObjPeer,pNode) {
    var self = this;
    this.Node = pNode;

    this.sObjPeer = sObjPeer;

    //------------
     
    this.videoHeartbeatStamp = 0;
    this.videoHeartbeatLost = false;

    //------------
    this.smallVideoDivView = "";
    this.smallVideoWndEle = ""; 

    this.smallVideoRequestStamp = 0;
    this.smallOnVideoJoinStamp = 0;
    this.smallVideoRequestHandle = 0;
    this.smallVideoMode = VIDEO_PEER_MODE_Leave;
    //------------
    
    this.largeVideoDivView = "";
    this.largeVideoWndEle = ""; 

    this.largeVideoRequestStamp = 0;
    this.largeOnVideoJoinStamp = 0;
    this.largeVideoRequestHandle = 0;
    this.largeVideoMode = VIDEO_PEER_MODE_Leave;
}

VideoPeer.prototype.SetObjPeer = function (sObjPeer) {
    var self = this;
    self.sObjPeer = sObjPeer;
};
VideoPeer.prototype.getObjPeer = function () {
    var self = this;
    return self.sObjPeer;
};

VideoPeer.prototype.updataHeartBeatStamp = function(iStamp){
    var self = this;
    self.videoHeartbeatStamp = iStamp;
    self.videoHeartbeatLost = false;
};
VideoPeer.prototype.checkHeartBeatLost = function (iStamp) {
    var self = this;
    if ((iStamp - self.videoHeartbeatStamp) > 30 && self.videoHeartbeatStamp != 0 && !self.videoHeartbeatLost) {
        self.videoHeartbeatLost = true;
        return true;
    }
    return false;
};




VideoPeer.prototype.smallVideoGetWndEle = function(sDivView){
    // Create the node and view.专门用来显示视频的node
    var self = this;
    var Node = this.Node;
    if(sDivView == ""){
        return "";
    }

    if (self.smallVideoWndEle == "") {
        self.smallVideoDivView = sDivView;
        self.smallVideoWndEle = Node.WndCreate(sDivView);
    }
    return self.smallVideoWndEle;
};

VideoPeer.prototype.largeVideoGetWndEle = function(sDivView){
    // Create the node and view.专门用来显示视频的node
    var self = this;
    var Node = this.Node;
    if(sDivView == ""){
        return "";
    }

    if (self.largeVideoWndEle == "") {
        self.largeVideoDivView = sDivView;
        self.largeVideoWndEle = Node.WndCreate(sDivView);
    }
    return self.smallVideoWndEle;
};

VideoPeer.prototype.smallVideoJoin = function (iStamp){
    var self = this;
    self.smallVideoRequestStamp = iStamp;
    self.smallVideoMode = VIDEO_PEER_MODE_Request;
};

VideoPeer.prototype.smallVideoJoinCheck = function (iStamp) {
    var self = this;
    return self.smallVideoRequestStamp > 0 && iStamp - self.smallVideoRequestStamp > 60 ;
};

VideoPeer.prototype.smallOnVideoJoin = function(iHandle, iStamp){
    var self = this;
    self.smallOnVideoJoinStamp = iStamp;
    self.smallVideoRequestHandle = iHandle;
    self.smallVideoMode = VIDEO_PEER_MODE_Response;
};

VideoPeer.prototype.smallOnVideoJoinCheck = function (iStamp) {
    var self = this;
    return self.smallOnVideoJoinStamp > 0 && iStamp - self.smallOnVideoJoinStamp > 60 ;
};

VideoPeer.prototype.smallVideoJoined = function (iStamp){
    var self = this;
    self.videoHeartbeatStamp = iStamp;
    self.smallVideoRequestStamp = 0;
    self.smallOnVideoJoinStamp = 0;
    self.smallVideoRequestHandle = 0;
    self.smallVideoMode = VIDEO_PEER_MODE_Join;
};

VideoPeer.prototype.smallVideoLeave = function(){
    var self = this;
    var Node = this;
    self.smallVideoRequestStamp = 0;
    self.smallOnVideoJoinStamp = 0;
    self.smallVideoRequestHandle = 0;
    if (self.smallVideoDivView != "") {
        Node.WndDestroy(self.smallVideoDivView);
        self.smallVideoDivView = "";
        self.smallVideoWndEle = "";
    }
    self.smallVideoMode = VIDEO_PEER_MODE_Leave;
};

VideoPeer.prototype.largeVideoJoin = function (iStamp){
    var self = this;
    self.largeVideoRequestStamp = iStamp;
    self.largeVideoMode = VIDEO_PEER_MODE_Request;
};

VideoPeer.prototype.smallVideoJoinCheck = function (iStamp) {
    var self = this;
    return self.smallVideoRequestStamp > 0 && iStamp - self.smallVideoRequestStamp > 60 ;
};

VideoPeer.prototype.largeOnVideoJoin = function(iHandle, iStamp){
    var self = this;
    self.largeOnVideoJoinStamp = iHandle;
    self.largeVideoRequestHandle = iStamp;
    self.largeVideoMode = VIDEO_PEER_MODE_Response;
};

VideoPeer.prototype.smallVideoJoinCheck = function (iStamp) {
    var self = this;
    return self.smallVideoRequestStamp > 0 && iStamp - self.smallVideoRequestStamp > 60 ;
};

VideoPeer.prototype.largeVideoJoined = function (iStamp){
    var self = this;
    self.videoHeartbeatStamp = iStamp;
    self.largeVideoRequestStamp = 0;
    self.largeOnVideoJoinStamp = 0;
    self.largeVideoRequestHandle = 0;
    self.largeVideoMode = VIDEO_PEER_MODE_Join;
};

VideoPeer.prototype.largeVideoLeave = function(){
    var self = this;
    var Node = this;
    self.largeVideoRequestStamp = 0;
    self.largeOnVideoJoinStamp = 0;
    self.largeVideoRequestHandle = 0;
    if (self.largeVideoDivView != "") {
        Node.WndDestroy(self.largeVideoDivView);
        self.largeVideoDivView = "";
        self.largeVideoWndEle = "";
    }
    self.largeVideoMode = VIDEO_PEER_MODE_Leave;
};

VideoPeer.prototype.Release = function(){
    var self = this;
    self.smallVideoLeave();
    self.largeVideoLeave();
};


module.exports = VideoPeer;