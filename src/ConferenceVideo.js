
// /* eslint-disable no-undef */
require('./pgLibNode');
require('./pgLibConferenceConst');
require('./ConferencePeer');
var VideoPeerList = require('./VideoPeerList');

var ACTIVE_TIMER_INTERVAL = 2;

var bPrewStart = false;
// var sWndEle = "";

function VideoOption (Node,sVideoParam) {
    // var self = this;
    // var Node = this.Node;
    var iVideoBitRate = _ParseInt(Node.omlGetContent(sVideoParam, "BitRate"), 300);
    var bVideoPortrait = _ParseInt(Node.omlGetContent(sVideoParam, "Portrait"), 0);
    // var bVideoRotate = _ParseInt(Node.omlGetContent(sVideoParam, "Rotate"), 0);
    var iCameraNo = _ParseInt(Node.omlGetContent(sVideoParam, "CameraNo"), 0);

    if (Node.ObjectAdd("_vTemp", "PG_CLASS_Video", "", 0)) {
        var sParam = "";
        if (iVideoBitRate != 0) {
            sParam = "(BitRate){" + iVideoBitRate + "}";
            Node.ObjectRequest("_vTemp", 2, "(Item){5}(Value){" + Node.omlEncode(sParam) + "}", "");
        }
        if (bVideoPortrait > 0) {
            Node.ObjectRequest("_vTemp", 2, "(Item){2}(Value){" + bVideoPortrait + "}", "");
        }
        if (iCameraNo >= 0) {
            Node.ObjectRequest("_vTemp", 2, "(Item){0}(Value){" + iCameraNo + "}", "");
        }
        Node.ObjectDelete("_vTemp");
    }
}
exports.VideoOption = VideoOption;
/**
 * 开始预览
 * @param {object} Node obj
 * @param {String} sParam 打开视频参数，如"(Code){0}(Mode){3}(Rate)(66)"    
 * @param {String} sDivPrew 显示预览的div ID名称
 * @param {function} OutString callback
 */
function PreviewStart (Node,sParam, sDivPrew,OutString) {
    if(Node == null || typeof Node == "undefined" || typeof sParam != "string" || typeof sDivPrew != "string" || sDivPrew == "" || typeof OutString != "function"){
        return PG_ERR_BadParam;
    }
    if(!bPrewStart){
        VideoOption(Node,sParam);

        var sWndEle = "";
        if (sDivPrew != "") {
            sWndEle = Node.WndCreate(sDivPrew);
        }
        if (sWndEle == "") {
            return PG_ERR_BadParam;
        }

        // Check video parameters.
        OutString("PreviewStart:  sParam=" + sParam + " ,sDivPrew = " + sDivPrew);

        var sCode = _ParseInt(Node.omlGetContent(sParam, "Code"), 0);
        var sMode = _ParseInt(Node.omlGetContent(sParam, "Mode"), 3);
        var sRate = _ParseInt(Node.omlGetContent(sParam, "Rate"), 66);
        if (sCode < 0 || sCode > 4) {
            OutString("PreviewStart: Invalid code: " + sCode);
            return PG_ERR_BadParam;
        }
        if (sMode < 0 || sMode > 31) {
            OutString("PreviewStart: Invalid mode: " + sMode);
            return PG_ERR_BadParam;
        }

        //
        Node.ObjectAdd("Prvw", "PG_CLASS_Video", "", 0x2);
        var sWndRect = "(Code){" + sCode + "}(Mode){" + sMode + "}(Rate){" + sRate + "}(Wnd){" + sWndEle + "}";
        var iErr = Node.ObjectRequest("Prvw", 32, sWndRect, "PrvwStart");
        if (iErr > 0) {
            OutString("VideoInit: Open Prvw failed. iErr=" + iErr);
            return iErr;
        }
    }
    bPrewStart = true;
    return PG_ERR_Normal;
}

/**
 * 停止预览
 * @param {String} sDivPrew divID 名称
 */
function PreviewStop (Node,sDivPrew) {
    if(bPrewStart){
        Node.ObjectRequest("Prvw", 33, "", "PrvwStop");
        Node.ObjectDelete("Prvw");
        Node.WndDestroy(sDivPrew);
    }
   
    bPrewStart = false;
}

