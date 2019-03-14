// function PG_NODE_CFG() {
// 	this.Type = 0;
// 	this.Option = 1;

// 	this.MaxPeer = 256;
// 	this.MaxGroup = 32;
// 	this.MaxObject = 512;
// 	this.MaxCast = 512;
// 	this.MaxHandle = 512;
// 	this.SKTBufSize0 = 128;
// 	this.SKTBufSize1 = 64;
// 	this.SKTBufSize2 = 256;
// 	this.SKTBufSize3 = 64;
// 	this.P2PTryTime = 1;
// }
require('./pgLibError');
require('./pgLibNode');
require('./pgLibConferenceConst');

function pgLibNode(opts) {
    this.option = opts;

    this.LIB_VER = opts.Ver;

    this.sUser = opts.sUser;
    this.sPass = opts.sPass;

    this.m_sObjSvrName = this.initSvrName = "pgConnectSvr";
    this.m_sSvrAddr = this.initSvrAddr = opts.sSvrAddr;

    this.m_sRelayAddr = opts.sRelayAddr;

    this.bLogined = false;
    this.m_bLogin = false;

    this.m_sConfig_Control = "Type=1;LogLevel0=1;LogLevel1=1";
    this.m_sConfig_Node = "Type=0;Option=1;MaxPeer=256;MaxGroup=32;MaxObject=512;MaxMCast=512;MaxHandle=256;SKTBufSize0=128;SKTBufSize1=64;SKTBufSize2=256;SKTBufSize3=64;P2PTryTime=1";

    this.Node = opts.Node;
    this.OnExtRequest = opts.OnExtRequest;
    this.OnReply = opts.OnReply;

    this.EventProc = opts.EventProc;
    this.OutString = function() {
        return opts.OutString || console;
    };

    this.timerStartRelogin = function(uDelay) {
        var self = this;
        setTimeout(function(self) {
            self.NodeLogin();
        }, uDelay * 1000, self);
    };
    this.ObjPeerParsePeer = function(sObjPeer) {
        if (opts.ObjPeerParsePeer || typeof opts.ObjPeerParsePeer == "function") {
            return opts.ObjPeerParsePeer(sObjPeer);
        }
        return sObjPeer;
    };

    this.m_bReportPeerInfo = true;
}

pgLibNode.prototype.genNodeCfg = function(sInitParam) {
    var Node = this.Node;
    var iBufSize0 = _ParseInt(Node.omlGetContent(sInitParam, "BufSize0"), 128);
    var iBufSize1 = _ParseInt(Node.omlGetContent(sInitParam, "BufSize1"), 128);
    var iBufSize2 = _ParseInt(Node.omlGetContent(sInitParam, "BufSize2"), 512);
    var iBufSize3 = _ParseInt(Node.omlGetContent(sInitParam, "BufSize3"), 128);
    var iP2PTryTime = _ParseInt(Node.omlGetContent(sInitParam, "P2PTryTime"), 3);
    return "Type=0;Option=1;SKTBufSize0=" + iBufSize0 +
        ";SKTBufSize1=" + iBufSize1 + ";SKTBufSize2=" + iBufSize2 +
        ";SKTBufSize3=" + iBufSize3 + ";P2PTryTime=" + iP2PTryTime;
};

pgLibNode.prototype.NodeStart = function(sInitParam) {
    var self = this;
    var Node = this.Node;
    var sObjSvr = this.m_sObjSvrName;
    var sSvrAddr = this.m_sSvrAddr;
    var sRelayAddr = this.m_sRelayAddr;
    if (Node == null) {
        return false;
    }

    var iDigest = parseInt(Node.omlGetContent(sInitParam, "Digest"), 1);
    // Config atx node.
    Node.Control = "Type=1;LogLevel0=1;LogLevel1=1";
    Node.Node = this.genNodeCfg(sInitParam);
    Node.Class = "PG_CLASS_Data:128;PG_CLASS_Video:128;PG_CLASS_Audio:128";
    Node.Local = "Addr=0:0:0:127.0.0.1:0:0";
    Node.Server = "Name=" + sObjSvr + ";Addr=" + sSvrAddr + ";Digest=" + iDigest;
    if (sRelayAddr && sRelayAddr != "" && typeof sRelayAddr == 'string') {
        Node.Relay = "(Relay0){(Type){0}(Load){0}(Addr){" + sRelayAddr + "}}";
    } else {
        var iInd = sSvrAddr.lastIndexOf(':');
        if (iInd > 0) {
            var sSvrIP = sSvrAddr.substring(0, iInd);
            Node.Relay = "(Relay0){(Type){0}(Load){0}(Addr){" + sSvrIP + ":443}}";
        }
    }

    self.m_Node.OnExtRequest = function(sObj, uMeth, sData, uHandle, sPeer) {
        self.OnExtRequest(sObj, uMeth, sData, uHandle, sPeer);
    };
    self.m_Node.OnReply = function(sObj, iErr, sData, sParam) {
        self.OnReply(sObj, iErr, sData, sParam);
    };

    // Start atx node.
    if (!Node.Start(0)) {
        self.OutString("NodeStart: Start node failed.");
        return false;
    }


    // Login to server.
    if (!self.NodeLogin()) {
        self.OutString("NodeStart: login failed.");
        self.NodeStop();
        return false;
    }

    return true;
};



