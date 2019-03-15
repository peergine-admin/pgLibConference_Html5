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
require("./pgLibConferenceConst");
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
 * 描述：设置心跳间隔。
 * 阻塞方式：非阻塞，立即返回
 * iExpire：[IN] 心跳间隔。
 */
this.SetExpire = function (iExpire) {
}	;

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

	// Start and stop audio
	/**
     *  描述：开始播放或采集音频
     *  阻塞方式：非阻塞，立即返回
     *   返回值： true 操作成功，false 操作失败
     * @return {boolean}
     */

	this.AudioStart = function () {
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

	this.AudioStop = function () {
		if (!this.m_Status.bServiceStart) {
			return;
		}

		if (this.m_Status.bApiAudioStart) {
			this._AudioClean();
			this.m_Status.bApiAudioStart = false;
		}
	};

	
	/**
	 * 
	 * 设置自身的扬声器和麦克风
	 * 阻塞方式：非阻塞，立即返回
	 * sPeer 节点名 （在麦克风下为空则表示控制本端的麦克风音量。 ）
	 * iMode 0表示扬声器 1表示麦克风
	 * iVolume 表示音量的百分比
     * @return {boolean}
     */
	this.AudioPeerVolume = function (sPeer, iType, iVolume) {
		return;
	};

	/**
	 * @return {boolean} true成功 ，false 失败
	 */

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