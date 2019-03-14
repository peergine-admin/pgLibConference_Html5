function Audio(opts,sObjA,sObjG,sAudioParam){
	var Node = this.Node = opts.Node;
	this.OutString = opts.OutString;
	this.sObjG = sObjG;
	this.sObjA = sObjA;
	
	this.bApiAudioStart = false;
    this.sAudioParam = sAudioParam;

    this.iAudioSpeechDisable = _ParseInt(Node.omlGetContent(sAudioParam, "AudioSpeechDisable"), 0);
    if (this.iAudioSpeechDisable == 0) {
        this.iAudioSpeechDisable = _ParseInt(Node.omlGetContent(sAudioParam, "AudioSpeech"), 0);
    }
}

this._AudioInit = function () {

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

    if (!this.m_Node.ObjectAdd(this.m_Group.sObjA, "PG_CLASS_Audio", this.m_Group.sObjG, uFlag)) {
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

this._AudioClean = function () {
    this.OutString("->AudioClean");
    this.m_Node.ObjectRequest(this.m_Group.sObjA, 33, "", "AudioStop");
    this.m_Node.ObjectDelete(this.m_Group.sObjA);
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
	this.AudioPeerVolume = function (sPeer, iType, iVolume) {
		var OutString= this.OutString;
		if (!this.m_Status.bApiAudioStart) {
			OutString("Audio not init");
			return false;
		}

		// var sObjPeer = this._ObjPeerBuild(sPeer);

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
	this.AudioSpeechDisable = function (iDisableMode) {
		this.m_Status.iAudioSpeechDisable = iDisableMode;
	};

	/**
     *  描述：控制某个节点是否播放本节点的音频。
     *  阻塞方式：非阻塞，立即返回
     *  sPeer：节点名
     *  bSendEnable: true接收 ，false不接收
     *  返回值： true 操作成功，false 操作失败
     */
	this.AudioSpeech = function (sPeer, bSendEnable) {
		return this.AudioSpeech2(sPeer, bSendEnable, true);
	};

	/**
     * @return {boolean} true成功 ，false 失败
     */
	this.AudioSpeech = function (sPeer, bSendEnable, bRecvEnable) {

		if (!this.m_Status.bServiceStart) {
			this.OutString("Service not start ");
			return false;
		}

		if (!this.m_Status.bApiAudioStart) {
			this.OutString("Audio not init");
			return false;
		}

		var sObjPeer = this._ObjPeerBuild(sPeer);

		// var bRet = false;
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
	this.AudioSetSampleRate = function (iRate) {
		var Node = this.Node;

		if (Node != null) {
			// Set microphone sample rate
			if (Node.ObjectAdd("_AudioTemp", "PG_CLASS_Audio", "", 0)) {
				Node.ObjectRequest("_AudioTemp", 2, "(Item){2}(Value){" + iRate + "}", "");
				Node.ObjectDelete("_AudioTemp");
			}
		}
	};


	Audio.prototype.OnExtRequestAudio = function(sObj, uMeth, sData, uHandle, sObjPeer){
		if (sObj == this.m_Group.sObjA) {
			if (uMeth == 0) {
				var sAct = this.m_Node.omlGetContent(sData, "Action");
				if (sAct == "1") {
					var sPeer4 = this._ObjPeerParsePeer(sObjPeer);
					this.EventProc("AudioSync", "", sPeer4);
				}
			}
		}
	};
	Audio.prototype.OnReplyAudio = function(sObj, iErr, sData, sParam) {
		if (sObj == this.m_Group.sObjA) {
			if (sParam == "AudioPeerVolume") { // Cancel file
				this.EventProc("AudioPeerVolume", "" + iErr.toString(), sObj);
			}
		}
	};