pgLibNode.prototype.NodeStop = function() {
    var self = this;
    self.OutString("->NodeStop");

    if (self.m_Node == null) {
        return;
    }

    self._NodeLogout();
};

pgLibNode.prototype.NodeLogin = function() {
    var self = this;
    var Node = this.Node;
    var OutString = this.OutString;
    var sObjSvr = this.m_sObjSvrName;
    var sUser = this.sUser;
    var sPass = this.sPass;

    OutString(" NodeLogin begin ");
    if (Node == null) {
        return;
    }
    var sVersion = "";
    var sVerTemp = Node.omlGetContent(Node.utilCmd("Version", ""), "Version");
    if (sVerTemp.length > 1) {
        sVersion = sVerTemp.substring(1);
    }

    var sParam = "(Ver){" + sVersion + "." + self.LIB_VER + "}";
    var sData = "(User){" + Node.omlEncode(sUser) + "}(Pass){" + Node.omlEncode(sPass) + "}(Param){" + sParam + "}";

    // OutString("NodeLogin:Data=" + sData);
    var iErr = Node.ObjectRequest(sObjSvr, 32, sData, "NodeLogin");
    if (iErr > 0) {
        OutString("NodeLogin: Login failed. sObjUser = " + sUser + " iErr=" + iErr);
        return false;
    }
    OutString(" NodeLogin end ");
    return true;
};

pgLibNode.prototype.NodeLogout = function() {
    var self = this;
    var Node = this.Node;
    var OutString = this.OutString;
    var sObjSvr = this.m_sObjSvrName;
    var bLogined = this.bLogined;

    OutString("pgLibNode -> NodeLogout begin");
    if (Node == null) {
        return;
    }

    Node.ObjectRequest(sObjSvr, 33, "", "NodeLogout");
    if (bLogined) {
        self.EventProc("Logout", "", "");
    }
    self.bLogined = false;
};

pgLibNode.prototype.NodeRelogin = function(uDelay) {
    var self = this;
    var OutString = this.OutString;

    OutString("pgLibNode NodeRelogin begin");
    self._NodeLogout();

    self.timerStartRelogin(uDelay);
};

pgLibNode.prototype.NodeRedirect = function(sRedirect) {
    var self = this;
    var Node = this.Node;
    var OutString = this.OutString;
    var sObjSvr = this.m_sObjSvrName;
    var sSvrAddr_old = this.m_sSvrAddr;

    OutString("pgLibNode NodeRedirect begin");
    if (Node == null) {
        return;
    }
    self._NodeLogout();

    var sSvrName = Node.omlGetContent(sRedirect, "SvrName");
    if (sSvrName && sSvrName != sObjSvr) {
        Node.ObjectDelete(sObjSvr);
        if (!Node.ObjectAdd(sSvrName, "PG_CLASS_Peer", "", (0x10000 | 0x2))) {
            OutString("Redirect: Add server object failed");
            return;
        }
        sObjSvr = self.m_sObjSvrName = sSvrName;
        sSvrAddr = self.m_sSvrAddr = "";
    }
    var sSvrAddr = Node.omlGetContent(sRedirect, "SvrAddr");
    if (sSvrAddr && sSvrAddr != sSvrAddr_old) {
        var sData = "(Addr){" + sSvrAddr + "}(Proxy){}";
        var iErr = Node.ObjectRequest(self.m_sObjSvrName, 37, sData, "Redirect");
        if (iErr > 0) {
            OutString("Redirect: Set server address. iErr=" + iErr);
            return;
        }
        sSvrAddr = self.m_sSvrAddr = sSvrAddr;
    }

    OutString("Redirect: sSvrName=" + sSvrName + ", sSvrAddr=" + sSvrAddr);

    self.timerStartRelogin(1);
};

