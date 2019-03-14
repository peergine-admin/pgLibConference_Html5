
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
