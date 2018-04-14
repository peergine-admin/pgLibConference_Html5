/*************************************************************************
  copyright   : Copyright (C) 2014, chenbichao, All rights reserved.
              : www.peergine.com, www.pptun.com
              :
  filename    : pgLibConference.js
  discription : 
  modify      :

*************************************************************************/
/**
 * Updata 2017/02/014 v13
 * 继续优化心跳包。
 * 删除会议模块在离线事件和离开会议后的主动清理视频的代码。
 * 修复上报离线事件后再次连接上报同步消息。
 * 修复主席端对同一节点反复上报离线消息。
 * 修复反复上报VideoLost消息。
 * 修改PG_PEER 的列表添加位置，由加入会议添加，离开会议删除，改为视频打开或收到请求添加，视频关闭删除
 * 修改函数VideoOpen中对同一节点的Node和View，由新建改为继承。
 * 修改Keep函数中的列表的遍历方式。
 * 修改ServiceStart的执行位置，使得可以在SDK Initialze 后可以在之后任意位置VideoStart 和AudioStart
 * 函数执行打印信息
 *
 * 开放定时器
 *    相关接口TimerOut
 *  相关函数：
 *    TimerOutAdd  把接口TimerOut的实现加入定时器处理
 *    TimerOutDel  把接口TimerOut的实现从定时器处理中删除
 *    TimerStart  开始一个定时器处理
 *    TimerStop  对定时时间长或者循环定时进行停止操作
 *
 * */

/**
 * VideoStart 时的视频接收模式。
 */
var pgVideoPutMode = {
    Normal: 0,
    OnlyInput: 1,
    OnlyOutput: 2,
};


/**
 * 
 */
var _NodeCallBack = {

    _mConf: null,

    OnExtRequest: function(sObj, uMeth, sData, uHandle, sPeer) {
        if (_NodeCallBack._mConf) {
            return _NodeCallBack._mConf._OnExtRequest(sObj, uMeth, sData, uHandle, sPeer);
        }
        return 0;
    },
    OnReply: function(sObj, iErr, sData, sParam) {
        if (_NodeCallBack._mConf) {
            return _NodeCallBack._mConf._OnReply(sObj, iErr, sData, sParam);
        }
        return 1;
    },
    OnTimer: function(sExec) {
        if (_NodeCallBack._mConf) {
            return _NodeCallBack._mConf._OnTimer(sExec);
        }
        return 1;
    },
    OnTimeout: function(sExec) {
        if (_NodeCallBack._mConf) {
            return _NodeCallBack._mConf._OnTimeout(sExec);
        }
        return 1;
    }
};

var PUBLIC_CONST = {
    PG_ERR_Normal: 0,
    PG_ERR_System: 1,
    PG_ERR_BadParam: 2,
    PG_ERR_BadClass: 3,
    PG_ERR_BadMethod: 4,
    PG_ERR_BadObject: 5,
    PG_ERR_BadStatus: 6,
    PG_ERR_BadFile: 7,
    PG_ERR_BadUser: 8,
    PG_ERR_BadPass: 9,
    PG_ERR_NoLogin: 10,
    PG_ERR_Network: 11,
    PG_ERR_Timeout: 12,
    PG_ERR_Reject: 13,
    PG_ERR_Busy: 14,
    PG_ERR_Opened: 15,
    PG_ERR_Closed: 16,
    PG_ERR_Exist: 17,
    PG_ERR_NoExist: 18,
    PG_ERR_NoSpace: 19,
    PG_ERR_BadType: 20,
    PG_ERR_CheckErr: 21,
    PG_ERR_BadServer: 22,
    PG_ERR_BadDomain: 23,
    PG_ERR_NoData: 24,
    PG_ERR_Unknown: 0xff,


    EVENT_LOGIN: "Login",
    EVENT_LOGOUT: "Logout",
    EVENT_VIDEO_LOST: "VideoLost",

    EVENT_AUDIO_SYNC: "AudioSync",
    EVENT_AUDIO_CTRL_VOLUME: "AudioCtrlVolume",
    EVENT_VIDEO_SYNC: "VideoSync",
    EVENT_VIDEO_SYNC_1: "VideoSyncL",
    EVENT_VIDEO_OPEN: "VideoOpen",
    EVENT_VIDEO_OPEN_1: "VideoOpenL",
    EVENT_VIDEO_CLOSE: "VideoClose",
    EVENT_VIDEO_CLOSE_1: "VideoCloseL",
    EVENT_VIDEO_FRAME_STAT: "VideoFrameStat",
    EVENT_VIDEO_FRAME_STAT_1: "VideoFrameStatL",
    EVENT_VIDEO_JOIN: "VideoJoin",
    EVENT_VIDEO_CAMERA: "VideoCamera",
    EVENT_VIDEO_RECORD: "VideoRecord",

    EVENT_CHAIRMAN_SYNC: "ChairmanSync",
    EVENT_CHAIRMAN_OFFLINE: "ChairmanOffline",
    EVENT_PEER_SYNC: "PeerSync",
    EVENT_PEER_OFFLINE: "PeerOffline",


    EVENT_ASK_JOIN: "AskJoin",
    EVENT_ASK_LEAVE: "AskLeave",
    EVENT_JOIN: "Join",
    EVENT_LEAVE: "Leave",

    EVENT_MESSAGE: "Message",
    EVENT_NOTIFY: "Notify",
    EVENT_SVR_NOTIFY: "SvrNotify",
    EVENT_SVR_REPLYR_ERROR: "SvrReplyError",
    EVENT_SVR_RELAY: "SvrReply",
    EVENT_CALLSEND_RESULT: "CallSend",

    EVENT_LAN_SCAN_RESULT: "LanScanResult",


    AUDIO_Speech: 0,
    AUDIO_NoSpeechSelf: 1,
    AUDIO_NoSpeechPeer: 2,
    AUDIO_NoSpeechSelfAndPeer: 3,

    VIDEO_Normal: 0,
    VIDEO_OnlyInput: 1,
    VIDEO_OnlyOutput: 2,
};

var PRIVATE_CONST = {
    ID_PREFIX: "_DEV_",
    KEEP_TIMER_INTERVAL: 2,
    ACTIVE_TIMER_INTERVAL: 2,
    LIB_VER: "19",
    _ParseInt: function(sVal, idefVal) {
        try {
            if (sVal != "") {
                return parseInt(sVal);
            }
            return idefVal;
        } catch (e) {
            return idefVal;
        }
    },
    _AddrToReadable: function(sAddr) {
        try {
            var sAddrSect = sAddr.split(":", 6);
            if (sAddrSect.length < 6) {
                return sAddr;
            }

            var sReadable = "";
            if (sAddrSect[0] == "0" &&
                sAddrSect[1] == "0" &&
                sAddrSect[2] == "0" &&
                sAddrSect[3] != "0" &&
                sAddrSect[3] != "1") {
                var iIP = parseInt(sAddrSect[3], 16);
                var iIP0 = (iIP >> 24) & 0xff;
                var iIP1 = (iIP >> 16) & 0xff;
                var iIP2 = (iIP >> 8) & 0xff;
                var iIP3 = (iIP & 0xff);
                sReadable = (iIP0 + "." + iIP1 + "." + iIP2 + "." + iIP3 + ":" + sAddrSect[4]);
            } else {
                var iIP0 = parseInt(sAddrSect[0], 16);
                var iIP1 = parseInt(sAddrSect[1], 16);
                var iIP2 = parseInt(sAddrSect[2], 16);
                var iIP3 = parseInt(sAddrSect[3], 16);

                var iWord0 = (iIP0 >> 16) & 0xffff;
                var iWord1 = (iIP0 & 0xffff);

                var iWord2 = (iIP1 >> 16) & 0xffff;
                var iWord3 = (iIP1 & 0xffff);

                var iWord4 = (iIP2 >> 16) & 0xffff;
                var iWord5 = (iIP2 & 0xffff);

                var iWord6 = (iIP3 >> 16) & 0xffff;
                var iWord7 = (iIP3 & 0xffff);

                sReadable = ("[" + iWord0.toString(16) + ":" + iWord1.toString(16) + ":" + iWord2.toString(16) +
                    ":" + iWord3.toString(16) + ":" + iWord4.toString(16) + ":" + iWord5.toString(16) +
                    ":" + iWord6.toString(16) + ":" + iWord7.toString(16) + "]:" + sAddrSect[4]);
            }

            return sReadable;
        } catch (e) {
            return sAddr;
        }
    }
};

function PG_NODE_CFG() {
    this.Type = 0;
    this.Option = 1;

    this.MaxPeer = 256;
    this.MaxGroup = 32;
    this.MaxObject = 512;
    this.MaxCast = 512;
    this.MaxHandle = 512;
    this.SKTBufSize0 = 128;
    this.SKTBufSize1 = 64;
    this.SKTBufSize2 = 256;
    this.SKTBufSize3 = 64;
    this.P2PTryTime = 1;
}

function PG_SELF() {
    this.sObjSelf = "";
    this.sUser = "";
    this.sPass = "";

    this.sVideoParam = "";
    //Video 默认参数
    this.iVideoCode = 0;
    this.iVideoMode = 0;
    this.iVideoFrmRate = 0;

    this.iLVideoCode = 0;
    this.iLVideoMode = 0;
    this.iLVideoFrmRate = 0;

    this.iVideoBitRate = 0;
    this.bVideoPortrait = 0;
    this.bVideoRotate = 0;
    this.iCameraNo = 0;

    //Audio 默认参数
    this.iAudioSpeechDisable = 0;

    this.Init = function(sUser, sPass, sVideoParam, mNode) {
        this.sUser = sUser;
        this.sPass = sPass;

        this.sVideoParam = sVideoParam;

        this.iVideoCode = PRIVATE_CONST._ParseInt(mNode.omlGetContent(sVideoParam, "Code"), 3);
        this.iVideoMode = PRIVATE_CONST._ParseInt(mNode.omlGetContent(sVideoParam, "Mode"), 2);
        this.iVideoFrmRate = PRIVATE_CONST._ParseInt(mNode.omlGetContent(sVideoParam, "FrmRate"), 40);

        this.iLVideoCode = PRIVATE_CONST._ParseInt(mNode.omlGetContent(sVideoParam, "LCode"), 3);
        this.iLVideoMode = PRIVATE_CONST._ParseInt(mNode.omlGetContent(sVideoParam, "LMode"), 2);
        this.iLVideoFrmRate = PRIVATE_CONST._ParseInt(mNode.omlGetContent(sVideoParam, "LFrmRate"), 40);

        this.iVideoBitRate = PRIVATE_CONST._ParseInt(mNode.omlGetContent(sVideoParam, "BitRate"), 400);
        this.bVideoPortrait = PRIVATE_CONST._ParseInt(mNode.omlGetContent(sVideoParam, "Portrait"), 0);
        this.bVideoRotate = PRIVATE_CONST._ParseInt(mNode.omlGetContent(sVideoParam, "Rotate"), 0);
        this.iCameraNo = PRIVATE_CONST._ParseInt(mNode.omlGetContent(sVideoParam, "CameraNo"), 0);

        iAudioSpeechDisable = PRIVATE_CONST._ParseInt(mNode.omlGetContent(sVideoParam, "AudioSpeechDisable"), 0);
        if (iAudioSpeechDisable == 0) {
            iAudioSpeechDisable = PRIVATE_CONST._ParseInt(mNode.omlGetContent(sVideoParam, "AudioSpeech"), 0);
        }

        this.sObjSelf = "_DEV_" + sUser;
    };
}

function PG_SVR() {
    this.sSvrName = "";
    this.sSvrAddr = "";
    this.sRelayAddr = "";

    this.Init = function(sSvrName, sSvrAddr, sRelayAddr) {
        this.sSvrName = sSvrName;
        this.sSvrAddr = sSvrAddr;
        this.sRelayAddr = sRelayAddr;
    };
}