pgLibNode.prototype.NodeRedirectReset = function(uDelay) {
    var self = this;
    var sInitSvrName = this.initSvrName;
    var sInitSvrAddr = this.initSvrAddr;
    var sSvrAddr = this.m_sSvrAddr;
    if (sSvrAddr != sInitSvrAddr) {
        var sRedirect = "(SvrName){" + sInitSvrName + "}(SvrAddr){" + sInitSvrAddr + "}";
        self._NodeRedirect(sRedirect);
    } else {
        if (uDelay != 0) {
            self._NodeRelogin(uDelay);
        }
    }
};

//服务器消息处理
pgLibNode.prototype.onServerMessage = function(sData, sObjPeer) {
    var self = this;

    var sCmd = "";
    var sParam = "";
    var iInd = sData.indexOf("?");
    if (iInd > 0) {
        sCmd = sData.substring(0, iInd);
        sParam = sData.substring(iInd + 1);
    } else {
        sParam = sData;
    }

    if (sCmd == "UserExtend") {
        var sPeer = self.ObjPeerParsePeer(sObjPeer);
        self.EventProc("SvrNotify", sParam, sPeer);
    } else if (sCmd == "Restart") {
        if (sParam.indexOf("redirect=1") >= 0) {
            self.NodeRedirectReset(3);
        }
    }

    return 0;
};

pgLibNode.prototype.onServerKickOut = function(sData) {
    var self = this;
    var Node = this.Node;

    var sParam = Node.omlGetContent(sData, "Param");
    self.EventProc("KickOut", sParam, "");
};

//服务器错误处理
pgLibNode.prototype.onServerError = function(sData) {
    var self = this;
    var Node = this.Node;
    var OutString = this.OutString;
    var sUser = this.m_sUser;

    var sMeth = Node.omlGetContent(sData, "Meth");
    if (sMeth != "32") {
        return;
    }

    var sError = Node.omlGetContent(sData, "Error");
    if (sError == "0") {
        return;
    }

    if (sError == "8") {
        var iReloginDelay;
        var sObjTemp = "_TMP_" + sUser;
        if (sObjTemp != "") {
            //this.m_Self.sObjSelf = sObjTemp;
            OutString("NodeLoginReply: Change to templete user, sObjTemp=" + sObjTemp);
            iReloginDelay = 1;
        } else {
            iReloginDelay = 30;
        }

        self.NodeLogout();
        self.timerStartRelogin(iReloginDelay);
    }
};

pgLibNode.prototype.onServerRelogin = function(sData) {
    var self = this;
    var Node = this.Node;
    var sObjSvrName = this.m_sObjSvrName;

    var sError = Node.omlGetContent(sData, "ErrCode");
    if (sError == "0") {
        var sParam = Node.omlGetContent(sData, "Param");
        var sRedirect = Node.omlGetEle(sParam, "Redirect.", 10, 0);
        if (sRedirect != "") {
            self.NodeRedirect(sRedirect);
            return;
        }

        self.bLogined = true;
        self.EventProc("Login", "0", sObjSvrName);
    }
};

pgLibNode.prototype.onNodeLoginReply = function(iErr, sData) {
    var self = this;
    var Node = this.Node;
    var OutString = this.OutString;

    OutString("pgLibNode NodeLoginReply begin");
    if (Node == null) {
        return 1;
    }

    if (iErr != 0) {
        OutString("pgLibNode NodeLoginReply: Login failed. iErr=" + iErr);

        self.EventProc("Login", ("" + iErr), "");
        if (iErr == 11 || iErr == 12 || iErr == 14) {
            self._NodeRedirectReset(10);
        }

        return 1;
    }

    var sParam = Node.omlGetContent(sData, "Param");
    var sRedirect = Node.omlGetEle(sParam, "Redirect.", 10, 0);
    if (sRedirect) {
        self._NodeRedirect(sRedirect);
        return 1;
    }

    self.m_bLogin = true;
    self.EventProc("Login", "0", "");

    return 1;
};

