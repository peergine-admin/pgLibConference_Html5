
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