/**
 *  描述：控制成员的视频流
 *  阻塞方式：非阻塞，立即返回
 *  iCameraNo：摄像头编号
 * @return {boolean}
 */

function VideoSource (Node,iCameraNo) {
   
    if (Node.ObjectAdd("_vTemp_1", "PG_CLASS_Video", "", 0x2)) {
        Node.ObjectRequest("_vTemp_1", 2, "(Item){0}(Value){" + iCameraNo + "}", "");
        Node.ObjectDelete("_vTemp_1");
        return true;
    }
    return false;
}

/*
 * 描述:采集图像角度切换
 * 阻塞方式：非阻塞，立即返回
 * iAngle:角度
 *
 * */

function VideoSetRotate (Node,iAngle) {
    if (Node != null) {
        if (Node.ObjectAdd("_vTemp", "PG_CLASS_Video", "", 0)) {
            Node.ObjectRequest("_vTemp", 2, "(Item){2}(Value){" + iAngle + "}", "");
            Node.ObjectDelete("_vTemp");
        }
    }
}

//control capture open or close 
/**
 *  描述：摄像头控制。
 *  阻塞方式：非阻塞，立即返回
 *  返回值： true 操作成功，false 操作失败
 * @return {boolean}
 */

function CameraSwitch (Node,bEnable,OutString) {

    var bRet = false;
    if (Node.ObjectAdd("_vSwitch", "PG_CLASS_Video", "", 0)) {

        var iEnable = bEnable ? 1 : 0;
        var sData = "(Item){9}(Value){" + iEnable + "}";
        var iErr = Node.ObjectRequest("_vSwitch", 2, sData, "SetOption");
        if (iErr > 0) {
            OutString("CameraSwitch: Set option, iErr=" + iErr);
        } else {
            bRet = true;
        }

        Node.ObjectDelete("_vSwitch");
    }

    return bRet;

}

exports.PreviewStart = PreviewStart;
exports.PreviewStop = PreviewStop;
exports.VideoSource = VideoSource;
exports.CameraSwitch = CameraSwitch;
exports.VideoSetRotate = VideoSetRotate;


function ConferenceVideo(opts,sVideoParam,sGroupName){
    // var self = this;
    var Node = this.Node = opts.Node;
    this.OutString = opts.OutString;
    this.sObjG = "_G_" + sGroupName;
    this.sObjV = "_V_" + sGroupName;
	this.sObjLV = "_LV_" + sGroupName;

    this.videoPeerList = new VideoPeerList(Node);

    this.sVideoParam = sVideoParam;

    // 视频连接状态检测
    this.iTimerExpire = 10;
    
    this.iTimerStamp = 0;
    this.iTimerStampLastCheck = 0;
    this.iTimerItem = 0;

    this.bApiVideoStart = false;
    this.bLApiVideoStart = false;

    this.IsLarge = function(sObjV){
        if(sObjV.indexOf("_LV_") == 0){
            return true;
        }else if(sObjV.indexOf("_V_") == 0){
            return false;
        }
        return false;
    };

    VideoOption(sVideoParam);
}