pgLibNode.prototype.timerStartPeerGetInfo = function(sObjPeer, uDelay) {
    var self = this;
    setTimeout(function(self, sObjPeer) {
        self.NodePeerGetInfo(sObjPeer);
    }, uDelay * 1000, self, sObjPeer);
};

pgLibNode.prototype.NodePeerGetInfo = function(sObjPeer) {
    var Node = this.Node;
    var OutString = this.OutString;

    var iErr = Node.ObjectRequest(sObjPeer, 38, "", "PeerGetInfo");
    if (iErr > PG_ERR_Normal) {
        OutString("pgLibNode._NodePeerGetInfo: iErr=" + iErr);
    }
};

pgLibNode.prototype.onPeerGetInfoReply = function(sObj, iErr, sData) {
    var self = this;
    var Node = this.Node;
    var sObjSvr = this.m_sObjSvrName;
    var OutString = this.OutString;
    if (iErr != PG_ERR_Normal) {
        return;
    }

    var sPeer = self.ObjPeerParsePeer(sObj);

    var sThrough = Node.omlGetContent(sData, "Through");
    var sProxy = _AddrToReadable(Node.omlGetContent(sData, "Proxy"));
    var sAddrLcl = _AddrToReadable(Node.omlGetContent(sData, "AddrLcl"));
    var sAddrRmt = _AddrToReadable(Node.omlGetContent(sData, "AddrRmt"));
    var sTunnelLcl = _AddrToReadable(Node.omlGetContent(sData, "TunnelLcl"));
    var sTunnelRmt = _AddrToReadable(Node.omlGetContent(sData, "TunnelRmt"));
    var sPrivateRmt = _AddrToReadable(Node.omlGetContent(sData, "PrivateRmt"));

    var sDataInfo = "16:(" + Node.omlEncode(sObj) + "){(Through){" + sThrough + "}(Proxy){" +
        Node.omlEncode(sProxy) + "}(AddrLcl){" + Node.omlEncode(sAddrLcl) + "}(AddrRmt){" +
        Node.omlEncode(sAddrRmt) + "}(TunnelLcl){" + Node.omlEncode(sTunnelLcl) + "}(TunnelRmt){" +
        Node.omlEncode(sTunnelRmt) + "}(PrivateRmt){" + Node.omlEncode(sPrivateRmt) + "}}";

    var iErrTemp = Node.ObjectRequest(sObjSvr, 35, sDataInfo, "pgLibNode.ReportPeerInfo");
    if (iErrTemp > PG_ERR_Normal) {
        OutString("_OnPeerGetInfoReply: iErr=" + iErrTemp);
    }

    // Report to app.
    sDataInfo = "peer=" + sPeer + "&through=" + sThrough + "&proxy=" + sProxy +
        "&addrlcl=" + sAddrLcl + "&addrrmt=" + sAddrRmt + "&tunnellcl=" + sTunnelLcl +
        "&tunnelrmt=" + sTunnelRmt + "&privatermt=" + sPrivateRmt;
    self.EventProc("PeerInfo", sDataInfo, sPeer);
};

pgLibNode.prototype.onSvrReply = function(iErr, sData) {
    if (iErr != 0) {
        self.EventProc("SvrReplyError", iErr + "", "");
    } else {
        self.EventProc("SvrReply", sData, "");
    }
};



/**
 *  描述：给指定节点发送消息
 *  阻塞方式：非阻塞，立即返回
 *  sMsg：[IN] 消息内容
 *  sPeer：[IN]节点名称
 *  返回值： true 操作成功，false 操作失败
 * @return {boolean}
 */