function PG_GROUP() {
    this.bEmpty = true;

    this.iKeepTimer = -1;
    this.iActiveTimer = -1;

    this.sName = "";
    this.sChair = "";
    this.sUser = "";

    this.bChairman = false;
    this.sObjChair = "";

    this.sObjG = "";
    this.sObjD = "";
    this.sObjV = "";
    this.sObjLV = "";
    this.sObjA = "";

    this.Init = function(sName, sChair, sUser) {
        this.sName = sName;
        this.sChair = sChair;
        this.sUser = sUser;
        if (this.sName == ("") || this.sChair == ("")) {
            bEmpty = true;
        } else {
            this.bEmpty = false;

            this.iKeepTimer = -1;
            this.iActiveTimer = -1;

            this.bChairman = this.sChair == (this.sUser);
            this.sObjChair = PRIVATE_CONST.ID_PREFIX + sChair;
            this.sObjG = "_G_" + sName;
            this.sObjD = "_D_" + sName;
            this.sObjV = "_V_" + sName;
            this.sObjLV = "_LV_" + sName;
            this.sObjA = "_A_" + sName;
        }
    };
}

function PG_STATUS() {
    this.bInitialized = false;
    this.bLogined = false;
    this.bServiceStart = false;
    this.bApiVideoStart = false;
    this.bApiAudioStart = false;
    this.bEventEnable = true;
    this.iVideoInitFlag = 0;

    this.restore = function() {
        this.bInitialized = false;
        this.bLogined = false;
        this.bServiceStart = false;
        this.bApiVideoStart = false;
        this.bApiAudioStart = false;
        this.bEventEnable = true;
        this.iVideoInitFlag = 0;
    };
}

function PG_STAMP() {
    // 视频连接状态检测
    this.iActiveExpire = 10;
    this.iActiveStamp = 0;

    // 节点连接状态检测
    this.iExpire = 10;
    this.iKeepStamp = 0;
    this.iKeepChainmanStamp = 0;
    this.iRequestChainmanStamp = 0;

    this.restore = function() {
        this.iActiveStamp = 0;
        this.iKeepStamp = 0;
        this.iKeepChainmanStamp = 0;
        this.iRequestChainmanStamp = 0;
    };
}

function PG_LANSCAN() {
    this.bApiLanScan = false;
    this.sLanScanRes = "";
    this.sLanAddr = "";
    this.bPeerCheckTimer = false;
}

function PG_PEER(sObjPeer) {
    this.sObjPeer = sObjPeer;
    this.divView = "";
    this.sWndEle = "";
    this.iStamp = 0;
    this.iActStamp = 0;
    this.iHandle = 0;
    this.bRequest = false;
    this.bLarge = false;


    this.restore = function() {
        this.divView = "";
        this.sWndEle = "";
        this.iActStamp = 0;
        this.iHandle = 0;
        this.bRequest = false;
        this.bLarge = false;

    };
}

function PG_SYNC(sObjPeer) {
    this.sObjPeer = sObjPeer;
    this.iKeepStamp = 0;
}


