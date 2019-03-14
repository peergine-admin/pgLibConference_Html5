/* eslint-disable no-unused-vars */
var KEEP_TIMER_INTERVAL = 2;
function Conference(opts){
    this.sChair = "";
	this.iKeepTimer = -1;
	this.iActiveTimer = -1;
	this.bChairman = false;
	this.sObjChair = "";

	this.sObjG = "";
    this.sObjD = "";
    this.bServiceStart = false;

    // 节点连接状态检测
	this.iKeepExpire = 10;
	this.iKeepStamp = 0;
	this.iKeepChainmanStamp = 0;
    this.iRequestChainmanStamp = 0;
    
    this.IsDevice = opts.IsDevice;
}

/**
 * 描述：设置心跳间隔。
 * 阻塞方式：非阻塞，立即返回
 * iExpire：[IN] 心跳间隔。
 */
this.SetExpire = function (iExpire) {
    if (iExpire < (KEEP_TIMER_INTERVAL * 2)) {
        this.m_Stamp.iExpire = 0;
    } else {
        this.m_Stamp.iExpire = iExpire;
    }
};

this._GroupUpdate = function (sData) {
    var self = this;
    var Node = this.Node;

    var sAct = Node.omlGetContent(sData, "Action");
    var sPeerList = Node.omlGetEle(sData, "PeerList.", 256, 0);

    var iInd = 0;
    while (sPeerList) {
        var sEle = Node.omlGetEle(sPeerList, "", 1, iInd);
        if (!sEle) {
            break;
        }

        var sObjPeer = this.m_Node.omlGetName(sEle, "");
        if (self.IsDevice()) {
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


this._OnDataNotify = function (sObjPeer, sData) {
    var sPeer1 = this._ObjPeerParsePeer(sObjPeer);
    return this.EventProc("Notify", sData, sPeer1);
};

this._ServiceStart = function () {
    var self = this;
    var Node = this.Node;
    var OutString = this.OutString;

    var sObjChair = this.sObjChair;
    var sObjSelf = this.sObjSelf;
    var sObjG = this.sObjG;

    OutString(" ->ServiceStart ");
    do {
        if (sObjChair == sObjSelf) {
            // Add group object.
            if (!Node.ObjectAdd(sObjG, "PG_CLASS_Group", "", (0x10000 | 0x10 | 0x4 | 0x1))) {
                OutString("_ServiceStart: Add Group failed.");
                break;
            }
            var uMask = 0x0200; // Tell all.
            var sDataMdf = "(Action){1}(PeerList){(" + this.m_Self.sObjSelf + "){" + uMask + "}}";
            var iErr = Node.ObjectRequest(this.m_Group.sObjG, 32, sDataMdf, "");
            if (iErr > 0) {
                OutString("MemberAdd: Add group member failed");
                break;
            }
        } else {
            // Add group object.
            if (!Node.ObjectAdd(this.m_Group.sObjG, "PG_CLASS_Group", this.m_Group.sObjChair, (0x10000 | 0x10 | 0x1))) {
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

this._ServiceStop = function () {
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
	/*

     *  描述：开始会议，初始化视音频等会议相关数据。
     *  阻塞方式：非阻塞
     *  返回值：true 成功  false 失败
     */
	this.Start = function (sName, sChair) {
		this.m_Group.Init(sName, sChair, this.m_Self.sUser);
		this.m_Stamp.restore();
		return !this.m_Group.bEmpty && this._ServiceStart();
	};

	/*
     *  描述：停止会议，初始化视音频等会议相关数据。
     *  阻塞方式：非阻塞
     *  返回值：true 成功  false 失败
     */
	this.Stop = function () {
		this._ServiceStop();
		this.m_Group.bEmpty = true;
	};

	


	/**
     *  描述：添加成员（主席端）
     *  阻塞方式：非阻塞，立即返回
     * @param {String} sMember：[IN] 成员名 
     * @return {boolean} true 操作成功，false 操作失败
     */
	this.MemberAdd = function (sMember) {
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

	this.MemberDel = function (sMember) {

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

	this.Join = function () {
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

	this.Leave = function () {

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
	this.Reset = function (sName, sChair) {
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
     *  描述：给所有成员节点发送消息
     *  阻塞方式：非阻塞，立即返回
     *  sMsg：[IN] 消息内容
     *  返回值： true 操作成功，false 操作失败
     * @return {boolean}
     */
	this.NotifySend = function (sData) {
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


    this._KeepAdd = function (sObjPeer) {
		// 添加
		this.OutString("->KeepAdd");
		if (this._SyncPeerSearch(sObjPeer) == null) {
			var oSync = new PG_SYNC(sObjPeer);
			oSync.iKeepStamp = this.m_Stamp.iKeepStamp;
			this.m_listSyncPeer.push(oSync);
		}
		this.m_Node.ObjectRequest(sObjPeer, 36, "Keep?", "pgLibConference.MessageSend");
	};

	this._KeepDel = function (sObjPeer) {
		//作为成员端只接受主席端心跳 删除
		this.OutString("->KeepDel");
		for (var i = 0; i < this.m_listSyncPeer.length; i++) {
			if (this.m_listSyncPeer[i].sObjPeer == sObjPeer) {
				this.m_listSyncPeer.splice(i, 1);
			}
		}
	};

	//收到Keep
	this.onRecvKeep = function (sObjPeer) {
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
	this._Keep = function () {
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
					this.m_listSyncPeer.splice(i, 1);
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


	this._OnChairPeerSync = function (sObj, sData) {
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

	this._OnChairPeerError = function (sObj, sData) {
		var sMeth = this.m_Node.omlGetContent(sData, "Meth");
		if (sMeth == "34") {
			var sError = this.m_Node.omlGetContent(sData, "Error");
			this._KeepDel(sObj);
			this._PeerOffline(sObj, sError);
		}
    };
Conference.prototype.OnExtRequestGroup = function(sObj, uMeth, sData, uHandle, sObjPeer){
    if (sObj == this.m_Group.sObjG) {
        if (uMeth == 33) {
            this._GroupUpdate(sData);
        }
        return 0;
    }
};
Conference.prototype.OnReplyGroup = function(sObj, iErr, sData, sParam) {
    return 0;
};
Conference.prototype.OnExtRequestData = function(sObj, uMeth, sData, uHandle, sObjPeer){
    if (sObj == this.m_Group.sObjD) {
        if (uMeth == 32) {
            return this._OnDataNotify(sObjPeer, sData);
        }
        return 0;
    }
};
Conference.prototype.OnReplyData = function(sObj, iErr, sData, sParam) {
    return 0;
};

Conference.prototype.OnEventProc = function(sAct,sData,sObjPeer) {
    if (sObjPeer == this.m_Group.sObjChair) {
        //心跳包列表 删除
        if (!m_Group.bEmpty && m_Group.bChairman) {
           _KeepDel(sObj);
       }
       sAct = "ChairmanOffline";
   } else {
       sAct = "PeerOffline";
   }
}