pgLibNode.prototype.MessageSend = function(sData, sObjPeer) {
    // var self = this;
    var Node = this.Node;
    var OutString = this.OutString;

    if (Node == null) {
        OutString("pgLibNode.MessageSend: Not initialize");
        return false;
    }

    var sMsg = "Msg?" + sData;

    var iErr = Node.ObjectRequest(sObjPeer, 36, sMsg, "pgLibNode.MessageSend");
    if (iErr > 0) {
        OutString("pgLibNode.MessageSend Err=" + iErr);
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
pgLibNode.prototype.CallSend = function(sMsg, sObjPeer, sSession) {
    // var self = this;
    var Node = this.Node;
    var OutString = this.OutString;

    if (Node == null) {
        OutString("pgLibNode.CallSend: Not initialize");
        return false;
    }

    var sData = "Msg?" + sMsg;
    var iErr = Node.ObjectRequest(sObjPeer, 35, sData, "pgLibNode.CallSend:" + sSession);
    if (iErr > 0) {
        OutString("pgLibNode.CallSend: iErr=" + iErr);
        return false;
    }

    return true;
};

pgLibNode.prototype.onCallSendReply = function(sObj, iErr, sData, sParam) {
    var self = this;

    var sSession = "";
    var iInd = sParam.indexOf(":");
    if (iInd > 0) {
        sSession = sData.substring(iInd);
    }
    var sPeer = self.ObjPeerParsePeer(sObj);
    self.EventProc("CallSend", sSession + ":" + iErr, sPeer);
    return 1;
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
    var iInd = sData.indexOf("?");
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
    var iInd = sData.indexOf("?");
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

        return 0;
    } else if (sCmd == "Keep") {
        this._KeepRecv(sObjPeer);
    }

    return 0;
};

/**
 *  描述：给服务器发送消息。
 *  阻塞方式：非阻塞，立即返回
 *  返回值： true 操作成功，false 操作失败
 * @return {boolean}
 */
pgLibNode.prototype.SvrRequest = function(sData) {
    // var self = this;
    var Node = this.Node;
    var OutString = this.OutString;
    var sSvrName = this.m_sObjSvrName;

    if (Node == null) {
        OutString("pgLibNode.SvrRequest: Not initialize");
        return false;
    }

    var iErr = Node.ObjectRequest(sSvrName, 35, ("1024:" + sData), "pgLibNode.SvrRequest");
    if (iErr > 0) {
        OutString("pgLibNode.SvrRequest: iErr=" + iErr);
        return false;
    }

    return true;
};


/**
 * @returns {String} 版本号
 */
pgLibNode.prototype.Version = function() {
    var Node = this.Node;
    var ver = this.LIB_VER
    var sVersion = "";
    var sVerTemp = Node.omlGetContent(Node.utilCmd("Version", ""), "Version");
    if (sVerTemp.length > 1) {
        sVersion = sVerTemp.substring(1);
    }

    return sVersion + "." + ver;
};

pgLibNode.prototype.PeerAdd = function(sObjPeer) {
    var self = this;
    var Node = this.Node;
    var OutString = this.OutString;

    if (Node.ObjectGetClass(sObjPeer) == "PG_CLASS_Peer") {
        self._PeerSync(sObjPeer, "", 1);
    } else {
        if (!Node.ObjectAdd(sObjPeer, "PG_CLASS_Peer", "", (0x10000))) {
            OutString("pgLibNode.PeerAdd: Add failed. sObjPeer = " + sObjPeer);
            return false;
        }
    }

    return true;
};
pgLibNode.prototype.PeerSync = function(sObject, sObjPeer, uAction) {
    // var self = this;
    var Node = this.Node;
    var OutString = this.OutString;

    OutString("pgLibNode.PeerSync Act=" + uAction);
    if (Node == null) {
        return;
    }
    uAction = (uAction <= 0) ? 0 : 1;
    Node.ObjectSync(sObject, sObjPeer, uAction);

};

pgLibNode.prototype._PeerDel = function(sObjPeer) {
    var Node = this.Node;
    Node.ObjectDelete(sObjPeer);
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
        this.EventProc(EVENT_PEER_SYNC, sAct, sObj);
    }
};

this._OnPeerError = function(sObj, sData) {
    var self = this;
    var sMeth = this.m_Node.omlGetContent(sData, "Meth");
    var sError = this.m_Node.omlGetContent(sData, "Error");
    if ("34" == (sMeth)) {
        self._PeerOffline(sObj, sError);
    }
};



//peer离线
this._PeerOffline = function(sObjPeer, sError) {
    var sAct = EVENT_PEER_OFFLINE;
    
    var sPeer = this._ObjPeerParsePeer(sObjPeer);
    this.EventProc(sAct, sError, sPeer);
};


pgLibNode.prototype.OnExtRequestPeer = function(sObj, uMeth, sData, uHandle, sObjPeer) {
    if (sObj == this.m_sObjSvr) {
        if (uMeth == 0) {
            var sAct = this.m_Node.omlGetContent(sData, "Action");
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
};

pgLibNode.prototype.OnReplyPeer = function(sObj, iErr, sData, sParam) {
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
};