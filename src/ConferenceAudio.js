

/**
 * 设置采样率
 * @param {Integer} iRate 采样率
 */
function setAudioSampleRate(Node,iRate) {

	if (Node != null) {
		// Set microphone sample rate
		if (Node.ObjectAdd("_AudioTemp", "PG_CLASS_Audio", "", 0)) {
			Node.ObjectRequest("_AudioTemp", 2, "(Item){2}(Value){" + iRate + "}", "");
			Node.ObjectDelete("_AudioTemp");
		}
	}
}
module.exports.setAudioSampleRate = setAudioSampleRate;

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

Audio.prototype.AudioCreate = function (iFlag) {
	var self = this;
	var Node = this.Node;
	var OutString = this.OutString;
    OutString("Audio.AudioCreate begin");
    var uFlag = 0x10000 | 0x01;
    switch (iFlag) {
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

    if (!Node.ObjectAdd(self.sObjA, "PG_CLASS_Audio", self.sObjG, uFlag)) {
        this.OutString("Audio.AudioCreate: Add 'Audio' failed.");
        return false;
    }

    var iErr = Node.ObjectRequest(self.sObjA, 32, "(Code){1}(Mode){0}", "AudioStart");
    if (iErr > 0) {
        OutString("Audio.AudioCreate: Open audio failed. iErr=" + iErr);
        return false;
    }
    return true;
};
Audio.prototype.onAudioSync = function(sData,sObjPeer){
	var self= this,Node= this.Node,OutString= this.OutString;
	var sAct = Node.omlGetContent(sData, "Action");
	if (sAct == "1") {
		this.EventProc("AudioSync", "", sObjPeer);
	}
}
Audio.prototype.AudioDestroy = function () {
	var self = this;
	var Node = this.Node;
	var OutString = this.OutString;

    Node.ObjectRequest(self.sObjA, 33, "", "AudioStop");
	Node.ObjectDelete(self.sObjA);
	OutString("Audio.AudioClean");
};


Audio.prototype.setAudioPeerVolume = function (sObjPeer, iType, iVolume) {
	var self= this,Node= this.Node,OutString= this.OutString;

	iType = iType > 0 ? 1 : 0;

	iVolume = iVolume < 0 ? 0 : iVolume; //iVolume防止参数小于0
	iVolume = iVolume > 100 ? 100 : iVolume; //大于100 取100
	var sData = "(Peer){}(Action){1}(Type){" + iType + "}(Volume){" + this.m_Node.omlEncode(iVolume + "") +
		"}(Max){0}(Min){0}";
	var iErr = Node.ObjectRequest(self.sObjA, 34, sData, "Audio.setAudioPeerVolume");
	if (iErr > 0) {
		OutString("Audio.AudioPeerVolume:set Volume, iErr=" + iErr);
		return false;
	}
	return true;
};

Audio.prototype.onAudioPeerVolume = function(sObj, iErr, sData, sParam){
	if (sParam == "Audio.setAudioPeerVolume") { // Cancel file
		this.EventProc("AudioPeerVolume", "" + iErr.toString(), sObj);
	}
};

Audio.prototype.setAudioSpeech = function (sObjPeer, bSendEnable, bRecvEnable) {
	var self= this,Node= this.Node,OutString= this.OutString;

	// var bRet = false;
	var iSendEnable = bSendEnable ? 1 : 0;
	var iRecvEnable = bRecvEnable ? 1 : 0;
	var sData = "(Peer){" + sObjPeer + "}(ActSelf){" + iSendEnable + "}(ActPeer){" + iRecvEnable + "}";
	var iErr = Node.ObjectRequest(self.sObjA, 36, sData, "Audio.AudioSpeech");
	if (iErr > 0) {
		OutString("Speech: Set Speech, iErr=" + iErr);
		return false;
	}
	return true;
};


Audio.prototype.OnExtRequestAudio = function(sObj, uMeth, sData, uHandle, sObjPeer){
	var self = this;
	if (uMeth == 0) {
		self.onAudioSync(sData,sObjPeer);
	}
	
};
Audio.prototype.OnReplyAudio = function(sObj, iErr, sData, sParam) {
	var self = this;
	self.onAudioPeerVolume(sObj, iErr, sData, sParam);
};