ConferenceVideo.prototype.VideoCreate = function (iFlag,bLarge,sVideoParam) {
    // var self = this;
    var Node = this.Node;
    var OutString = this.OutString;
    var sObjV = bLarge?this.sObjLV:this.sObjV;
    var sObjG = this.sObjG;

    var iVideoCode = _ParseInt(Node.omlGetContent(sVideoParam, "Code"), 3);
    var iVideoMode = _ParseInt(Node.omlGetContent(sVideoParam, "Mode"), 2);
    var iVideoFrmRate = _ParseInt(Node.omlGetContent(sVideoParam, "FrmRate"), 40);

    if(bLarge){
        iVideoCode = _ParseInt(Node.omlGetContent(sVideoParam, "LCode"), 3);
        iVideoMode = _ParseInt(Node.omlGetContent(sVideoParam, "LMode"), 2);
        iVideoFrmRate = _ParseInt(Node.omlGetContent(sVideoParam, "LFrmRate"), 40);
    }

    
    OutString("ConferenceVideo.VideoCreate iFlag = " + iFlag);

    var uFlag = 0x10000 | 0x1 | 0x10 | 0x20;
    switch (iFlag) {
    case VIDEO_OnlyInput:
    {
        uFlag = uFlag | 0x4;
        break;
    }
    case VIDEO_OnlyOutput:
    {
        uFlag = uFlag | 0x8;
        break;
    }
    case VIDEO_Normal:
    {
        break;
    }
    default:
        break;
    }


    if (!Node.ObjectAdd(sObjV, "PG_CLASS_Video", sObjG, uFlag)) {
        OutString("ConferenceVideo.VideoCreate: Add 'Video' failed.");
        return false;
    }

    var sData = "(Code){" + iVideoCode + "}(Mode){" + iVideoMode + "}(Rate){" + iVideoFrmRate + "}";

    var iErr = Node.ObjectRequest(sObjV, PG_METH_VIDEO_Open, sData, "ConferenceVideo.VideoOpen");
    if (iErr > 0) {
        OutString("ConferenceVideo.VideoCreate: Open failed. iErr=" + iErr);
        return false;
    }

    return true;
};

ConferenceVideo.prototype.onVideoSync = function(sObj, uMeth, sData, uHandle, sObjPeer){
    var sAct = this.m_Node.omlGetContent(sData, "Action");
    if (sAct == "1") {
        var sPeer3 = this._ObjPeerParsePeer(sObjPeer);
        this.EventProc("VideoSyncL", "", sPeer3);
    }
};

ConferenceVideo.prototype.VideoDestroy = function (bLarge) {
    // var self = this;
    var Node = this.Node;
    // var OutString = this.OutString;
    var sObjV = bLarge?this.sObjLV:this.sObjV;

    Node.ObjectRequest(sObjV, PG_METH_VIDEO_Close, "", "VideoClose:" + sObjV);
    Node.ObjectDelete(sObjV);
};

	

ConferenceVideo.prototype.videoOpenRequest = function (sObjPeer, sDivView, bLarge,iStamp) {
    var self = this;
    var Node = this.Node;
    var OutString = this.OutString;

    OutString("ConferenceVideo.videoOpenRequest :sObjPeer=" + sObjPeer);
    
    var oPeer = self.videoPeerList.Add(sObjPeer);

    var sObjV = "";
    var sWndEle = "";
    if(bLarge){
        sObjV = this.sObjLV;
        sWndEle = oPeer.largeVideoGetWndEle(sDivView);
    }else{
        sObjV = this.sObjV;
        sWndEle = oPeer.smallVideoGetWndEle(sDivView);
    }

    var sData = ""; 
    if (typeof sWndEle == "string" && sWndEle != "") {
        sData = "(Peer){" + Node.omlEncode(sObjPeer) + "}(Wnd){" + sWndEle + "}";

        OutString("ConferenceVideo.videoOpenRequest: sData=" + sData);
        var sParamTmp = "videoOpenRequest:" + sObjPeer;
        //noinspection JSDuplicatedDeclaration
        var iErr1 = Node.ObjectRequest(sObjV, 35, sData, sParamTmp);
        if(iErr1 > 0){
            OutString("ConferenceVideo.videoOpenRequest: iErr =" + iErr1);
            return iErr1;
        }
        if(bLarge){
            oPeer.largeVideoJoin(iStamp);
        }else{
            oPeer.smallVideoJoin(iStamp);
        }
    } 
       

    // Reset request status.
};


ConferenceVideo.prototype.onVideoOpenRequest = function (sObj, sData, iHandle, sObjPeer) {
    var self = this;
    var OutString = this.OutString;
    var iActiveStamp = this.iActiveStamp;
    var oPeer = self.videoPeerList.Add(sObjPeer);
    
    var sAct = "";
    if (sObj.indexOf("_LV_") == 0) {
        sAct = EVENT_VIDEO_OPEN;
        oPeer.largeOnVideoJoin(iHandle,iActiveStamp);
    }else{
        sAct = EVENT_VIDEO_OPEN_1;
        oPeer.smallOnVideoJoin(iHandle,iActiveStamp);
    }
    OutString("Video _VideoJoin iHandle=" + oPeer.iHandle);
    // var sPeer = this._ObjPeerParsePeer(sObjPeer);
    self.EventProc(sAct, sData, sObjPeer);
};

