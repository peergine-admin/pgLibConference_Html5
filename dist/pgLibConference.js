(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
},{"./pgLibConferenceConst":5,"./pgLibError":6,"./pgLibNode":7}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
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
},{"./VideoPeer":2}],4:[function(require,module,exports){
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

var pgLibNode = require("./ConferencePeer");
var pgLibConferenceEvent = require("./pgLibConferenceConst");
var VideoPeerList = require("./VideoPeerList").default;

var ID_PREFIX = "_DEV_";
var LIB_VER = "25";


function PG_LANSCAN() {
	this.bApiLanScan = false;
	this.sLanScanRes = "";
	this.sLanAddr = "";
	this.bPeerCheckTimer = false;
}


function pgLibConference(Node, OnEventListener) {
	// Check peergine Activex object
	if (!Node || typeof (Node.Control) == "undefined") {
		alert("pgLibConference: oAtx is invalid.");
		return null;
	}

	// Check callback object.
	if (!OnEventListener || typeof (OnEventListener.OnEvent) != "function") {
		alert("pgLibConference: OnEventListener is invalid.");
		return null;
	}

	this.LIB_VER = LIB_VER;

	this.bInitialized = false;
	this.bLogined = false;
	this.bEventEnable = true;

	
	this.m_Self = new PG_SELF();

	this.m_InitGroup = new PG_GROUP();
	this.m_Group = new PG_GROUP();
	this.m_Status = new PG_STATUS();
	this.m_Stamp = new PG_STAMP();
	this.m_LanScan = new PG_LANSCAN();


	// Store ActiveX object and UI callback object.
	this.m_Node = Node;
	this.mEventProcListener = OnEventListener;

   

	// Status members.
	this.m_sObjSvr = "";
	this.m_sSvrAddr = "";
	this.m_sRelayAddr = "";
	
	this.m_listVideoPeer = [];

	

	///------------------------------------------------------------------------------
	// API methods.


	/**
     * 开始预览
     * @param {String} sParam 打开视频参数，如"(Code){0}(Mode){3}(Rate)(66)"    
     * @param {String} sDivPrew 显示预览的div ID名称
     */
	this.PreviewStart = function (sParam, sDivPrew) {
		return PG_ERR_Normal;
	};

	/**
     * 停止预览
     * @param {String} sDivPrew divID 名称
     */
	this.PreviewStop = function (sDivPrew) {
		
	};
	/**
     *  描述：初始化视频设置
     *  iFlag:参考1）成员定义：
     *  阻塞方式：非阻塞，立即返回
     *   返回值： true 操作成功，false 操作失败
     * @return {boolean}
     */

	this.VideoStart = function (iFlag) {
		return true;
	};

	/**
     *  描述：停止播放和采集视频
     *  阻塞方式：非阻塞，立即返回
     * @return {boolean}
     */
	this.VideoStop = function () {
		return true;
	};

	/**
     *  描述：打开某一成员的视频或接受某一成员视频请求
     *  阻塞方式：非阻塞，立即返回
     * @param {String}  sPeer:成员节点名
     * @param {String}  sDivView div ID 数据
     * @returns {boolean}  true 操作成功，false 操作失败
     */
	this.VideoOpen = function (sPeer, sDivView) {
		return this._VideoOpen(sPeer, sDivView, false);
	};

	/**
     *  描述：打开某一成员的视频
     * @param {String}  sPeer:成员节点名
     * @param {String}  sDivView div ID 数据
     * @returns {boolean}  true 操作成功，false 操作失败
     */
	this.VideoOpenL = function (sPeer, sDivView) {
		return this._VideoOpen(sPeer, sDivView, true);
	};

	/**
 *  描述：关闭某一成员视频
 *  阻塞方式：非阻塞，立即返回
 * @return {boolean}
 */
this.VideoClose = function (sPeer) {

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

	this.OutString = function (sStr) {
		if (this.mEventProcListener.OnOutString && typeof (this.mEventProcListener.OnOutString) == "function") {
			this.mEventProcListener.OnOutString("pgLibConference->" + sStr);
		}
	};


	/**
     * @return {number}
     */
	this.ParseInt = function (sInt, iDef) {
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
	this.EventProc = function (sAct, sData, sPeer) {
		if (this.mEventProcListener.OnEvent && typeof (this.mEventProcListener.OnEvent) == "function" && this.m_Status.bEventEnable == true) {
			this.mEventProcListener.OnEvent(sAct, sData, sPeer);
		}
	};

	this._OnTimeout = function (sExec) {
		var sAct = this.m_Node.omlGetContent(sExec, "Act");
		if (sAct == "ChairmanAdd") {
			this._ChairmanAdd();
		} else if ("ChairPeerCheck" == (sAct)) {
			this._ChairPeerCheckTimeout();
		}
	};

	
	this.IsDevice = function(sObjPeer) {
		return sObjPeer.indexOf(ID_PREFIX) == 0;
	};

	this._ObjPeerBuild = function (sPeer) {
		if (sPeer.indexOf(ID_PREFIX) != 0) {
			return ID_PREFIX + sPeer;
		}
		return sPeer;
	};

	this._ObjPeerParsePeer = function (sObjPeer) {
		var ind = sObjPeer.indexOf(ID_PREFIX);
		if (ind == 0) {
			return sObjPeer.substring(5);
		}
		return sObjPeer;
	};


	///------------------------------------------------------------------------
	// Callback process functions.



	

	///------------------------------------------------------------------------
	// Node callback functions.

	this._OnExtRequest = function (sObj, uMeth, sData, uHandle, sObjPeer) {
		var self = this;
		var OutString = this.OutString;
		var Node = this.m_Node;

		OutString("NodeOnExtRequest :" + sObj + ", " + uMeth + ", " + sData + ", " + sObjPeer);
		if(Node.ObjectGetClass(sObj) == "PG_CLASS_Peer"){
			return ;//pgLibNodePeer
		}
		if(Node.ObjectGetClass(sObj) == "PG_CLASS_Group"){
			return ;
		}
		if(Node.ObjectGetClass(sObj) == "PG_CLASS_Data"){
			return ;
		}
		if(Node.ObjectGetClass(sObj) == "PG_CLASS_Video"){
			return ;
		}
		if(Node.ObjectGetClass(sObj) == "PG_CLASS_Audio"){
			return ;
		}

		return 0;
	};
	this._OnReply = function (sObj, iErr, sData, sParam) {
		var self = this;
		var OutString = this.OutString;
		var Node = this.m_Node;

		OutString("->OnReply" + sObj + ", " + iErr + ", " + sData + ", " + sParam);

		// OnReplyPeer
		if(Node.ObjectGetClass(sObj) == "PG_CLASS_Peer"){
			return ;//pgLibNodePeer
		}
		if(Node.ObjectGetClass(sObj) == "PG_CLASS_Group"){
			return ;
		}
		if(Node.ObjectGetClass(sObj) == "PG_CLASS_Data"){
			return ;
		}
		if(Node.ObjectGetClass(sObj) == "PG_CLASS_Video"){
			return ;
		}
		if(Node.ObjectGetClass(sObj) == "PG_CLASS_Audio"){
			return ;
		}
		return 1;
	};
}

//  sConfig_Node 参数示例："Type=0;Option=1;MaxPeer=256;MaxGroup=32;MaxObject=512;MaxMCast=512;MaxHandle=256;SKTBufSize0=128;SKTBufSize1=64;SKTBufSize2=256;SKTBufSize3=64";
pgLibConference.prototype.ConfigControl = function (m_sConfig_Control) {
	this.m_sConfig_Control = m_sConfig_Control;
	return true;
};
	
pgLibConference.prototype.ConfigNode = function (mNodeCfg) {
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
 * 描述：获取自身的P2P节点名
 * 阻塞方式：非阻塞，立即返回。
 * 返回值：自身的P2P节点名
 * 作用：扩展时利用此类，进行底层操作。
 */
pgLibConference.prototype.GetNode = function () {
	return this.m_Node;
};
	
/**
 *  描述：获取自身的P2P节点名
 *  阻塞方式：非阻塞，立即返回。
 *  返回值：自身的P2P节点名
 * @return {string}
 */
pgLibConference.prototype.GetSelfPeer = function () {
	return this.m_Self.sObjSelf;
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
pgLibConference.prototype.Initialize1 = function (sUser, sPass, sSvrAddr, sRelayAddr, sVideoParam) {
	return this.Initialize("", "", sUser, sPass, sSvrAddr, sRelayAddr, sVideoParam);
};
pgLibConference.prototype.Initialize = function (sName, sChair, sUser, sPass, sSvrAddr, sRelayAddr, sVideoParam) {

	if (!this.m_Status.bInitialized) {
		if (sName != "" && sName.length < 100) {
			// Check video parameters.
			if (sVideoParam == "") {
				this.OutString("video parameter error");
				return;
			}

			// Create Timer message handler.

			// Init status
			this.m_Self.Init(sUser, sPass, sVideoParam, this.m_Node);
			this.sObjChair = ID_PREFIX + sChair;
			this.sObjG = "_G_" + sName;
			this.sObjD = "_D_" + sName;
			this.sObjV = "_V_" + sName;
			this.sObjLV = "_LV_" + sName;
			this.sObjA = "_A_" + sName;
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
		this.Clean = function () {
	
			this._NodeStop();
			this.m_Status.restore();
		};
	
		/**
		 * 描述：通过节点名与其他节点建立联系 （节点名在我们P2P网络的功能类似英特网的IP地址）
		 * @param {String} sPeer: 对端的节点名（用户名）
		 * @return {boolean}
		 */
		this.PeerAdd = function (sPeer) {
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
		this.PeerDelete = function (sPeer) {
			if (this.m_Node == null) {
				if (sPeer != "") {
					var sObjPeer = this._ObjPeerBuild(sPeer);
	
					this.m_Node.ObjectDelete(sObjPeer);
				}
			}
		};

module.exports = pgLibConference;
},{"./ConferencePeer":1,"./VideoPeerList":3,"./pgLibConferenceConst":5}],5:[function(require,module,exports){
(function (global){
global.EVENT_LOGIN = "Login";
global.EVENT_LOGOUT = "Logout";

global.EVENT_CHAIRMAN_SYNC = "ChairmanSync";
global.EVENT_CHAIRMAN_OFFLINE = "ChairmanOffline";
global.EVENT_PEER_SYNC = "PeerSync";
global.EVENT_PEER_OFFLINE = "PeerOffline";

global.EVENT_ASK_JOIN = "AskJoin";
global.EVENT_ASK_LEAVE = "AskLeave";
global.EVENT_JOIN = "Join";
global.EVENT_LEAVE = "Leave";

global.EVENT_MESSAGE = "Message";
global.EVENT_CALLSEND_RESULT = "CallSend";
global.EVENT_NOTIFY = "Notify";
global.EVENT_SVR_NOTIFY = "SvrNotify";
global.EVENT_SVR_REPLYR_ERROR = "SvrReplyError";
global.EVENT_SVR_RELAY = "SvrReply";

global.EVENT_LAN_SCAN_RESULT = "LanScanResult";

global.EVENT_AUDIO_SYNC = "AudioSync";
global.EVENT_AUDIO_CTRL_VOLUME = "AudioCtrlVolume";

global.EVENT_VIDEO_LOST = "VideoLost";

global.EVENT_VIDEO_SYNC = "VideoSync";
global.EVENT_VIDEO_OPEN = "VideoOpen";
global.EVENT_VIDEO_JOIN = "VideoJoin";
global.EVENT_VIDEO_CLOSE = "VideoClose";
global.EVENT_VIDEO_FRAME_STAT = "VideoFrameStat";
global.EVENT_VIDEO_CAMERA = "VideoCamera";
global.EVENT_VIDEO_RECORD = "VideoRecord";

global.EVENT_VIDEO_SYNC_1 = "VideoSyncL";
global.EVENT_VIDEO_OPEN_1 = "VideoOpenL";
global.EVENT_VIDEO_JOIN_1 = "VideoJoinL";
global.EVENT_VIDEO_CLOSE_1 = "VideoCloseL";
global.EVENT_VIDEO_FRAME_STAT_1 = "VideoFrameStatL";
global.EVENT_VIDEO_CAMERA_1 = "VideoCameraL";
global.EVENT_VIDEO_RECORD_1 = "VideoRecordL";


/**
 * AudioStart 时的视频接收模式。
 */
global.AUDIO_Speech = 0;
global.AUDIO_NoSpeechSelf = 1;
global.AUDIO_NoSpeechPeer = 2;
global.AUDIO_NoSpeechSelfAndPeer = 3;

/**
 * VideoStart 时的视频接收模式。
 */
global.VIDEO_Normal = 0;
global.VIDEO_OnlyInput = 1;
global.VIDEO_OnlyOutput = 2;

/**
 * private
 */
global.VIDEO_PEER_MODE_Leave  = 0;
global.VIDEO_PEER_MODE_Request = 1;
global.VIDEO_PEER_MODE_Response = 2;
global.VIDEO_PEER_MODE_Join = 3;

global.VIDEO_RESPONSE_TIMEOUT = 30;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],6:[function(require,module,exports){
(function (global){

var PG_ERR_Normal = 0;
var PG_ERR_System = 1;
var PG_ERR_BadParam = 2;
var PG_ERR_BadClass = 3;
var PG_ERR_BadMethod = 4;
var PG_ERR_BadObject = 5;
var PG_ERR_BadStatus = 6;
var PG_ERR_BadFile = 7;
var PG_ERR_BadUser = 8;
var PG_ERR_BadPass = 9;
var PG_ERR_NoLogin = 10;
var PG_ERR_Network = 11;
var PG_ERR_Timeout = 12;
var PG_ERR_Reject = 13;
var PG_ERR_Busy = 14;
var PG_ERR_Opened = 15;
var PG_ERR_Closed = 16;
var PG_ERR_Exist = 17;
var PG_ERR_NoExist = 18;
var PG_ERR_NoSpace = 19;
var PG_ERR_BadType = 20;
var PG_ERR_CheckErr = 21;
var PG_ERR_BadServer = 22;
var PG_ERR_BadDomain = 23;
var PG_ERR_NoData = 24;
var PG_ERR_Unknown = 0xff;

var pgLibError = {};

global.PG_ERR_Normal = pgLibError.PG_ERR_Normal = PG_ERR_Normal;
global.PG_ERR_System = pgLibError.PG_ERR_System = PG_ERR_System;
global.PG_ERR_BadParam = pgLibError.PG_ERR_BadParam = PG_ERR_BadParam;
global.PG_ERR_BadClass = pgLibError.PG_ERR_BadClass = PG_ERR_BadClass;
global.PG_ERR_BadMethod = pgLibError.PG_ERR_BadMethod = PG_ERR_BadMethod;
global.PG_ERR_BadObject = pgLibError.PG_ERR_BadObject = PG_ERR_BadObject;
global.PG_ERR_BadStatus = pgLibError.PG_ERR_BadStatus = PG_ERR_BadStatus;
global.PG_ERR_BadFile = pgLibError.PG_ERR_BadFile = PG_ERR_BadFile;
global.PG_ERR_BadUser = pgLibError.PG_ERR_BadUser = PG_ERR_BadUser;
global.PG_ERR_BadPass = pgLibError.PG_ERR_BadPass = PG_ERR_BadPass;
global.PG_ERR_NoLogin = pgLibError.PG_ERR_NoLogin = PG_ERR_NoLogin;
global.PG_ERR_Network = pgLibError.PG_ERR_Network = PG_ERR_Network;
global.PG_ERR_Timeout = pgLibError.PG_ERR_Timeout = PG_ERR_Timeout;
global.PG_ERR_Reject = pgLibError.PG_ERR_Reject = PG_ERR_Reject;
global.PG_ERR_Busy = pgLibError.PG_ERR_Busy = PG_ERR_Busy;
global.PG_ERR_Opened = pgLibError.PG_ERR_Opened = PG_ERR_Opened;
global.PG_ERR_Closed = pgLibError.PG_ERR_Closed = PG_ERR_Closed;
global.PG_ERR_Exist = pgLibError.PG_ERR_Exist = PG_ERR_Exist;
global.PG_ERR_NoExist = pgLibError.PG_ERR_NoExist = PG_ERR_NoExist;
global.PG_ERR_NoSpace = pgLibError.PG_ERR_NoSpace = PG_ERR_NoSpace;
global.PG_ERR_BadType = pgLibError.PG_ERR_BadType = PG_ERR_BadType;
global.PG_ERR_CheckErr = pgLibError.PG_ERR_CheckErr = PG_ERR_CheckErr;
global.PG_ERR_BadServer = pgLibError.PG_ERR_BadServer = PG_ERR_BadServer;
global.PG_ERR_BadDomain = pgLibError.PG_ERR_BadDomain = PG_ERR_BadDomain;
global.PG_ERR_NoData = pgLibError.PG_ERR_NoData = PG_ERR_NoData;
global.PG_ERR_Unknown = pgLibError.PG_ERR_Unknown = PG_ERR_Unknown;

global.pgLibError=pgLibError;

var strErrors = [
    "PG_ERR_Normal",
    "PG_ERR_System",
    "PG_ERR_BadParam",
    "PG_ERR_BadClass",
    "PG_ERR_BadMethod",
    "PG_ERR_BadObject",
    "PG_ERR_BadStatus",
    "PG_ERR_BadFile",
    "PG_ERR_BadUser",
    "PG_ERR_BadPass",
    "PG_ERR_NoLogin",
    "PG_ERR_Network",
    "PG_ERR_Timeout",
    "PG_ERR_Reject",
    "PG_ERR_Busy",
    "PG_ERR_Opened",
    "PG_ERR_Closed",
    "PG_ERR_Exist",
    "PG_ERR_NoExist",
    "PG_ERR_NoSpace",
    "PG_ERR_BadType",
    "PG_ERR_CheckErr",
    "PG_ERR_BadServer",
    "PG_ERR_BadDomain",
    "PG_ERR_NoData"
];

function pgLibErr2Str(iErr){
    if(iErr<0 || iErr >= strErrors.length){
        return "PG_ERR_Unknown";
    }
    return strErrors[iErr];
}

global.pgLibError=pgLibError;
global.pgLibErr2Str=pgLibErr2Str;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
(function (global){

function _ParseInt(sVal, idefVal) {
    try {
        if (typeof sVal == "string" && sVal != "") {
            return parseInt(sVal);
        }
        return idefVal;
    } catch (e) {
        return idefVal;
    }
}
global._ParseInt =_ParseInt;

function _AddrToReadable(sAddr) {
    try {
        var sAddrSect = sAddr.split(":", 6);
        if (sAddrSect.length < 6) {
            return sAddr;
        }

        var sReadable = "";
        var iIP0 = 0;
        var iIP1 = 0;
        var iIP2 = 0;
        var iIP3 = 0;
        if (sAddrSect[0] == "0" &&
            sAddrSect[1] == "0" &&
            sAddrSect[2] == "0" &&
            sAddrSect[3] != "0" &&
            sAddrSect[3] != "1") {
            var iIP = parseInt(sAddrSect[3], 16);
            iIP0 = (iIP >> 24) & 0xff;
            iIP1 = (iIP >> 16) & 0xff;
            iIP2 = (iIP >> 8) & 0xff;
            iIP3 = (iIP & 0xff);
            sReadable = (iIP0 + "." + iIP1 + "." + iIP2 + "." + iIP3 + ":" + sAddrSect[4]);
        } else {
            iIP0 = parseInt(sAddrSect[0], 16);
            iIP1 = parseInt(sAddrSect[1], 16);
            iIP2 = parseInt(sAddrSect[2], 16);
            iIP3 = parseInt(sAddrSect[3], 16);

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
global._AddrToReadable = _AddrToReadable;

var pgLibNode = {};
pgLibNode._ParseInt =_ParseInt;
pgLibNode._AddrToReadable = _AddrToReadable;


global.PG_CLASS_Peer = pgLibNode.PG_CLASS_Peer = "PG_CLASS_Peer";
global.PG_CLASS_Group = pgLibNode.PG_CLASS_Group = "PG_CLASS_Group";
global.PG_CLASS_Data = pgLibNode.PG_CLASS_Data = "PG_CLASS_Data";
global.PG_CLASS_File = pgLibNode.PG_CLASS_File = "PG_CLASS_File";
global.PG_CLASS_Audio = pgLibNode.PG_CLASS_Audio = "PG_CLASS_Audio";
global.PG_CLASS_Video = pgLibNode.PG_CLASS_Video = "PG_CLASS_Video";

global.PG_ADD_COMMON_Sync = pgLibNode.PG_ADD_COMMON_Sync = 0x10000;
global.PG_ADD_COMMON_Error = pgLibNode.PG_ADD_COMMON_Error = 0x20000;
global.PG_ADD_COMMON_Encrypt = pgLibNode.PG_ADD_COMMON_Encrypt = 0x40000;
global.PG_ADD_COMMON_Compress = pgLibNode.PG_ADD_COMMON_Compress = 0x80000;

global.PG_ADD_PEER_Self = pgLibNode.PG_ADD_PEER_Self = 0x1;
global.PG_ADD_PEER_Server = pgLibNode.PG_ADD_PEER_Server = 0x2;
global.PG_ADD_PEER_Static = pgLibNode.PG_ADD_PEER_Static = 0x4;
global.PG_ADD_PEER_Digest = pgLibNode.PG_ADD_PEER_Digest = 0x8;
global.PG_ADD_PEER_Disable = pgLibNode.PG_ADD_PEER_Disable = 0x10;

global.PG_ADD_GROUP_Update = pgLibNode.PG_ADD_GROUP_Update = 0x1;
global.PG_ADD_GROUP_Master = pgLibNode.PG_ADD_GROUP_Master =0x2;
global.PG_ADD_GROUP_Refered = pgLibNode.PG_ADD_GROUP_Refered = 0x4;
global.PG_ADD_GROUP_NearPeer = pgLibNode.PG_ADD_GROUP_NearPeer = 0x8;
global.PG_ADD_GROUP_Modify = pgLibNode.PG_ADD_GROUP_Modify = 0x10;
global.PG_ADD_GROUP_Index = pgLibNode.PG_ADD_GROUP_Index = 0x20;
global.PG_ADD_GROUP_Offline = pgLibNode.PG_ADD_GROUP_Offline = 0x40;
global.PG_ADD_GROUP_HearOnly = pgLibNode.PG_ADD_GROUP_HearOnly = 0x80;

global.PG_ADD_FILE_TcpSock = pgLibNode.PG_ADD_FILE_TcpSock = 0x1;
global.PG_ADD_FILE_Flush = pgLibNode.PG_ADD_FILE_Flush = 0x2;
global.PG_ADD_FILE_PeerStop = pgLibNode.PG_ADD_FILE_PeerStop = 0x4;

global.PG_ADD_AUDIO_Conference = pgLibNode.PG_ADD_AUDIO_Conference = 0x1;
global.PG_ADD_AUDIO_ShowVolume = pgLibNode.PG_ADD_AUDIO_ShowVolume = 0x2;
global.PG_ADD_AUDIO_OnlyInput = pgLibNode.PG_ADD_AUDIO_OnlyInput =0x4;
global.PG_ADD_AUDIO_OnlyOutput = pgLibNode.PG_ADD_AUDIO_OnlyOutput = 0x8;
global.PG_ADD_AUDIO_SendReliable = pgLibNode.PG_ADD_AUDIO_SendReliable = 0x10;
global.PG_ADD_AUDIO_NoSpeechSelf = pgLibNode.PG_ADD_AUDIO_NoSpeechSelf = 0x20;
global.PG_ADD_AUDIO_NoSpeechPeer = pgLibNode.PG_ADD_AUDIO_NoSpeechPeer = 0x40;
global.PG_ADD_AUDIO_MuteInput = pgLibNode.PG_ADD_AUDIO_MuteInput = 0x80;
global.PG_ADD_AUDIO_MuteOutput = pgLibNode.PG_ADD_AUDIO_MuteOutput = 0x100;

global.PG_ADD_VIDEO_Conference = pgLibNode.PG_ADD_VIDEO_Conference = 0x1;
global.PG_ADD_VIDEO_Preview = pgLibNode.PG_ADD_VIDEO_Preview = 0x2;
global.PG_ADD_VIDEO_OnlyInput = pgLibNode.PG_ADD_VIDEO_OnlyInput = 0x4;
global.PG_ADD_VIDEO_OnlyOutput = pgLibNode.PG_ADD_VIDEO_OnlyOutput = 0x8;
global.PG_ADD_VIDEO_FrameStat = pgLibNode.PG_ADD_VIDEO_FrameStat = 0x10;
global.PG_ADD_VIDEO_DrawThread = pgLibNode.PG_ADD_VIDEO_DrawThread = 0x20 ;
global.PG_ADD_VIDEO_OutputExternal = pgLibNode.PG_ADD_VIDEO_OutputExternal = 0x40;
global.PG_ADD_VIDEO_OutputExtCmp = pgLibNode.PG_ADD_VIDEO_OutputExtCmp = 0x80;
global.PG_ADD_VIDEO_FilterDecode = pgLibNode.PG_ADD_VIDEO_FilterDecode = 0x100;

global.PG_METH_COMMON_Sync = pgLibNode.PG_METH_COMMON_Sync = 0;
global.PG_METH_COMMON_Error = pgLibNode.PG_METH_COMMON_Error = 1;
global.PG_METH_COMMON_SetOption = pgLibNode.PG_METH_COMMON_SetOption = 2;
global.PG_METH_COMMON_GetOption = pgLibNode.PG_METH_COMMON_GetOption = 3;

global.PG_METH_PEER_Login = pgLibNode.PG_METH_PEER_Login = 32;
global.PG_METH_PEER_Logout = pgLibNode.PG_METH_PEER_Logout=33;
global.PG_METH_PEER_Status = pgLibNode.PG_METH_PEER_Status=34;
global.PG_METH_PEER_Call = pgLibNode.PG_METH_PEER_Call=35;
global.PG_METH_PEER_Message = pgLibNode.PG_METH_PEER_Message=36;
global.PG_METH_PEER_SetAddr = pgLibNode.PG_METH_PEER_SetAddr=37;
global.PG_METH_PEER_GetAddr = pgLibNode.PG_METH_PEER_GetAddr=38;
global.PG_METH_PEER_DigGen = pgLibNode.PG_METH_PEER_DigGen=39;
global.PG_METH_PEER_DigVerify = pgLibNode.PG_METH_PEER_DigVerify=40;
global.PG_METH_PEER_CheckInfo = pgLibNode.PG_METH_PEER_CheckInfo=41;
global.PG_METH_PEER_LanScan = pgLibNode.PG_METH_PEER_LanScan = 42;
global.PG_METH_PEER_AgentLogin = pgLibNode.PG_METH_PEER_AgentLogin = 43;
global.PG_METH_PEER_AgentLogout = pgLibNode.PG_METH_PEER_AgentLogout = 44;
global.PG_METH_PEER_AgentMessage = pgLibNode.PG_METH_PEER_AgentMessage = 45;
global.PG_METH_PEER_ReloginReply = pgLibNode.PG_METH_PEER_ReloginReply = 46;
global.PG_METH_PEER_KickOut = pgLibNode.PG_METH_PEER_KickOut = 47;
global.PG_METH_PEER_AccessCtrl = pgLibNode.PG_METH_PEER_AccessCtrl = 48;
global.PG_METH_PEER_PushOption = pgLibNode.PG_METH_PEER_PushOption = 49;

global.PG_METH_GROUP_Modify = pgLibNode.PG_METH_GROUP_Modify=32;
global.PG_METH_GROUP_Update = pgLibNode.PG_METH_GROUP_Update=33;
global.PG_METH_GROUP_Master = pgLibNode.PG_METH_GROUP_Master=34;

global.PG_METH_DATA_Message = pgLibNode.PG_METH_DATA_Message = 32;

global.PG_METH_FILE_Put = pgLibNode.PG_METH_FILE_Put = 32;
global.PG_METH_FILE_Get = pgLibNode.PG_METH_FILE_Get = 33;
global.PG_METH_FILE_Status = pgLibNode.PG_METH_FILE_Status = 34;
global.PG_METH_FILE_Cancel = pgLibNode.PG_METH_FILE_Cancel = 35;

global.PG_METH_AUDIO_Open = pgLibNode.PG_METH_AUDIO_Open = 32;
global.PG_METH_AUDIO_Close = pgLibNode.PG_METH_AUDIO_Close = 33;
global.PG_METH_AUDIO_CtrlVolume = pgLibNode.PG_METH_AUDIO_CtrlVolume = 34;
global.PG_METH_AUDIO_ShowVolume = pgLibNode.PG_METH_AUDIO_ShowVolume = 35;
global.PG_METH_AUDIO_Speech = pgLibNode.PG_METH_AUDIO_Speech = 36;
global.PG_METH_AUDIO_Record = pgLibNode.PG_METH_AUDIO_Record = 37;

global.PG_METH_VIDEO_Open = pgLibNode.PG_METH_VIDEO_Open = 32;
global.PG_METH_VIDEO_Close = pgLibNode.PG_METH_VIDEO_Close =33;
global.PG_METH_VIDEO_Move = pgLibNode.PG_METH_VIDEO_Move = 34;
global.PG_METH_VIDEO_Join = pgLibNode.PG_METH_VIDEO_Join = 35;
global.PG_METH_VIDEO_Leave = pgLibNode.PG_METH_VIDEO_Leave = 36;
global.PG_METH_VIDEO_Camera = pgLibNode.PG_METH_VIDEO_Camera =37;
global.PG_METH_VIDEO_Record = pgLibNode.PG_METH_VIDEO_Record =38;
global.PG_METH_VIDEO_Transfer = pgLibNode.PG_METH_VIDEO_Transfer = 39;
global.PG_METH_VIDEO_FrameStat = pgLibNode.PG_METH_VIDEO_FrameStat = 40;

global.pgLibNode = pgLibNode;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[4]);