function pgLibConference(Node, OnEventListener) {
    // Check peergine Activex object
    if (!Node || typeof(Node.Control) == "undefined") {
        alert("pgLibConference: oAtx is invalid.");
        return null;
    }

    // Check callback object.
    if (!OnEventListener || typeof(OnEventListener.OnEvent) != "function") {
        alert("pgLibConference: oUI is invalid.");
        return null;
    }

    this.LIB_VER = PRIVATE_CONST.LIB_VER;

    this.m_sConfig_Control = "Type=1;LogLevel0=1;LogLevel1=1";
    this.m_sConfig_Node = "Type=0;Option=1;MaxPeer=256;MaxGroup=32;MaxObject=512;MaxMCast=512;MaxHandle=256;SKTBufSize0=128;SKTBufSize1=64;SKTBufSize2=256;SKTBufSize3=64;P2PTryTime=1";

    this.m_Self = new PG_SELF();

    this.m_InitGroup = new PG_GROUP();
    this.m_Group = new PG_GROUP();
    this.m_Status = new PG_STATUS();
    this.m_Stamp = new PG_STAMP();
    this.m_LanScan = new PG_LANSCAN();


    // Store ActiveX object and UI callback object.
    this.m_Node = Node;
    this.mEventProcListener = OnEventListener;

    this.m_sInitSvrName = "pgConnectSvr";
    this.m_sInitSvrAddr = "";

    // Status members.
    this.m_sObjSvr = "";
    this.m_sSvrAddr = "";
    this.m_sRelayAddr = "";
    this.m_bReportPeerInfo = true;
    this.m_listVideoPeer = [];

    this._VideoPeerSearch = function(sObjPeer) {
        this.OutString("->VideoPeerSearch");

        if (sObjPeer == "") {
            this.OutString("VideoPeerSearch can't Search Start");
            return null;
        }

        for (var i = 0; i < this.m_listVideoPeer.length; i++) {

            if (this.m_listVideoPeer[i].sObjPeer == sObjPeer) {
                return this.m_listVideoPeer[i];
            }
        }
        return null;
    };

    this.m_listSyncPeer = [];
    //搜索加入会议的节点
    this._SyncPeerSearch = function(sObjPeer) {
        if (sObjPeer == "") {
            this.OutString("VideoPeerSearch can't Search Start");
            return null;
        }
        for (var i = 0; i < this.m_listSyncPeer.length; i++) {
            if (this.m_listSyncPeer[i].sObjPeer == sObjPeer) {
                return this.m_listSyncPeer[i];
            }
        }

        return null;
    };


    ///------------------------------------------------------------------------------
    // API methods.

    /**
     * 描述：获取自身的P2P节点名
     * 阻塞方式：非阻塞，立即返回。
     * 返回值：自身的P2P节点名
     * 作用：扩展时利用此类，进行底层操作。
     */
    this.GetNode = function() {
        return this.m_Node;
    };

    /**
     *  描述：获取自身的P2P节点名
     *  阻塞方式：非阻塞，立即返回。
     *  返回值：自身的P2P节点名
     * @return {string}
     */
    this.GetSelfPeer = function() {
        return this.m_Self.sObjSelf;
    };


    /**
     * 描述：设置心跳间隔。
     * 阻塞方式：非阻塞，立即返回
     * iExpire：[IN] 心跳间隔。
     */
    this.SetExpire = function(iExpire) {
        if (iExpire < (PRIVATE_CONST.KEEP_TIMER_INTERVAL * 2)) {
            this.m_Stamp.iExpire = 0;
        } else {
            this.m_Stamp.iExpire = iExpire;
        }
    };

    //  sConfig_Node 参数示例："Type=0;Option=1;MaxPeer=256;MaxGroup=32;MaxObject=512;MaxMCast=512;MaxHandle=256;SKTBufSize0=128;SKTBufSize1=64;SKTBufSize2=256;SKTBufSize3=64";
    this.ConfigControl = function(m_sConfig_Control) {
        this.m_sConfig_Control = m_sConfig_Control;
        return true;
    };

    this.ConfigNode = function(mNodeCfg) {
        if (mNodeCfg == null) {
            return false;
        }
        this.m_sConfig_Node = "Type=" + mNodeCfg.Type +
            ";Option=" + mNodeCfg.Option +
            ";MaxPeer=" + mNodeCfg.MaxPeer +
            ";MaxGroup=" + mNodeCfg.MaxGroup +
            ";MaxObject=" + mNodeCfg.MaxObject +
            ";MaxMCast=" + mNodeCfg.MaxMCast +
            ";MaxHandle=" + mNodeCfg.MaxHandle +
            ";SKTBufSize0=" + mNodeCfg.SKTBufSize0 +
            ";SKTBufSize1=" + mNodeCfg.SKTBufSize1 +
            ";SKTBufSize2=" + mNodeCfg.SKTBufSize2 +
            ";SKTBufSize3=" + mNodeCfg.SKTBufSize3 +
            ";P2PTryTime=" + mNodeCfg.P2PTryTime;
        return true;
    };

    /**
     *  描述：P2P会议对象初始化函数
     *  阻塞方式：非阻塞，立即返回。
     *  sName：[IN] 会议名称
     *  sChair：[IN] 主席端设备ID
     *  sUser：[IN] 登录用户名，自身的设备ID
     *  sPass：[IN] 登录密码
     *  sSvrAddr：[IN] 登录服务器地址和端口，格式：x.x.x.x:x
     *  sRelayAddr：[IN] 转发服务器地址和端口，格式：x.x.x.x:x。
     *                 如果传入空字符串，则使用登录服务器的IP地址加上443端口构成转发服务器地址。
     *  sVideoParam：[IN] 视频参数，格式为：(Code){3}(Mode){2}(Rate){40}(LCode){3}(LMode){2}
     *                 (LRate){40}(CameraNo){0}(Portrait){1}(BitRate){400}
     *                 Code: 视频压缩编码类型：1为MJPEG、2为VP8、3为H264。
     *                 Mode: 视频图像的分辨率（尺寸），请参考《Peergine编程手册》
     *                        0: 80x60, 1: 160x120, 2: 320x240, 3: 640x480,
     *                        4: 800x600, 5: 1024x768, 6: 176x144, 7: 352x288,
     *                        8: 704x576, 9: 854x480, 10: 1280x720, 11: 1920x1080
     *                 Rate: 视频的帧间间隔（毫秒）。例如40毫秒的帧率为：1000/40 = 25 fps
     *                 LCode: 视频压缩编码类型：1为MJPEG、2为VP8、3为H264。
     *                 LMode: 视频图像的分辨率（尺寸），请参考《Peergine编程手册》
     *                        0: 80x60, 1: 160x120, 2: 320x240, 3: 640x480,
     *                        4: 800x600, 5: 1024x768, 6: 176x144, 7: 352x288,
     *                        8: 704x576, 9: 854x480, 10: 1280x720, 11: 1920x1080
     *                 LRate: 视频的帧间间隔（毫秒）。例如40毫秒的帧率为：1000/40 = 25 fps
     *                 CameraNo: 摄像头编号，CameraInfo.facing的值。
     *                 Portrait: 采集图像的方向。0为横屏，1为竖屏。
     *                 Rotate: 采集图像的角度。（Portrait为0时生效）
     *                 BitRate: 视频压缩后的码率。单位为 Kbps
     *  返回值：true 成功 ， false 失败
     * @return {boolean}
     */
    this.Initialize1 = function(sUser, sPass, sSvrAddr, sRelayAddr, sVideoParam) {
        return this.Initialize("", "", sUser, sPass, sSvrAddr, sRelayAddr, sVideoParam);
    };
    this.Initialize = function(sName, sChair, sUser, sPass, sSvrAddr, sRelayAddr, sVideoParam) {

        if (!this.m_Status.bInitialized) {
            if (sName != "" && sName.length < 100) {
                // Check video parameters.
                if (sVideoParam == "") {
                    this.OutString("video parameter error");
                    return;
                }

                // Create Timer message handler.

                // Create Node objects.
                _NodeCallBack._mConf = this;

                this.m_Node.OnExtRequest = eval("_NodeCallBack.OnExtRequest");
                this.m_Node.OnReply = eval("_NodeCallBack.OnReply");

                // Init status
                this.m_Self.Init(sUser, sPass, sVideoParam, this.m_Node);
                this.m_sInitSvrName = "pgConnectSvr";
                this.m_sInitSvrAddr = sSvrAddr;
                this.m_sRelayAddr = sRelayAddr;

                this.m_InitGroup.Init(sName, sChair, sUser);

                this.m_listSyncPeer = [];
                this.m_listVideoPeer = [];

                if (!this._NodeStart("")) {
                    this.OutString("Initialize: Node start failed.");
                    this.Clean();
                    return false;
                }
                this.m_Status.bInitialized = true;
                if (!this.m_InitGroup.bEmpty) {
                    this.m_Group.Init(sName, sChair, this.m_Self.sUser);
                    this.m_Stamp.restore();
                    this._ServiceStart();
                }
                return true;
            }
        } else {
            this.OutString("->Initialize :Initialized = true");
        }
        this.m_Status.bInitialized = true;
        return true;
    };

    /**
     *  描述：P2P会议对象清理函数
     *  阻塞方式：非阻塞，立即返回。
     */
    this.Clean = function() {

        this._NodeStop();

        _NodeCallBack._mConf = null;
        //this.m_Node.OnExtRequest = null;
        //this.m_Node.OnReply = null;

        this.m_Status.restore();
    };

    /*

     *  描述：开始会议，初始化视音频等会议相关数据。
     *  阻塞方式：非阻塞
     *  返回值：true 成功  false 失败
     */
    this.Start = function(sName, sChair) {
        this.m_Group.Init(sName, sChair, this.m_Self.sUser);
        this.m_Stamp.restore();
        return !this.m_Group.bEmpty && this._ServiceStart();
    };

    /*
     *  描述：停止会议，初始化视音频等会议相关数据。
     *  阻塞方式：非阻塞
     *  返回值：true 成功  false 失败
     */
    this.Stop = function() {
        this._ServiceStop();
        this.m_Group.bEmpty = true;
    };

    /**
     * 描述：通过节点名与其他节点建立联系 （节点名在我们P2P网络的功能类似英特网的IP地址）
     * @param {String} sPeer: 对端的节点名（用户名）
     * @return {boolean}
     */
    this.PeerAdd = function(sPeer) {
        if (this.m_Node != null) {
            if (sPeer == "") {
                return false;
            }

            var sObjPeer = this._ObjPeerBuild(sPeer);

            var sClass = this.m_Node.ObjectGetClass(sObjPeer);
            if (sClass == "PG_CLASS_Peer") {
                return true;
            }

            if (sClass != "") {
                this.m_Node.ObjectDelete(sObjPeer);
            }

            return this.m_Node.ObjectAdd(sObjPeer, "PG_CLASS_Peer", "", 0x10000);
        }
    };

    /** Sdk扩展运用之添加通信节点，  使用之后会产生PeerSync事件
     * 删除节点连接。（一般不用主动删除节点，因为如果没有通信，节点连接会自动老化。）
     * @param {String} sPeer: 对端的节点名（用户名）
     */
    this.PeerDelete = function(sPeer) {
        if (this.m_Node == null) {
            if (sPeer != "") {
                var sObjPeer = this._ObjPeerBuild(sPeer);

                this.m_Node.ObjectDelete(sObjPeer);
            }
        }
    };


    /**
     *  描述：添加成员（主席端）
     *  阻塞方式：非阻塞，立即返回
     * @param {String} sMember：[IN] 成员名 
     * @return {boolean} true 操作成功，false 操作失败
     */
    this.MemberAdd = function(sMember) {
        var bRet = false;

        if (this.m_Status.bServiceStart && this.m_Group.bChairman) {
            if (sMember == "") {
                this.OutString("No Group or sMember name");
                return false;
            }
            var sObjPeer = this._ObjPeerBuild(sMember);

            var uMask = 0x0200; // Tell all.
            var sDataMdf = "(Action){1}(PeerList){(" + sObjPeer + "){" + uMask + "}}";
            var iErr = this.m_Node.ObjectRequest(this.m_Group.sObjG, 32, sDataMdf, "");
            if (iErr > 0) {
                this.OutString("MemberAdd: Add group member failed err=" + iErr);
                return false;
            } else {
                bRet = true;
            }
        }
        return bRet;
    };

    /**
     *  描述：删除成员（主席端）
     *  sMember：[IN] 成员名
     *  阻塞方式：非阻塞，立即返回
     */

    this.MemberDel = function(sMember) {

        this.OutString("MemberDel");

        if (this.m_Status.bServiceStart && this.m_Group.bChairman) {
            if (sMember == "") {
                this.OutString("No Group or sMember name");
                return;
            }
            var sObjPeer = this._ObjPeerBuild(sMember);

            var sDataMdf = "(Action){0}(PeerList){(" + sObjPeer + "){}}";
            var iErr = this.m_Node.ObjectRequest(this.m_Group.sObjG, 32, sDataMdf, "");
            if (iErr > 0) {
                this.OutString("MemberAdd: Add group member failed err=" + iErr);
            }
        }
    };

    /**
     *  描述：请求加入会议（成员端）
     *  阻塞方式：非阻塞，立即返回
     *  返回值： true 操作成功，false 操作失败
     * @return {boolean}
     */

    this.Join = function() {
        if (this.m_Status.bServiceStart && !this.m_Group.bChairman) {

            var sData = "Join?" + this.m_Self.sObjSelf;
            var iErr = this.m_Node.ObjectRequest(this.m_Group.sObjChair, 36, sData, "Join");
            if (iErr > 0) {
                this.OutString("Join:ObjectRequest Err=" + iErr);
                return false;
            }
            return true;
        }
        return false;
    };

    /**
     *  描述：离开会议
     *  阻塞方式：非阻塞，立即返回
     * @return {boolean}
     */

    this.Leave = function() {

        if (this.m_Status.bServiceStart) {
            var sData = "(Action){0}(PeerList){(" + this.m_Self.sObjSelf + "){}}";
            var iErr = this.m_Node.ObjectRequest(this.m_Group.sObjG, 32, sData, "Leave");
            if (iErr > 0) {
                this.OutString("Leave:ObjectRequest Err=" + iErr);
                return false;
            }
        }
    };

    /**
     * 描述：切换会议和主席
     * @param {String} sName 会议名称
     * @param {String} sChair 主席ID
     * @return {boolean} true 操作成功，false 操作失败
     */
    this.Reset = function(sName, sChair) {
        this.OutString("->Reset");

        if (this.m_Status.bServiceStart) {
            this._ServiceStop();
        }
        this.m_Group.Init(sName, sChair, this.m_Self.sUser);
        this.m_Stamp.restore();
        if (!this.m_Group.bEmpty) {
            if (this._ServiceStart()) {
                return true;
            }
        }
        return false;
    };

    /**
     * 开始预览
     * @param {String} sParam 打开视频参数，如"(Code){0}(Mode){3}(Rate)(66)"    
     * @param {String} sDivPrew 显示预览的div ID名称
     */
    this.PreviewStart = function(sParam, sDivPrew) {
        var sWndEle = "";
        if (sDivPrew != "") {
            this.m_sDivPrew = sDivPrew;
            sWndEle = this.m_Node.WndCreate(sDivPrew);
        }
        if (sWndEle == "") {
            return PUBLIC_CONST.PG_ERR_BadParam;
        }

        // Check video parameters.
        this.OutString("pgLibLiveMultiCapture.VideoStart:  sParam=" + sParam + " ,sDivPrew = " + sDivPrew);

        var sCode = PRIVATE_CONST._ParseInt(this.m_Node.omlGetContent(sParam, "Code"), 0);
        var sMode = PRIVATE_CONST._ParseInt(this.m_Node.omlGetContent(sParam, "Mode"), 3);
        var sRate = PRIVATE_CONST._ParseInt(this.m_Node.omlGetContent(sParam, "Rate"), 66);
        if (sCode < 0 || sCode > 4) {
            this.OutString("pgLibLiveMultiCapture.VideoStart: Invalid code: " + sCode);
            return PUBLIC_CONST.PG_ERR_BadParam;
        }
        if (sMode < 0 || sMode > 31) {
            this.OutString("pgLibLiveMultiCapture.VideoStart: Invalid mode: " + sMode);
            return PUBLIC_CONST.PG_ERR_BadParam;
        }

        //
        this.m_Node.ObjectAdd("Prvw", "PG_CLASS_Video", "", 0x2);
        var sWndRect = "(Code){" + sCode + "}(Mode){" + sMode + "}(Rate){" + sRate + "}(Wnd){" + sWndEle + "}";
        var iErr = this.m_Node.ObjectRequest("Prvw", 32, sWndRect, "PrvwStart");
        if (iErr > 0) {
            this.OutString("VideoInit: Open Prvw failed. iErr=" + iErr);
            return iErr;
        }
        return PUBLIC_CONST.PG_ERR_Normal;
    };

    /**
     * 停止预览
     * @param {String} sDivPrew divID 名称
     */
    this.PreviewStop = function(sDivPrew) {
        this.m_Node.ObjectRequest("Prvw", 33, "", "PrvwStop");
        this.m_Node.ObjectDelete("Prvw");
        this.m_Node.WndDestroy(sDivPrew);
    };

    /**
     *  描述：初始化视频设置
     *  iFlag:参考1）成员定义：
     *  阻塞方式：非阻塞，立即返回
     *   返回值： true 操作成功，false 操作失败
     * @return {boolean}
     */

    this.VideoStart = function(iFlag) {

        if (!this.m_Status.bServiceStart) {
            this.OutString("VideoStart: Not initialize");
            return false;
        }

        if (!this.m_Status.bApiVideoStart) {
            if (!this._VideoInit(iFlag)) {
                return false;
            }

            this.m_Status.bApiVideoStart = true;
        }
        return true;
    };

    /**
     *  描述：停止播放和采集视频
     *  阻塞方式：非阻塞，立即返回
     * @return {boolean}
     */
    this.VideoStop = function() {
        this.OutString("->VideoStop");
        if (this.m_Status.bApiVideoStart) {
            this._VideoClean();
            this.m_Status.bApiVideoStart = false;
        }
        return true;
    };

    /**
     *  描述：打开某一成员的视频或接受某一成员视频请求
     *  阻塞方式：非阻塞，立即返回
     * @param {String}  sPeer:成员节点名
     * @param {String}  sDivView div ID 数据
     * @returns {boolean}  true 操作成功，false 操作失败
     */
    this.VideoOpen = function(sPeer, sDivView) {
        return this._VideoOpen(sPeer, sDivView, false);
    };

    /**
     *  描述：打开某一成员的视频
     * @param {String}  sPeer:成员节点名
     * @param {String}  sDivView div ID 数据
     * @returns {boolean}  true 操作成功，false 操作失败
     */
    this.VideoOpenL = function(sPeer, sDivView) {
        return this._VideoOpen(sPeer, sDivView, true);
    };

    this._VideoOpen = function(sPeer, sDivView, bLarge) {
        this.OutString("VideoOpen :sPeer=" + sPeer);
        if (!this.m_Status.bApiVideoStart) {
            this.OutString("Video not init!");
            return false;
        }
        if (sPeer == "" || sPeer == null) {
            this.OutString("sPeer no chars");
            return false;
        }

        var sObjPeer = this._ObjPeerBuild(sPeer);

        var oPeer = this._VideoPeerSearch(sObjPeer);
        if (oPeer == null) {
            oPeer = new PG_PEER(sObjPeer);
            this.m_listVideoPeer.push(oPeer);
        }

        if (oPeer.divView == "" && sDivView != "") {
            oPeer.divView = sDivView;
            oPeer.sWndEle = this.m_Node.WndCreate(sDivView);
        }

        var iErr = PUBLIC_CONST.PG_ERR_Normal;
        var sData = "";
        // Create the node and view.
        //
        if (oPeer.sWndEle != "") {
            sData = "(Peer){" + this.m_Node.omlEncode(sObjPeer) + "}(Wnd){" + oPeer.sWndEle + "}";

            this.OutString("pgLibConference.VideoOpen: sData=" + sData);
        } else {
            iErr = PUBLIC_CONST.PG_ERR_Reject;
            sData = "";
            this.OutString("pgLibConference.VideoOpen: New node wnd failed!");

        }

        var sObjV = "";
        var bJoinRes = false;
        if (oPeer.iHandle > 0) {
            // Join reply.

            if (oPeer.bLarge) {
                sObjV = this.m_Group.sObjLV;
            } else {
                sObjV = this.m_Group.sObjV;
            }
            this.OutString("Video open Relay iHandle=" + oPeer.iHandle);
            //noinspection JSDuplicatedDeclaration
            var iErrTemp = this.m_Node.ObjectExtReply(sObjV, 0, sData, parseInt(oPeer.iHandle));
            if (iErrTemp <= 0) {
                if (iErr == 0) {
                    bJoinRes = true;
                }
            } else {
                this.OutString("pgLibConference.VideoOpen: Reply, iErr=" + iErrTemp);
            }
        } else {
            if (bLarge) {
                sObjV = this.m_Group.sObjLV;
            } else {
                sObjV = this.m_Group.sObjV;
            }
            oPeer.bLarge = bLarge;
            // Join Request.
            if (iErr == 0) {
                var sParamTmp = "VideoOpen:" + sPeer;
                //noinspection JSDuplicatedDeclaration
                var iErr1 = this.m_Node.ObjectRequest(sObjV, 35, sData, sParamTmp);
                if (iErr1 <= 0) {
                    bJoinRes = true;
                } else {
                    this.OutString("pgLibConference.VideoOpen: Request, iErr=" + iErr1);
                }
            }
        }

        // Clean the node and view when join failed.
        if (bJoinRes) {

            oPeer.iActStamp = this.m_Stamp.iActiveStamp;
            oPeer.iStamp = 0;
            oPeer.iHandle = 0;
            this.OutString("pgLibConference.VideoOpen: success");
            return true;
        } else {
            this.m_listVideoPeer.push(oPeer);
            return false;
        }

        // Reset request status.

        oPeer.iHandle = 0;
        oPeer.bRequest = false;

        return true;
    };
    /**
     *  描述：拒绝打开某一成员的视频
     *  阻塞方式：非阻塞，立即返回
     *   返回值： true 操作成功，false 操作失败
     *   sPeer:成员节点名
     */
    this.VideoReject = function(sPeer) {
        if (this.m_Node == null) {
            this.OutString("pgLibConference.SvrRequest: Not initialize");
            return;
        }
        if (sPeer == "") {
            this.OutString("sPeer no chars");
            return;
        }

        if (!this.m_Status.bApiVideoStart) {
            this.OutString("Video not init!");
            return;
        }
        var sObjPeer = this._ObjPeerBuild(sPeer);

        var oPeer = this._VideoPeerSearch(sObjPeer);
        if (oPeer == null) {
            return;
        }

        var sObjV;
        if (oPeer.bRequest) {
            // Join reply.

            if (oPeer.bLarge) {
                sObjV = this.m_Group.sObjLV;
            } else {
                sObjV = this.m_Group.sObjV;
            }
            this.OutString("Video open Relay iHandle=" + oPeer.iHandle);
            var iErrTemp = this.m_Node.ObjectExtReply(sObjV, 13, "", oPeer.iHandle);
            if (iErrTemp > 0) {
                this.OutString("pgLibConference.VideoReject: Reply, iErr=" + iErrTemp);
            }

            oPeer.restore();
            var i = 0;
            while (i < this.m_listVideoPeer.length) {
                if (this.m_listVideoPeer[i].sObjPeer == oPeer.sObjPeer) {
                    this.m_listVideoPeer.splice(1, i);
                    break;
                }
                i++;
            }

        }
    };

    /**
     *  描述：关闭某一成员视频
     *  阻塞方式：非阻塞，立即返回
     * @return {boolean}
     */
    this.VideoClose = function(sPeer) {

        if (this.m_Node == null) {
            this.OutString("pgLibConference.SvrRequest: Not initialize");
            return;
        }
        if (!this.m_Status.bServiceStart) {
            this.OutString("not join ");
            return false;
        }
        if (!this.m_Status.bApiVideoStart) {
            this.OutString("VideoClose: Service no start!");
            return false;
        }
        var sObjPeer = this._ObjPeerBuild(sPeer);

        var sObjV = "";
        var oPeer = _VideoPeerSearch(sObjPeer);
        this._VideoClose(oPeer);
        this.OutString("VideoClose: success");
        return true;
    };


    this._VideoClose = function(oPeer) {
        this.OutString("->VideoClose : oPeer.sObjPeer" + oPeer.sObjPeer);
        if (oPeer == null)
            return false;
        var sObj = "";
        if (oPeer.bLarge) {
            sObjV = this.m_Group.sObjLV;
        } else {
            sObjV = this.m_Group.sObjV;
        }


        var sData = "(Peer){" + this.m_Node.omlEncode(oPeer.sObjPeer) + "}";
        this.m_Node.ObjectRequest(sObjV, 36, sData, "VideoClose:" + oPeer.sObjPeer);

        this.m_Node.WndDestroy(oPeer.divView);

        oPeer.restore();
        this.m_listVideoPeer.splice();
    };

    /**
     *  描述：控制成员的视频流
     *  阻塞方式：非阻塞，立即返回
     *  iCameraNo：摄像头编号
     * @return {boolean}
     */

    this.VideoSource = function(iCameraNo) {
        if (this.m_Node == null) {
            this.OutString("VideoSource : Not initialize");
            return;
        }
        if (!this.m_Status.bApiVideoStart) {
            return false;
        }

        if (!this.m_Node.ObjectAdd("_vTemp_1", "PG_CLASS_Video", "", 0x2)) {
            return false;
        }
        this.m_Node.ObjectRequest("_vTemp_1", 2, "(Item){0}(Value){" + iCameraNo + "}", "");
        this.m_Node.ObjectDelete("_vTemp_1");
        return true;

    };

    /*
     * 描述:采集图像角度切换
     * 阻塞方式：非阻塞，立即返回
     * iAngle:角度
     *
     * */

    this.VideoSetRotate = function(iAngle) {
        if (this.m_Node != null) {
            if (this.m_Node.ObjectAdd("_vTemp", "PG_CLASS_Video", "", 0)) {
                this.m_Node.ObjectRequest("_vTemp", 2, "(Item){2}(Value){" + iAngle + "}", "");
                this.m_Node.ObjectDelete("_vTemp");
            }
        }
    };


    //control someone enable have video
    /**
     *  描述：控制成员的视频流
     *  阻塞方式：非阻塞，立即返回
     * @return {boolean}
     */
    this.VideoControl = function(sPeer, bEnable) {
        if (this.m_Node == null) {
            this.OutString("pgLibConference.SvrRequest: Not initialize");
            return;
        }
        if (!this.m_Status.bServiceStart) {
            this.OutString("VideoControl not join ");
            return false;
        }
        if (!this.m_Status.bApiVideoStart) {
            this.OutString("VideoControl: Service no start");
            return false;
        }
        var sObjPeer = this._ObjPeerBuild(sPeer);

        var iFlag = bEnable ? 1 : 0;
        if (sObjPeer == "") {
            return false;
        }

        var sIn = "(Peer){" + this.m_Node.omlEncode(sObjPeer) + "}(Local){" + iFlag + "}(Remote){" + iFlag + "}";
        this.m_Node.ObjectRequest(this.m_Group.sObjLV, 39, sIn, "VideoControl");
        this.m_Node.ObjectRequest(this.m_Group.sObjV, 39, sIn, "VideoControl");
        return true;

    };

    /*
     * 描述：抓拍 sPeer 节点的图片
     * 阻塞方式：非阻塞，立即返回
     * 参数：sPeer 节点名  sPath 路径
     * @return {boolean}
     */
    /**
     * @return {boolean}
     */
    this.VideoCamera = function(sPeer, sPath) {

        if (this.m_Node == null) {
            this.OutString("pgLibConference.VideoCamera: Not initialize");
            return false;
        }
        if (!this.m_Status.bServiceStart) {
            this.OutString("VideoCamera: Service no start");
            return false;
        }
        var sObjPeer = this._ObjPeerBuild(sPeer);

        var sPathTemp = sPath;
        if (sPathTemp.lastIndexOf(".jpg") < 0 && sPathTemp.lastIndexOf(".JPG") < 0) {
            sPathTemp += ".jpg";
        }

        var sObjV;
        var oPeer = this._VideoPeerSearch(sObjPeer);
        if (oPeer == null) {
            this.OutString("VideoCamera:this Peer Video not open!");
            return false;
        }

        if (oPeer.bLarge) {
            sObjV = this.m_Group.sObjLV;
        } else {
            sObjV = this.m_Group.sObjV;
        }
        var sIn = "(Peer){" + this.m_Node.omlEncode(sObjPeer) + "}(Path){" + this.m_Node.omlEncode(sPathTemp) + "}";
        var iErr = this.m_Node.ObjectRequest(sObjV, 37, sIn, "VideoCamera:" + sPeer);
        if (iErr != 0) {
            this.OutString("VideoCamera Error  = " + iErr);
            return false;
        }

        return true;
    };

    // Start and stop audio
    /**
     *  描述：开始播放或采集音频
     *  阻塞方式：非阻塞，立即返回
     *   返回值： true 操作成功，false 操作失败
     * @return {boolean}
     */

    this.AudioStart = function() {
        if (!this.m_Status.bServiceStart) {
            return false;
        }

        if (this.m_Status.bApiAudioStart) {
            return true;
        }

        if (!this._AudioInit()) {
            return false;
        }

        this.m_Status.bApiAudioStart = true;
        return true;
    };

    /**
     *  描述：停止播放或采集音频
     *  阻塞方式：非阻塞，立即返回
     *
     */

    this.AudioStop = function() {
        if (!this.m_Status.bServiceStart) {
            return;
        }

        if (this.m_Status.bApiAudioStart) {
            this._AudioClean();
            this.m_Status.bApiAudioStart = false;
        }
    };

    /*
     * 描述：AudioPeerVolume控制自身的扬声器和麦克风是否播放或采集声音数据
     * 阻塞方式：非阻塞，立即返回
     * sPeer 节点名 （在麦克风下为空则表示控制本端的麦克风音量。 ）
     * iMode 0表示扬声器 1表示麦克风
     * iVolume 表示音量的百分比
     *
     * */
    /**
     * @return {boolean}
     */
    this.AudioPeerVolume = function(sPeer, iType, iVolume) {

        if (!this.m_Status.bApiAudioStart) {
            OutString("Audio not init");
            return false;
        }

        var sObjPeer = this._ObjPeerBuild(sPeer);

        iType = iType > 0 ? 1 : 0;

        iVolume = iVolume < 0 ? 0 : iVolume; //iVolume防止参数小于0
        iVolume = iVolume > 100 ? 100 : iVolume; //大于100 取100
        var sData = "(Peer){}(Action){1}(Type){" + iType + "}(Volume){" + this.m_Node.omlEncode(iVolume + "") +
            "}(Max){0}(Min){0}";
        var iErr = this.m_Node.ObjectRequest(this.m_Group.sObjA, 34, sData, "pgLibConference.Volume");
        if (iErr > 0) {
            this.OutString("AudioPeerVolume:set Volume, iErr=" + iErr);
        }
        return true;
    };


    /**
     * 设置默认关闭音频
     * @param {Integer} iDisableMode 
     */
    this.AudioSpeechDisable = function(iDisableMode) {
        this.m_Status.iAudioSpeechDisable = iDisableMode;
    };

    /**
     *  描述：控制某个节点是否播放本节点的音频。
     *  阻塞方式：非阻塞，立即返回
     *  sPeer：节点名
     *  bSendEnable: true接收 ，false不接收
     *  返回值： true 操作成功，false 操作失败
     */
    this.AudioSpeech = function(sPeer, bSendEnable) {
        return this.AudioSpeech2(sPeer, bSendEnable, true);
    };

    /**
     * @return {boolean} true成功 ，false 失败
     */
    this.AudioSpeech = function(sPeer, bEnable, bRecvEnable) {

        if (!this.m_Status.bServiceStart) {
            this.OutString("Service not start ");
            return false;
        }

        if (!this.m_Status.bApiAudioStart) {
            this.OutString("Audio not init");
            return false;
        }

        var sObjPeer = this._ObjPeerBuild(sPeer);

        var bRet = false;
        var iSendEnable = bSendEnable ? 1 : 0;
        var iRecvEnable = bRecvEnable ? 1 : 0;
        var sData = "(Peer){" + sObjPeer + "}(ActSelf){" + iSendEnable + "}(ActPeer){" + iRecvEnable + "}";
        var iErr = this.m_Node.ObjectRequest(this.m_Group.sObjA, 36, sData, "Speech");
        if (iErr > 0) {
            this.OutString("Speech: Set Speech, iErr=" + iErr);
        }
        return true;
    };

    /**
     * 设置采样率
     * @param {Integer} iRate 采样率
     */
    this.AudioSetSampleRate = function(iRate) {
        if (this.m_Node != null) {
            // Set microphone sample rate
            if (this.m_Node.ObjectAdd("_AudioTemp", "PG_CLASS_Audio", "", 0)) {
                this.m_Node.ObjectRequest("_AudioTemp", 2, "(Item){2}(Value){" + iRate + "}", "");
                this.m_Node.ObjectDelete("_AudioTemp");
            }
        }
    };

    //control capture open or close 
    /**
     *  描述：摄像头控制。
     *  阻塞方式：非阻塞，立即返回
     *  返回值： true 操作成功，false 操作失败
     * @return {boolean}
     */

    this.CameraSwitch = function(bEnable) {

        if (!m_Status.bServiceStart) {
            this.OutString("CameraSwitch: Service no start");
            return false;
        }
        var bRet = false;
        if (this.m_Node.ObjectAdd("_vSwitch", "PG_CLASS_Video", "", 0)) {

            var iEnable = bEnable ? 1 : 0;
            var sData = "(Item){9}(Value){" + iEnable + "}";
            var iErr = this.m_Node.ObjectRequest("_vSwitch", 2, sData, "SetOption");
            if (iErr > 0) {
                OutString("CameraSwitch: Set option, iErr=" + iErr);
            } else {
                bRet = true;
            }

            this.m_Node.ObjectDelete("_vSwitch");
        }

        return bRet;

    };

    // Send message at capture side or render side
    /**
     *  描述：给指定节点发送消息
     *  阻塞方式：非阻塞，立即返回
     *  sMsg：[IN] 消息内容
     *  sPeer：[IN]节点名称
     *  返回值： true 操作成功，false 操作失败
     * @return {boolean}
     */
    this.MessageSend = function(sData, sPeer) {
        if (this.m_Node == null) {
            this.OutString("pgLibConference.SvrRequest: Not initialize");
            return false;
        }

        if (!this.m_Status.bServiceStart) {
            return false;
        }

        var sObjPeer = this._ObjPeerBuild(sPeer);

        var sMsg = "Msg?" + sData;

        var iErr = this.m_Node.ObjectRequest(sObjPeer, 36, sMsg, "pgLibConference.MessageSend");
        if (iErr > 0) {
            this.OutString("pgLibConference.MessageSend Err=" + iErr);
            return false;
        }
        return true;
    };

    /**
     *  描述：给指定节点发送消息
     *  阻塞方式：非阻塞，立即返回
     *  sMsg：[IN] 消息内容
     *  sPeer：[IN]节点名称
     *  返回值： true 操作成功，false 操作失败
     * @return {boolean}
     */
    this.CallSend = function(sMsg, sPeer, sSession) {
        if (this.m_Node == null) {
            this.OutString("CallSend: Not initialize");
            return false;
        }
        if (!this.m_Status.bServiceStart) {
            this.OutString("CallSend: Service no start");
            return false;
        }
        var sObjPeer = this._ObjPeerBuild(sPeer);

        var sData = "Msg?" + sMsg;
        var iErr = this.m_Node.ObjectRequest(sObjPeer, 35, sData, "CallSend?" + sSession);
        if (iErr > 0) {
            this.OutString("CallSend: iErr=" + iErr);
            return false;
        }

        return true;
    };

    /**
     *  描述：给所有成员节点发送消息
     *  阻塞方式：非阻塞，立即返回
     *  sMsg：[IN] 消息内容
     *  返回值： true 操作成功，false 操作失败
     * @return {boolean}
     */
    this.NotifySend = function(sData) {
        if (!this.m_Status.bServiceStart) {
            return false;
        }
        if (sData == "") {
            return false;
        }

        var iErr = this.m_Node.ObjectRequest(this.m_Group.sObjD, 32, sData, "pgLibConference.NotifySend");
        if (iErr > 0) {
            this.OutString("pgLibConference.NotifySend Err=" + iErr);
            return false;
        }
        return true;
    };
    /**
     *  描述：给服务器发送消息。
     *  阻塞方式：非阻塞，立即返回
     *  返回值： true 操作成功，false 操作失败
     * @return {boolean}
     */
    this.SvrRequest = function(sData) {
        if (this.m_Node == null) {
            this.OutString("pgLibConference.SvrRequest: Not initialize");
            return false;
        }

        var iErr = this.m_Node.ObjectRequest(this.m_sObjSvr, 35, ("1024:" + sData), "pgLibConference.SvrRequest");
        if (iErr > 0) {
            OutString("pgLibConference.SvrRequest: iErr=" + iErr);
            return false;
        }

        return true;
    };

    /**
     * @returns {String} 版本号
     */
    this.Version = function() {
        var sVersion = "";
        var sVerTemp = this.m_Node.omlGetContent(this.m_Node.utilCmd("Version", ""), "Version");
        if (sVerTemp.length > 1) {
            sVersion = sVerTemp.substring(1);
        }

        return sVersion + "." + this.LIB_VER;
    };

    this.OutString = function(sStr) {
        if (this.mEventProcListener.OnOutString && typeof(this.mEventProcListener.OnOutString) == "function") {
            this.mEventProcListener.OnOutString("pgLibConference->" + sStr);
        }
    };


    /**
     * @return {number}
     */
    this.ParseInt = function(sInt, iDef) {
        var iRet = Number(iDef);
        try {
            iRet = Number(sInt);
        } catch (e) {
            iRet = Number(iDef);
        }
        return iRet;
    };
    ///---------------------------------------------------------------------------------
    // PRIVATE_CONST methods.
    this.EventProc = function(sAct, sData, sPeer) {
        if (this.mEventProcListener.OnEvent && typeof(this.mEventProcListener.OnEvent) == "function" && this.m_Status.bEventEnable == true) {
            this.mEventProcListener.OnEvent(sAct, sData, sPeer);
        }
    };

    this._OnTimeout = function(sExec) {
        var sAct = this.m_Node.omlGetContent(sExec, "Act");
        if (sAct == "TimerActive") {
            this._TimerActive();
        } else if (sAct == "Keep") {
            this._Keep();
        } else if (sAct == "ChairmanAdd") {
            this._ChairmanAdd();
        } else if ("ChairPeerCheck" == (sAct)) {
            this._ChairPeerCheckTimeout();
        } else if (sAct == "Relogin") {
            this._NodeLogin();
        } else if ("PeerGetInfo" == (sAct)) {
            var sPeer = this.m_Node.omlGetContent(sExec, "Peer");
            this._NodePeerGetInfo(sPeer);
        }
    };

    this._VideoOption = function() {


        if (this.m_Node.ObjectAdd("_vTemp", "PG_CLASS_Video", "", 0)) {
            var sParam = "";
            if (this.m_Self.iVideoFrmRate != 0) {
                this.m_Node.ObjectRequest("_vTemp", 2, "(Item){4}(Value){" + this.m_Self.iVideoFrmRate + "}", "");
                sParam = "(FrmRate){" + this.m_Self.iVideoFrmRate + "}(KeyFrmRate){4000}";
                this.m_Node.ObjectRequest("_vTemp", 2, "(Item){5}(Value){" + this.m_Node.omlEncode(sParam) + "}", "");
            }
            if (this.m_Self.iVideoBitRate != 0) {
                sParam = "(BitRate){" + this.m_Self.iVideoBitRate + "}";
                this.m_Node.ObjectRequest("_vTemp", 2, "(Item){5}(Value){" + this.m_Node.omlEncode(sParam) + "}", "");
            }
            if (this.m_Self.iVideoPortrait > 0) {

                this.m_Node.ObjectRequest("_vTemp", 2, "(Item){2}(Value){" + this.m_Self.iVideoPortrait + "}", "");
            }
            if (this.m_Self.iCameraNo >= 0) {
                this.m_Node.ObjectRequest("_vTemp", 2, "(Item){0}(Value){" + this.m_Self.iCameraNo + "}", "");
            }
            this.m_Node.ObjectDelete("_vTemp");
        }
    };


    this._NodeStart = function(sInitParam) {

        if (this.m_Node == null) {
            return false;
        }
        var iBufSize0 = PRIVATE_CONST._ParseInt(this.m_Node.omlGetContent(sInitParam, "BufSize0"), 128);
        var iBufSize1 = PRIVATE_CONST._ParseInt(this.m_Node.omlGetContent(sInitParam, "BufSize1"), 128);
        var iBufSize2 = PRIVATE_CONST._ParseInt(this.m_Node.omlGetContent(sInitParam, "BufSize2"), 512);
        var iBufSize3 = PRIVATE_CONST._ParseInt(this.m_Node.omlGetContent(sInitParam, "BufSize3"), 128);
        var iDigest = PRIVATE_CONST._ParseInt(this.m_Node.omlGetContent(sInitParam, "Digest"), 1);
        var iP2PTryTime = PRIVATE_CONST._ParseInt(this.m_Node.omlGetContent(sInitParam, "P2PTryTime"), 3);
        var sNodeCfg = "Type=0;Option=1;SKTBufSize0=" + iBufSize0 +
            ";SKTBufSize1=" + iBufSize1 + ";SKTBufSize2=" + iBufSize2 +
            ";SKTBufSize3=" + iBufSize3 + ";P2PTryTime=" + iP2PTryTime;


        this.m_sObjSvr = this.m_sInitSvrName;
        this.m_sSvrAddr = this.m_sInitSvrAddr;

        // Config atx node.
        this.m_Node.Control = "Type=1;LogLevel0=1;LogLevel1=1";
        this.m_Node.Node = sNodeCfg;
        this.m_Node.Class = "PG_CLASS_Data:128;PG_CLASS_Video:128;PG_CLASS_Audio:128";
        this.m_Node.Local = "Addr=0:0:0:127.0.0.1:0:0";
        this.m_Node.Server = "Name=" + this.m_sObjSvr + ";Addr=" + this.m_sSvrAddr + ";Digest=" + iDigest;
        if (this.m_sRelayAddr) {
            this.m_Node.Relay = "(Relay0){(Type){0}(Load){0}(Addr){" + this.m_sRelayAddr + "}}";
        } else {
            var iInd = this.m_sSvrAddr.lastIndexOf(':');
            if (iInd > 0) {
                var sSvrIP = this.m_sSvrAddr.substring(0, iInd);
                this.m_Node.Relay = "(Relay0){(Type){0}(Load){0}(Addr){" + sSvrIP + ":443}}";
            }
        }
        // Start atx node.
        if (!this.m_Node.Start(0)) {
            this.OutString("NodeStart: Start node failed.");
            return false;
        }

        // Login to server.
        if (!this._NodeLogin()) {
            this.OutString("NodeStart: login failed.");
            this._NodeStop();
            return false;
        }

        return true;
    };

    this._NodeStop = function() {
        this.OutString("->NodeStop");

        if (this.m_Node == null) {
            return;
        }

        this._ServiceStop();
        this._NodeLogout();


    };

    this._NodeLogin = function() {
        this.OutString("->NodeLogin");
        if (this.m_Node == null) {
            return;
        }
        var sVersion = "";
        var sVerTemp = this.m_Node.omlGetContent(this.m_Node.utilCmd("Version", ""), "Version");
        if (sVerTemp.length > 1) {
            sVersion = sVerTemp.substring(1);
        }

        var sParam = "(Ver){" + sVersion + "." + this.LIB_VER + "}";
        var sData = "(User){" + this.m_Node.omlEncode(this.m_Self.sObjSelf) + "}(Pass){" + this.m_Node.omlEncode(this.m_sPass) + "}(Param){" + sParam + "}";
        this.OutString("NodeLogin:Data=" + sData);
        var iErr = this.m_Node.ObjectRequest(this.m_sObjSvr, 32, sData, "NodeLogin");
        if (iErr > 0) {
            this.OutString("NodeLogin: Login failed. iErr=" + this.m_Self.sObjSelf + iErr);
            return false;
        }
        return true;
    };
    this._NodeLogout = function() {

        this.OutString("->NodeLogout");
        if (this.m_Node == null) {
            return;
        }

        this.m_Node.ObjectRequest(this.m_sObjSvr, 33, "", "pgLibConference.Logout");
        if (this.m_Status.bLogined) {
            this.EventProc("Logout", "", "");
        }
        this.m_Status.bLogined = false;
    };

    this._NodeRelogin = function(uDelay) {
        this.OutString("->NodeRelogin!");
        this._NodeLogout();
        this._TimerStart("(Act){Relogin}", uDelay);
    };

    this._NodeRedirect = function(sRedirect) {
        this.OutString("->NodeRedirect");
        if (this.m_Node == null) {
            return;
        }
        this._NodeLogout();

        var sSvrName = this.m_Node.omlGetContent(sRedirect, "SvrName");
        if (sSvrName && sSvrName != this.m_sObjSvr) {
            this.m_Node.ObjectDelete(this.m_sObjSvr);
            if (!this.m_Node.ObjectAdd(sSvrName, "PG_CLASS_Peer", "", (0x10000 | 0x2))) {
                this.OutString("Redirect: Add server object failed");
                return;
            }
            this.m_sObjSvr = sSvrName;
            this.m_sSvrAddr = "";
        }
        var sSvrAddr = this.m_Node.omlGetContent(sRedirect, "SvrAddr");
        if (sSvrAddr && sSvrAddr != this.m_sSvrAddr) {
            var sData = "(Addr){" + sSvrAddr + "}(Proxy){}";
            var iErr = this.m_Node.ObjectRequest(this.m_sObjSvr, 37, sData, "Redirect");
            if (iErr > 0) {
                this.OutString("Redirect: Set server address. iErr=" + iErr);
                return;
            }
            this.m_sSvrAddr = sSvrAddr;
        }

        this.OutString("Redirect: sSvrName=" + sSvrName + ", sSvrAddr=" + sSvrAddr);

        this._TimerStart("(Act){Relogin}", 1);
    };

    this._NodeRedirectReset = function(uDelay) {
        if (this.m_sSvrAddr != this.m_sInitSvrAddr) {
            var sRedirect = "(SvrName){" + this.m_sInitSvrName + "}(SvrAddr){" + this.m_sInitSvrAddr + "}";
            this._NodeRedirect(sRedirect);
        } else {
            if (uDelay != 0) {
                this._NodeRelogin(uDelay);
            }
        }
    };

    this._NodeLoginReply = function(iErr, sData) {
        this.OutString(" ->NodeLoginReply ");
        if (this.m_Node == null) {
            return 1;
        }

        if (iErr != 0) {
            this.OutString("NodeLoginReply: Login failed. iErr=" + iErr);

            this.EventProc("Login", ("" + iErr), "");
            if (iErr == 11 || iErr == 12 || iErr == 14) {
                this._NodeRedirectReset(10);
            }

            return 1;
        }

        var sParam = this.m_Node.omlGetContent(sData, "Param");
        var sRedirect = this.m_Node.omlGetEle(sParam, "Redirect.", 10, 0);
        if (sRedirect) {
            this._NodeRedirect(sRedirect);
            return 1;
        }

        this.m_bLogin = true;
        this.EventProc("Login", "0", "");

        return 1;
    };


    this._ObjPeerBuild = function(sPeer) {
        if (sPeer.indexOf(PRIVATE_CONST.ID_PREFIX) != 0) {
            return PRIVATE_CONST.ID_PREFIX + sPeer;
        }
        return sPeer;
    };

    this._ObjPeerParsePeer = function(sObjPeer) {
        var ind = sObjPeer.indexOf(PRIVATE_CONST.ID_PREFIX);
        if (ind == 0) {
            return sObjPeer.substring(5);
        }
        return sObjPeer;
    };

    this._ChairmanAdd = function() {
        this.OutString(" ->ChairmanAdd ");
        if (this.m_Node.ObjectGetClass(this.m_Group.sObjChair) == "PG_CLASS_Peer") {
            this._PeerSync(this.m_Group.sObjChair, "", 1);
        } else {
            if (!this.m_Node.ObjectAdd(this.m_Group.sObjChair, "PG_CLASS_Peer", "", (0x10000))) {
                this.OutString("_ChairmanAdd: Add failed.");
                return false;
            }
        }

        return true;
    };
    this._PeerSync = function(sObject, sObjPeer, uAction) {
        this.OutString(" ->PeerSync Act=" + uAction);
        if (this.m_Node == null) {
            return;
        }
        uAction = (uAction <= 0) ? 0 : 1;
        this.m_Node.ObjectSync(sObject, sObjPeer, uAction);

    };

    this._ChairmanDel = function() {
        this.OutString(" ->ChairmanDel ");
        this.m_Node.ObjectDelete(this.m_Group.sObjChair);
    };


    this._ServiceStart = function() {
        this.OutString(" ->ServiceStart ");
        do {
            if (this.m_Group.sObjChair == this.m_Self.sObjSelf) {
                // Add group object.
                if (!this.m_Node.ObjectAdd(this.m_Group.sObjG, "PG_CLASS_Group", "", (0x10000 | 0x10 | 0x4 | 0x1))) {
                    this.OutString("_ServiceStart: Add Group failed.");
                    return false;
                }
                var uMask = 0x0200; // Tell all.
                var sDataMdf = "(Action){1}(PeerList){(" + this.m_Self.sObjSelf + "){" + uMask + "}}";
                var iErr = this.m_Node.ObjectRequest(this.m_Group.sObjG, 32, sDataMdf, "");
                if (iErr > 0) {
                    OutString("MemberAdd: Add group member failed");
                    break;
                }
            } else {
                // Add group object.
                if (!this.m_Node.ObjectAdd(this.m_Group.sObjG, "PG_CLASS_Group", this.m_Group.sObjChair, (0x10000 | 0x10 | 0x1))) {
                    this.OutString("_ServiceStart: Add Group failed.");
                    break;
                }

                this._ChairmanAdd();
            }

            if (!this.m_Node.ObjectAdd(this.m_Group.sObjD, "PG_CLASS_Data", this.m_Group.sObjG, 0)) {
                OutString("ServiceStart: Add  Data failed");
                this._ServiceStop();
                return;
            }

            this.m_Status.bServiceStart = true;
            //开始发送心跳包
            if (this._TimerStart("(Act){TimerActive}", 10) < 0) {
                break;
            }

            this.m_Stamp.iActiveStamp = 0;

            if (this._TimerStart("(Act){Keep}", this.m_Stamp.iExpire) < 0) {
                break;
            }
            this.m_Stamp.iKeepChainmanStamp = 0;
            this.m_Stamp.iKeepStamp = 0;
            return true;

        } while (false);
        this._ServiceStop();

        return false;
    };

    this._ServiceStop = function() {
        this.OutString(" ->ServiceStop");

        if (this.m_Node == null) {
            return;
        }

        this.m_Status.bServiceStart = false;

        if (this.m_Status.bApiVideoStart) {
            this._VideoClean();

        }
        if (this.m_Status.bApiAudioStart) {
            this._AudioClean();

        }
        this.m_Status.bApiVideoStart = false;
        this.m_Status.bApiAudioStart = false;

        var sDataMdf = "(Action){0}(PeerList){(" + this.m_Node.omlEncode(this.m_Self.sObjSelf) + "){0}}";
        this.m_Node.ObjectRequest(this.m_Group.sObjG, 32, sDataMdf, "");

        this.m_Node.ObjectDelete(this.m_Group.sObjD);
        this.m_Node.ObjectDelete(this.m_Group.sObjG);
    };

    //视频开始后的心跳检测可发送
    this._TimerActive = function() {

        if (this.m_Node == null) {
            return;
        }

        if (!this.m_Status.bServiceStart) {
            this.m_Status.iActiveStamp = 0;
            return;
        }

        this.m_Status.iActiveStamp += 10;
        this._TimerStart("(Act){TimerActive}", 10);

        if (this.m_listVideoPeer == null) {
            return;
        }
        var listVideoPeer = this.m_listVideoPeer.slice(0);
        //给各连接的节点发送心跳
        for (var i = 0; i < listVideoPeer.length; i++) {
            var oPeer = listVideoPeer[i];
            if ((oPeer.sObjPeer != this.m_Self.sObjSelf) && (!oPeer.bVideoLost)) { //视频打开发送心跳
                //检测心跳超时
                if ((this.m_Stamp.iActiveStamp - oPeer.iActStamp) > 30 && oPeer.iActStamp != 0) {
                    this.EventProc("VideoLost", "", oPeer.sObjPeer);
                    oPeer.bVideoLost = true;
                }
                //发送心跳
                this.m_Node.ObjectRequest(oPeer.sObjPeer, 36, "Active?", "pgLibConference.MessageSend");
            }
        }

    };



    this._KeepAdd = function(sObjPeer) {
        // 添加
        this.OutString("->KeepAdd");
        if (this._SyncPeerSearch(sObjPeer) == null) {
            var oSync = new PG_SYNC(sObjPeer);
            oSync.iKeepStamp = this.m_Stamp.iKeepStamp;
            this.m_listSyncPeer.push(oSync);
        }
        this.m_Node.ObjectRequest(sObjPeer, 36, "Keep?", "pgLibConference.MessageSend");
    };

    this._KeepDel = function(sObjPeer) {
        //作为成员端只接受主席端心跳 删除
        this.OutString("->KeepDel");
        for (var i = 0; i < this.m_listSyncPeer.length; i++) {
            if (this.m_listSyncPeer[i].sObjPeer == sObjPeer) {
                this.m_listSyncPeer.splice(1, i);
            }
        }
    };

    //收到Keep
    this._KeepRecv = function(sObjPeer) {
        this.OutString("pgLibConference ->KeepRecv sObjPeer=" + sObjPeer);

        if (this.m_Status.bServiceStart) {
            if (this.m_Group.bChairman) {
                var oSync = this._SyncPeerSearch(sObjPeer);
                if (oSync != null) {
                    oSync.iKeepStamp = this.m_Stamp.iKeepStamp;
                } else {
                    this._KeepAdd(sObjPeer);
                    this.EventProc("PeerSync", "reason=1", sObjPeer);
                }
            } else {
                this.m_Node.ObjectRequest(sObjPeer, 36, "Keep?", "MessageSend");
                this.m_Stamp.iKeepChainmanStamp = this.m_Stamp.iKeepStamp;
            }
        }
    };

    //成员端登录后与主席端连接保存
    this._Keep = function() {
        this.OutString("->Keep TimeOut");

        if (this.m_Node == null) {
            return;
        }

        if (!this.m_Status.bServiceStart) {
            this.m_Stamp.iKeepStamp = 0;
            this.m_Stamp.iKeepChainmanStamp = 0;
            this.m_listSyncPeer = [];
            return;
        }

        this.m_Stamp.iKeepStamp += this.m_Stamp.iExpire;

        this._TimerStart("(Act){Keep}", this.m_Stamp.iExpire);

        if (this.m_Group.bChairman) {

            //如果是主席，主动给所有成员发心跳
            var i = 0;
            while (i < this.m_listSyncPeer.length) {
                var oSync = this.m_listSyncPeer[i];

                if ((this.m_Stamp.iKeepStamp - oSync.iKeepStamp) > this.m_Stamp.iExpire * 2) {
                    //超时
                    this.EventProc("PeerOffline", "reason=1", oSync.sObjPeer);
                    this.PeerDelete(oSync.sObjPeer);
                    this.m_listSyncPeer.splice(1, i);
                    continue;
                }

                this.m_Node.ObjectRequest(oSync.sObjPeer, 36, "Keep?", "MessageSend");
                i++;
            }
        } else {
            if ((this.m_Stamp.iKeepStamp - this.m_Stamp.iKeepChainmanStamp) > this.m_Stamp.iExpire * 2) {

                this._ChairmanAdd();
            }
        }
    };

    this._VideoInit = function(iFlag) {
        this.OutString("->VideoInit iFlag = " + iFlag);

        this._VideoOption();
        this.m_Status.iVideoInitFlag = iFlag;
        var uFlag = 0x10000 | 0x1 | 0x10 | 0x20;
        switch (iFlag) {
            case pgVideoPutMode.OnlyInput:
                {
                    uFlag = uFlag | 0x4;
                    break;
                }
            case pgVideoPutMode.OnlyOutput:
                {
                    uFlag = uFlag | 0x8;
                    break;
                }
            case pgVideoPutMode.Normal:
                {

                    break;
                }
            default:
                break;
        }


        if (!this.m_Node.ObjectAdd(this.m_Group.sObjV, "PG_CLASS_Video", this.m_Group.sObjG, uFlag)) {
            this.OutString("VideoInit: Add 'Video' failed.");
            return false;
        }

        var sData = "(Code){" + this.m_Self.iVideoCode + "}(Mode){" + this.m_Self.iVideoMode + "}(Rate){" + this.m_Self.iVideoFrmRate + "}";

        var iErr = this.m_Node.ObjectRequest(this.m_Group.sObjV, 32, sData, "VideoInit");
        if (iErr > 0) {
            this.OutString("_VideoInit: Open failed. iErr=" + iErr);
            return false;
        }

        if (!this.m_Node.ObjectAdd(this.m_Group.sObjLV, "PG_CLASS_Video", this.m_Group.sObjG, uFlag)) {
            this.OutString("_VideoInit: Add 'Video' failed.");
            return false;
        }

        //noinspection JSDuplicatedDeclaration
        sData = "(Code){" + this.m_Self.iLVideoCode + "}(Mode){" + this.m_Self.iLVideoMode + "}(Rate){" + this.m_Self.iLVideoFrmRate + "}";

        //noinspection JSDuplicatedDeclaration
        iErr = this.m_Node.ObjectRequest(this.m_Group.sObjLV, 32, sData, "VideoLInit");
        if (iErr > 0) {
            this.OutString("_VideoInit: Open failed. iErr=" + iErr);
            return false;
        }

        return true;
    };
    this._VideoClean = function() {

        this.m_Node.ObjectRequest(this.m_Group.sObjLV, 33, "", "VideoStop");
        this.m_Node.ObjectDelete(this.m_Group.sObjLV);

        this.m_Node.ObjectRequest(this.m_Group.sObjV, 33, "", "VideoStop");
        this.m_Node.ObjectDelete(this.m_Group.sObjV);
    };

    this._AudioInit = function() {

        this.OutString("->AudioInit");
        var uFlag = 0x10000 | 0x01;
        switch (this.m_iAudioSpeechDisable) {
            case 1:
                uFlag = uFlag | 0x0020;
                break;
            case 2:
                uFlag = uFlag | 0x0040;
                break;
            case 3:
                uFlag = uFlag | 0x0020 | 0x0040;
                break;
            case 0:
                break;
            default:
                break;
        }

        if (!this.m_Node.ObjectAdd(this.m_Group.sObjA, "PG_CLASS_Audio", this.m_Group.sObjG, (0x10000 | 0x01))) {
            this.OutString("_AudioInit: Add 'thisAudio' failed.");
            return false;
        }

        var iErr = this.m_Node.ObjectRequest(this.m_Group.sObjA, 32, "(Code){1}(Mode){0}", "AudioStart");
        if (iErr > 0) {
            this.OutString("_AudioInit: Open audio failed. iErr=" + iErr);
            return false;
        }
        return true;
    };

    this._AudioClean = function() {
        this.OutString("->AudioClean");
        this.m_Node.ObjectRequest(this.m_Group.sObjA, 33, "", "AudioStop");
        this.m_Node.ObjectDelete(this.m_Group.sObjA);
    };

    this._TimerStart = function(sParam, iTimeout) {
        this.OutString("_TimerStart: sParam=" + sParam);
        var sJS = "_NodeCallBack.OnTimeout" + "('" + sParam + "')";
        return window.setTimeout(sJS, (iTimeout * 1000));
    };

    this._TimerStop = function(iTimerID) {
        window.clearTimeout(iTimerID);
    };


    ///------------------------------------------------------------------------
    // Callback process functions.

    this._NodePeerGetInfo = function(sObjPeer) {
        var iErr = this.m_Node.ObjectRequest(sObjPeer, 38, "", "PeerGetInfo");
        if (iErr > PUBLIC_CONST.PG_ERR_Normal) {
            this.OutString("_NodePeerGetInfo: iErr=" + iErr);
        }
    };


    this._SelfSync = function(sData, sObjPeer) {
        var sAct = this.m_Node.omlGetContent(sData, "Action");
        if (sAct == "1") {
            if (sObjPeer == this.m_sObjSvr) {
                this._TimerStart("(Act){PeerGetInfo}(Peer){" + sObjPeer + "}", 5, false);
            }
        } else {
            if (sObjPeer == this.m_sObjSvr) {
                this._NodeRelogin(10);
            }
        }
    };
    /**
     * @return {number}
     */
    this._SelfCall = function(sData, sObjPeer, iHandle) {
        this.OutString("->SelfCall");

        var sCmd = "";
        var sParam = "";
        var iInd = sData.indexOf('?');
        if (iInd > 0) {
            sCmd = sData.substring(0, iInd);
            sParam = sData.substring(iInd + 1);
        } else {
            sParam = sData;
        }
        if (sCmd == "Msg") {
            var sPeer = this._ObjPeerParsePeer(sObjPeer);
            this.EventProc("Message", sParam, sPeer);
        }
        this.m_Node.ObjectExtReply(sObjPeer, 0, "", iHandle);

        return 1;
    };


    this._SelfMessage = function(sData, sObjPeer) {
        var sPeer = this._ObjPeerParsePeer(sObjPeer);
        var sCmd = "";
        var sParam = "";
        var iInd = sData.indexOf('?');
        if (iInd > 0) {
            sCmd = sData.substring(0, iInd);
            sParam = sData.substring(iInd + 1);
        } else {
            sParam = sData;
        }

        if (sCmd == "Join") {
            return this.EventProc("AskJoin", "", sPeer);
        } else if (sCmd == "Leave") {
            return this.EventProc("AskLeave", "", sPeer);
        } else if (sCmd == "Msg") {
            return this.EventProc("Message", sParam, sPeer);
        } else if (sCmd == "Active") {
            if (this.m_Status.bServiceStart) {
                var oPeer = this._VideoPeerSearch(sObjPeer);
                if (oPeer != null) {
                    oPeer.iActStamp = this.m_Status.iActiveStamp;
                    oPeer.bVideoLost = false;
                }
            }
            return 0;
        } else if (sCmd == "Keep") {
            this._KeepRecv(sObjPeer);
        }

        return 0;
    };

    //服务器消息处理
    this._ServerMessage = function(sData, sObjPeer) {

        var sCmd = "";
        var sParam = "";
        var iInd = sData.indexOf('?');
        if (iInd > 0) {
            sCmd = sData.substring(0, iInd);
            sParam = sData.substring(iInd + 1);
        } else {
            sParam = sData;
        }

        if (sCmd == "UserExtend") {
            var sPeer = this._ObjPeerParsePeer(sObjPeer);
            this.EventProc("SvrNotify", sParam, sPeer);
        } else if (sCmd == "Restart") {
            if (sParam.indexOf("redirect=1") >= 0) {
                this._NodeRedirectReset(3);
            }
        }

        return 0;
    };

    this._OnServerKickOut = function(sData) {
        var sParam = this.m_Node.omlGetContent(sData, "Param");
        this.EventProc("KickOut", sParam, "");
    };

    //服务器错误处理
    this._ServerError = function(sData) {
        var sMeth = this.m_Node.omlGetContent(sData, "Meth");
        if (sMeth != "32") {
            return;
        }

        var sError = this.m_Node.omlGetContent(sData, "Error");
        if (sError == "0") {
            return;
        }

        if (sError == "8") {
            var iReloginDelay;
            var sObjTemp = "_TMP_" + this.m_sUser;
            if (sObjTemp != "") {
                this.m_Self.sObjSelf = sObjTemp;
                this.OutString("NodeLoginReply: Change to templete user, sObjTemp=" + sObjTemp);
                iReloginDelay = 1;
            } else {
                iReloginDelay = 30;
            }

            this._NodeLogout();
            this._TimerStart("(Act){Relogin}", iReloginDelay);
        }
    };

    this._ServerRelogin = function(sData) {
        var sError = this.m_Node.omlGetContent(sData, "ErrCode");
        if (sError == "0") {
            var sParam = this.m_Node.omlGetContent(sData, "Param");
            var sRedirect = this.m_Node.omlGetEle(sParam, "Redirect.", 10, 0);
            if (sRedirect != "") {
                this._NodeRedirect(sRedirect);
                return;
            }

            this.m_Status.bLogined = true;
            this.EventProc("Login", "0", this.m_sObjSvr);
        }
    };

    this._OnChairPeerSync = function(sObj, sData) {
        var sAct = this.m_Node.omlGetContent(sData, "Action");
        if (sAct == "1") {
            if (this.m_bReportPeerInfo) {
                this._TimerStart("(Act){PeerGetInfo}(Peer){" + sObj + "}", 5, false);
            }
            this._KeepAdd(sObj);
            var sChair = this._ObjPeerParsePeer(this.m_Group.sObjChair);
            this.EventProc("ChairmanSync", "", sChair);
        }
    };

    this._OnChairPeerError = function(sObj, sData) {
        sMeth = this.m_Node.omlGetContent(sData, "Meth");
        if (sMeth == "34") {
            sError = this.m_Node.omlGetContent(sData, "Error");
            this._KeepDel(sObj);
            this._PeerOffline(sObj, sError);
        }
    };

    this._OnPeerSync = function(sObj, sData) {
        var sAct = this.m_Node.omlGetContent(sData, "Action");
        if ("1" == (sAct)) {
            if (this.m_bReportPeerInfo) {
                this._TimerStart("(Act){PeerGetInfo}(Peer){" + sObj + "}", 5, false);
            }
            //心跳包列表 添加
            if (!this.m_Group.bEmpty && this.m_Group.bChairman) {
                this._KeepAdd(sObj);
            }
            this.EventProc("PeerSync", sAct, sObj);
        }
    };

    this._OnPeerError = function(sObj, sData) {

        var sMeth = this.m_Node.omlGetContent(sData, "Meth");
        var sError = this.m_Node.omlGetContent(sData, "Error");
        if ("34" == (sMeth) && sError == ("" + PUBLIC_CONST.PG_ERR_BadUser)) {
            //心跳包列表 删除
            if (!m_Group.bEmpty && m_Group.bChairman) {
                _KeepDel(sObj);
            }
            _PeerOffline(sObj, sError);
        }
    };

    this._OnPeerGetInfoReply = function(sObj, iErr, sData) {
        if (iErr != PUBLIC_CONST.PG_ERR_Normal) {
            return;
        }

        var sPeer = this._ObjPeerParsePeer(sObj);


        var sThrough = this.m_Node.omlGetContent(sData, "Through");
        var sProxy = PRIVATE_CONST._AddrToReadable(this.m_Node.omlGetContent(sData, "Proxy"));

        var sAddrLcl = PRIVATE_CONST._AddrToReadable(this.m_Node.omlGetContent(sData, "AddrLcl"));

        var sAddrRmt = PRIVATE_CONST._AddrToReadable(this.m_Node.omlGetContent(sData, "AddrRmt"));

        var sTunnelLcl = PRIVATE_CONST._AddrToReadable(this.m_Node.omlGetContent(sData, "TunnelLcl"));

        var sTunnelRmt = PRIVATE_CONST._AddrToReadable(this.m_Node.omlGetContent(sData, "TunnelRmt"));

        var sPrivateRmt = PRIVATE_CONST._AddrToReadable(this.m_Node.omlGetContent(sData, "PrivateRmt"));

        var sDataInfo = "16:(" + this.m_Node.omlEncode(sObj) + "){(Through){" + sThrough + "}(Proxy){" +
            this.m_Node.omlEncode(sProxy) + "}(AddrLcl){" + this.m_Node.omlEncode(sAddrLcl) + "}(AddrRmt){" +
            this.m_Node.omlEncode(sAddrRmt) + "}(TunnelLcl){" + this.m_Node.omlEncode(sTunnelLcl) + "}(TunnelRmt){" +
            this.m_Node.omlEncode(sTunnelRmt) + "}(PrivateRmt){" + this.m_Node.omlEncode(sPrivateRmt) + "}}";

        var iErrTemp = this.m_Node.ObjectRequest(this.m_sObjSvr, 35, sDataInfo, "pgLibLiveMultiCapture.ReportPeerInfo");
        if (iErrTemp > PUBLIC_CONST.PG_ERR_Normal) {
            this._OutString("_OnPeerGetInfoReply: iErr=" + iErrTemp);
        }

        // Report to app.
        sDataInfo = "peer=" + sPeer + "&through=" + sThrough + "&proxy=" + sProxy +
            "&addrlcl=" + sAddrLcl + "&addrrmt=" + sAddrRmt + "&tunnellcl=" + sTunnelLcl +
            "&tunnelrmt=" + sTunnelRmt + "&privatermt=" + sPrivateRmt;
        this.EventProc("PeerInfo", sDataInfo, sPeer);
    };

    this._GroupUpdate = function(sData) {
        var sAct = this.m_Node.omlGetContent(sData, "Action");
        var sPeerList = this.m_Node.omlGetEle(sData, "PeerList.", 256, 0);

        var iInd = 0;
        while (true) {
            var sEle = this.m_Node.omlGetEle(sPeerList, "", 1, iInd);
            if (!sEle) {
                break;
            }

            var sObjPeer = this.m_Node.omlGetName(sEle, "");
            if (sObjPeer.indexOf(PRIVATE_CONST.ID_PREFIX) == 0) {
                var sPeer = this._ObjPeerParsePeer(sObjPeer);
                if (sAct == "1") {
                    this.EventProc("Join", "", sPeer);
                } else {

                    this.EventProc("Leave", "", sPeer);
                }
            }

            iInd++;
        }

    };
    this._VideoJoin = function(sObj, sData, iHandle, sObjPeer) {
        var oPeer = this._VideoPeerSearch(sObjPeer);
        if (oPeer == null) {
            oPeer = new PG_PEER(sObjPeer);
            this.m_listVideoPeer.push(oPeer);

        }
        oPeer.iHandle = iHandle;
        oPeer.bRequest = true;
        if (sObj.indexOf("_LV_") == 0) {
            oPeer.bLarge = true;
        }
        this.OutString("Video _VideoJoin iHandle=" + oPeer.iHandle);
        var sPeer = this._ObjPeerParsePeer(sObjPeer);
        this.EventProc("VideoOpen", sData, sPeer);
    };

    this._VideoLeave = function(sObj, sData, iHandle, sObjPeer, sAct) {
        this.OutString("->VideoLeave");
        var sPeer = this._ObjPeerParsePeer(sObjPeer);
        this.EventProc(sAct, sData, sPeer);

        var i = 0;
        var oPeer = null;
        for (i = 0; i < this.m_listVideoPeer.length; i++) {
            if (this.m_listVideoPeer[i].sObjPeer == sObjPeer) {
                oPeer = this.m_listVideoPeer[i];
                break;
            }
        }

        if (oPeer != null) {
            this.m_listVideoPeer.splice(i, 1);
        }
    };

    //peer离线
    this._PeerOffline = function(sObjPeer, sError) {
        var sAct;
        if (sObjPeer == this.m_Group.sObjChair) {
            sAct = "ChairmanOffline";
        } else {
            sAct = "PeerOffline";
        }
        var sPeer = this._ObjPeerParsePeer(sObjPeer);
        this.EventProc(sAct, sError, sPeer);
    };

    this._VideoFrameStat = function(sData) {

        var sObjPeer = this.m_Node.omlGetContent(sData, "Peer");
        var sFrmTotal = this.m_Node.omlGetContent(sData, "Total");
        var sFrmDrop = this.m_Node.omlGetContent(sData, "Drop");
        var sPeer = this._ObjPeerParsePeer(sObjPeer);
        this.EventProc("VideoFrameStat", (sFrmTotal + ":" + sFrmDrop), sPeer);
    };

    this._VideoCameraReply = function(sData) {
        if (this.m_Node == null) {
            return;
        }
        if (!this.m_Status.bApiVideoStart) {
            return;
        }
        var sObjPeer = this.m_Node.omlGetContent(sData, "Peer");
        var sPath = this.m_Node.omlGetContent(sData, "Path");
        var sPeer = this._ObjPeerParsePeer(sObjPeer);
        this.EventProc("VideoCamera", sPath, sPeer);
    };

    this._VideoRecordReply = function(sData) {
        if (this.m_Node == null) {
            return;
        }
        if (!this.m_Status.bApiVideoStart) {
            return;
        }
        var sObjPeer = this.m_Node.omlGetContent(sData, "Peer");
        var sPath = this.m_Node.omlGetContent(sData, "Path");
        var sPeer = this._ObjPeerParsePeer(sObjPeer);
        this.EventProc("VideoRecord", sPath, sPeer);
    };

    //服务器下发数据
    this.SvrReply = function(iErr, sData) {
        if (iErr != 0) {
            this.EventProc("SvrReplyError", iErr + "", "");
        } else {
            this.EventProc("SvrReply", sData, "");
        }
    };

    this._OnDataNotify = function(sObjPeer, sData) {
        var sPeer1 = this._ObjPeerParsePeer(sObjPeer);
        return this.EventProc("Notify", sData, sPeer1);
    };

    ///------------------------------------------------------------------------
    // Node callback functions.

    this._OnExtRequest = function(sObj, uMeth, sData, uHandle, sObjPeer) {
        this.OutString("NodeOnExtRequest :" + sObj + ", " + uMeth + ", " + sData + ", " + sObjPeer);
        var sAct = "";
        var sMeth = "";
        var sError = "";
        if (sObj == this.m_sObjSvr) {
            if (uMeth == 0) {
                sAct = this.m_Node.omlGetContent(sData, "Action");
                if (sAct != "1" && this.m_sObjSvr == "") {
                    this._NodeRelogin(10);
                }
            } else if (uMeth == 1) {
                this._ServerError(sData);
            } else if (uMeth == 46) {
                this._ServerRelogin(sData);
            }
            return 0;
        } else if (sObj == this.m_Self.sObjSelf) {
            if (uMeth == 0) {
                this._SelfSync(sData, sObjPeer);
            } else if (uMeth == 35) {
                this._SelfCall(sObj, sData, uHandle, sObjPeer);
            } else if (uMeth == 36) {
                if (sObjPeer == this.m_sObjSvr) {
                    return this._ServerMessage(sData, sObjPeer);
                } else {
                    return this._SelfMessage(sData, sObjPeer);
                }
            } else if (uMeth == 47) {
                //ID冲突 被踢下线了
                if (sObjPeer == (this.m_sObjSvr)) {
                    this._OnServerKickOut(sData);
                }
            }
            return 0;
        } else if (sObj == this.m_Group.sObjChair) {
            if (uMeth == 0) {
                this._OnChairPeerSync(sObj, sData);
            } else if (uMeth == 1) {
                this._OnChairPeerError(sObj, sData);
            }
            return 0;
        } else if (this.m_Node.ObjectGetClass(sObj) == "PG_CLASS_Peer") {
            if (uMeth == 0) {
                this._OnPeerSync(sObj, sData);
            } else if (uMeth == 1) {
                this._OnPeerError(sObj, sData);
            }
            return 0;
        }

        if (sObj == this.m_Group.sObjG) {
            if (uMeth == 33) {
                this._GroupUpdate(sData);
            }
            return 0;
        }

        if (sObj == this.m_Group.sObjD) {
            if (uMeth == 32) {
                return this._OnDataNotify(sObjPeer, sData);
            }
            return 0;
        }

        if (sObj == this.m_Group.sObjV) {
            if (uMeth == 0) {
                sAct = this.m_Node.omlGetContent(sData, "Action");
                if (sAct == "1") {
                    var sPeer2 = this._ObjPeerParsePeer(sObjPeer);
                    this.EventProc("VideoSync", "", sPeer2);
                }
            } else if (uMeth == 35) {
                this._VideoJoin(sObj, sData, uHandle, sObjPeer, "VideoOpen");
                return -1; //异步同意
            } else if (uMeth == 36) {
                this._VideoLeave(sObj, sData, uHandle, sObjPeer, "VideoClose");
            } else if (uMeth == 40) {
                this._VideoFrameStat(sData, sObjPeer);
            }
            return 0;
        }

        if (sObj == this.m_Group.sObjLV) {
            if (uMeth == 0) {
                sAct = this.m_Node.omlGetContent(sData, "Action");
                if (sAct == "1") {
                    var sPeer3 = this._ObjPeerParsePeer(sObjPeer);
                    this.EventProc("VideoSyncL", "", sPeer3);
                }
            } else if (uMeth == 35) {
                this._VideoJoin(sObj, sData, uHandle, sObjPeer, "VideoOpenL");
                return -1; //异步同意
            } else if (uMeth == 36) {
                this._VideoLeave(sObj, sData, uHandle, sObjPeer, "VideoCloseL");
            } else if (uMeth == 40) {
                this._VideoFrameStat(sData, "VideoFrameStatL");
            }
            return 0;
        }

        if (sObj == this.m_Group.sObjA) {
            if (uMeth == 0) {
                sAct = this.m_Node.omlGetContent(sData, "Action");
                if (sAct == "1") {
                    var sPeer4 = this._ObjPeerParsePeer(sObjPeer);
                    this.EventProc("AudioSync", "", sPeer4);
                }
            }
        }
        return 0;
    };
    this._OnReply = function(sObj, iErr, sData, sParam) {

        this.OutString("->OnReply" + sObj + ", " + iErr + ", " + sData + ", " + sParam);

        if (sParam == "PeerGetInfo") {
            this._OnPeerGetInfoReply(sObj, iErr, sData);
            return 1;
        }

        if (sObj == this.m_sObjSvr) {
            if (sParam == "NodeLogin") {
                return this._NodeLoginReply(iErr, sData);
            } else if (sParam == "SvrRequest") {
                this._SvrReply(iErr, sData);
            }

            return 1;
        }

        if (sParam.indexOf("CallSend") == 0) {
            var sSession = "";
            var iInd = sParam.indexOf(':');
            sSession = sData.substring(9);
            var sPeer = this._ObjPeerParsePeer(sObj);
            this.EventProc("CallSend", sSession + ":" + iErr, sPeer);
            return 1;
        }
        if (sParam.indexOf("VideoOpen") == 0) {
            //视频加入通知
            this.EventProc("VideoJoin", "" + iErr, sParam.substring(10));
            return 1;
        }
        if (sParam.indexOf("VideoCamera") == 0) {
            this._VideoCameraReply(sData);
            return 1;
        }
        if (sParam.indexOf("VideoRecord") == 0) {
            this.VideoRecordReply(sData);
            return 1;
        }

        if (sObj == this.m_Group.sObjA) {
            if (sParam == "AudioPeerVolume") { // Cancel file
                this.EventProc("AudioPeerVolume", Integer.valueOf(iErr).toString(), sObj);
            }
        }
        return 1;
    };
}