/**
 *  描述：拒绝打开某一成员的视频
 *  阻塞方式：非阻塞，立即返回
 *   返回值： true 操作成功，false 操作失败
 *   sPeer:成员节点名
 */
ConferenceVideo.prototype.videoOpenResponse = function (sObjPeer, iErrResponse, sDivView, bLarge,iStamp) {
    // if (!this.bApiVideoStart) {
    //     this.OutString("ConferenceVideo.videoOpenResponse: not init!");
    //     return;
    // }
    
    var self = this;
    var Node = this.Node;
    var OutString = this.OutString;

    if (typeof sObjPeer !="string" || sObjPeer == "") {
        OutString("ConferenceVideo.videoOpenResponse:sObjPeer = " + sObjPeer);
        return;
    }
    
    var oRet = self.videoPeerList.Search(sObjPeer);
    var oPeer = oRet.Object;
    if (oPeer == null) {
        OutString("ConferenceVideo.videoOpenResponse: No Request , sObjPeer = " + sObjPeer);
        return;
    }

    var sObjV;
    var iHandle;
    var sWndEle;
    var VideoJoined;
    if (bLarge) {
        sObjV = this.sObjLV;
        iHandle = oPeer.largeVideoRequestHandle;
        sWndEle = oPeer.largeVideoGetWndEle(sDivView);
        VideoJoined = oPeer.largeVideoJoined;
    } else {
        sObjV = this.sObjV;
        iHandle = oPeer.smallVideoRequestHandle;
        sWndEle = oPeer.smallVideoGetWndEle(sDivView);
        VideoJoined = oPeer.smallVideoJoined;
    }
    OutString("ConferenceVideo.videoOpenResponse:Video open Relay iHandle=" + iHandle);
    

    var sData;
    if (iErrResponse == 0) {
        if (typeof sWndEle == "string" && sWndEle != "") {
            sData = "(Peer){" + Node.omlEncode(sObjPeer) + "}(Wnd){" + sWndEle + "}";
        }
    }else{
        sData = "";
    }
    OutString("ConferenceVideo.videoOpenResponse:sData = " + sData);
    var iErrTemp = Node.ObjectExtReply(sObjV, iErrResponse, sData, iHandle);
    if (iErrTemp > 0) {
        OutString("ConferenceVideo.videoOpenResponse: Reply, iErr=" + iErrTemp);
        self.videoClose(sObjPeer,bLarge);
    }else{
        VideoJoined(iStamp);
    }
};


ConferenceVideo.prototype.onVideoJoinReply = function(sObj, iErr, sData, sParam){
     //视频加入通知
    //  var sParamTmp = "videoOpenRequest:" + sObjPeer;
    var self = this;
    var sObjPeer =  sParam.substring(17);
    var oRet = self.videoPeerList.Search(sObjPeer);
    var oPeer = oRet.Object;
    if(oPeer){
        var bLarge = self.IsLarge(sObj);
        var VideoJoined;
        var VideoLeave;
        if(bLarge){
            VideoJoined = oPeer.largeVideoJoined;
            VideoLeave = oPeer.largeVideoLeave;
        }else{
            VideoJoined = oPeer.smallVideoJoined;
            VideoLeave = oPeer.smallVideoLeave;
        }

        if(iErr > 0) {
            VideoLeave();
        }else{
            VideoJoined(self.iActiveStamp);
        }
    }

    self.EventProc("VideoJoin", "" + iErr, sObjPeer);
    return 1;
};

ConferenceVideo.prototype.videoClose = function (sObjPeer,bLarge) {
    var Node = this.Node;
    var self = this;
    var OutString = this.OutString;

    OutString("ConferenceVideo.videoClose : sObjPeer" + sObjPeer);

    var oRet = self.videoPeerList.Search(sObjPeer);
    var oPeer = oRet.Object;
    if(oPeer){
        var sObjV = "";
        var VideoLeave;
        if (bLarge) {
            sObjV = this.sObjLV;
            VideoLeave = oPeer.largeVideoLeave();
        } else {
            sObjV = this.sObjV;
            VideoLeave = oPeer.smallVideoLeave();
        }

        var sData = "(Peer){" + Node.omlEncode(sObjPeer) + "}";
        Node.ObjectRequest(sObjV, 36, sData, "videoClose:" + sObjPeer);
        VideoLeave();
    }
};

