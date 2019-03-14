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