ConferenceVideo.prototype.onVideoLeave = function (sObj, uMeth, sData, uHandle, sObjPeer) {
    var self = this;
    // var Node = this.Node;
    var OutString = this.OutString;
    OutString("ConferenceVideo.onVideoLeave sObjV" + sObj + " sObjPeer = " + sObjPeer);
    var oRet = self.videoPeerList.Search(sObjPeer);
    var oPeer = oRet.Object;
    var bLarge = self.IsLarge(sObj);
    if(oPeer){

        if (bLarge) {
            oPeer.largeVideoLeave();
        } else {
            oPeer.smallVideoLeave();
        }
    }
    var sAct = bLarge?EVENT_VIDEO_CLOSE_1 : EVENT_VIDEO_CLOSE;
    self.EventProc(sAct, sData, sObjPeer);
};


ConferenceVideo.prototype.onVideoFrameStat = function (sObj, uMeth, sData, uHandle, sObjPeer) {
    var self = this;
    var Node = this.Node ;
    var sGetObjPeer = Node.omlGetContent(sData, "Peer");
    var sFrmTotal = Node.omlGetContent(sData, "Total");
    var sFrmDrop = Node.omlGetContent(sData, "Drop");
    var bLarge = self.IsLarge(sObj);
    var sAct = bLarge? EVENT_VIDEO_FRAME_STAT_1 : EVENT_VIDEO_FRAME_STAT;
    self.EventProc(sAct, (sFrmTotal + ":" + sFrmDrop), sGetObjPeer);
};


//control someone enable have video
/**
 *  描述：控制成员的视频流
 *  阻塞方式：非阻塞，立即返回
 * @return {boolean}
 */
ConferenceVideo.prototype.VideoControl = function (sObjPeer, bEnable,bLarge) {
    
    var self = this;
    var Node = this.Node;
    var OutString = this.OutString;

    if (!this.bApiVideoStart) {
        OutString("ConferenceVideo.VideoControl: bApiVideoStart");
        return false;
    }
   
    var iFlag = bEnable ? 1 : 0;
    if (typeof sObjPeer != "string" || sObjPeer == "") {
        return false;
    }

    var sObjV = bLarge?self.sObjLV: self.sObjV;

    var sIn = "(Peer){" + Node.omlEncode(sObjPeer) + "}(Local){" + iFlag + "}(Remote){" + iFlag + "}";
    Node.ObjectRequest(sObjV, 39, sIn, "VideoControl");
    return true;

};

/*
 * 描述：抓拍 sPeer 节点的图片
 * 阻塞方式：非阻塞，立即返回
 * 参数：sPeer 节点名  sPath 路径
 * @return {boolean}
 */
ConferenceVideo.prototype.VideoCamera = function (sObjPeer, sPath, bLarge) {
    var self = this;
    var Node = this.Node;
    var OutString = this.OutString;

    var sPathTemp = sPath;
    if (sPathTemp.lastIndexOf(".jpg") < 0 && sPathTemp.lastIndexOf(".JPG") < 0) {
        sPathTemp += ".jpg";
    }

    var sObjV = bLarge?self.sObjLV: self.sObjV;
   
    var sIn = "(Peer){" + Node.omlEncode(sObjPeer) + "}(Path){" + Node.omlEncode(sPathTemp) + "}";
    var iErr = Node.ObjectRequest(sObjV, PG_METH_VIDEO_Camera, sIn, "VideoCamera:" + sObjPeer);
    if (iErr != 0) {
        OutString("VideoCamera Error  = " + iErr);
        return false;
    }

    return true;
};


ConferenceVideo.prototype.onVideoCameraReply = function (sObj, iErr, sData, sParam) {
    var self = this;
    var Node = this.Node;
    

    var sObjPeer = Node.omlGetContent(sData, "Peer");
    var sPath = Node.omlGetContent(sData, "Path");
    var bLarge = self.IsLarge(sObj);
    var sAct = bLarge ? EVENT_VIDEO_CAMERA : EVENT_VIDEO_CAMERA_1;
    this.EventProc(sAct, sPath, sObjPeer);
};

ConferenceVideo.prototype.onVideoRecordReply = function (sObj, iErr, sData, sParam) {
    var self = this;
    var Node = this.Node;
    var sObjPeer = Node.omlGetContent(sData, "Peer");
    var sPath = Node.omlGetContent(sData, "Path");
    // var sPeer = this._ObjPeerParsePeer(sObjPeer);

    var bLarge = self.IsLarge(sObj);
    var sAct = bLarge ? EVENT_VIDEO_RECORD : EVENT_VIDEO_RECORD_1;

    this.EventProc(sAct, sPath, sObjPeer);
};


ConferenceVideo.prototype.sendTimerActive = function(sObjPeer){
    var Node = self.Node;
    Node.ObjectRequest(sObjPeer, PG_METH_PEER_Message, "Active?", "MessageSendActive");
};
ConferenceVideo.prototype.onRecvTimerActive = function(sObjPeer){
    var self = this;
     var oRet = self.videoPeerList.Search(sObjPeer);
    var oPeer = oRet.Object;
    if (oPeer != null) {
        oPeer.updataHeartBeatStamp(self.iTimerStamp);
    }
};
	
ConferenceVideo.prototype.TimerStart = function(){
    var self = this;
    self.iTimerItem = setInterval(function(self){

        if(self.iTimerStamp - self.iTimerStampLastCheck > 10){
            self.videoPeerList.Traversing(function(oPeer,i,self){
                
                if(oPeer.smallVideoMode == VIDEO_PEER_MODE_Join || oPeer.largeVideoMode == VIDEO_PEER_MODE_Join){
                    //检测心跳超时
                    if (oPeer.checkHeartBeatLost(self.iTimerStamp)) {
                        self.EventProc(EVENT_VIDEO_LOST, "", oPeer.sObjPeer);
                    }
                    //发送心跳
                    self.sendTimerActive(oPeer.sObjPeer);
                }

                //自动关闭检测
                // if(oPeer.smallVideoMode == VIDEO_PEER_MODE_Request){
                    
                // }
                // if(oPeer.smallVideoMode == VIDEO_PEER_MODE_Response){

                // }
                // if(oPeer.largeVideoMode == VIDEO_PEER_MODE_Request){
                    
                // }
                // if(oPeer.largeVideoMode == VIDEO_PEER_MODE_Response){

                // }
            },self);

            self.iTimerStampLastCheck = self.iTimerStamp;
        }

        self.iTimerStamp += 1;
    },1000,self);
};


ConferenceVideo.prototype.OnExtRequestVideo = function(sObj, uMeth, sData, uHandle, sObjPeer){
    var self = this;
    if (uMeth == 0) {
        return self.onVideoSync(sObj, uMeth, sData, uHandle, sObjPeer);
    } else if (uMeth == 35) {
        self.onVideoOpenRequest(sObj, uMeth, sData, uHandle, sObjPeer);
        return -1; //异步同意
    } else if (uMeth == 36) {
        self.onVideoLeave(sObj, uMeth, sData, uHandle, sObjPeer);
    } else if (uMeth == 40) {
        self.onVideoFrameStat(sObj, uMeth, sData, uHandle, sObjPeer);
    }
    return 0;
};

ConferenceVideo.prototype.OnReplyVideo = function(sObj, iErr, sData, sParam) {
    var self = this;
    if (sParam.indexOf("videoOpenRequest") == 0) {
        return self.onVideoJoinReply(sObj, iErr, sData, sParam);
    }
    if (sParam.indexOf("VideoCamera") == 0) {
        return self.onVideoCameraReply(sObj, iErr, sData, sParam);
    }
    if (sParam.indexOf("VideoRecord") == 0) {
        return self.onVideoRecordReply(sObj, iErr, sData, sParam);
    }
    return 0;
};

module.exports = ConferenceVideo;