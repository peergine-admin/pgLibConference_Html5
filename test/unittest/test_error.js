/* eslint-disable no-undef */
require('../../src/pgLibError');
var assert  = require("assert");

it("test PG_ERR_CheckErr",function(){
    assert.equal(PG_ERR_CheckErr,21);
});
it("test pgLibError.PG_ERR_CheckErr",function(){
    assert.equal(pgLibError.PG_ERR_CheckErr,21);
});
it("test pgLibErr2Str PG_ERR_CheckErr",function(){
    assert.equal(pgLibErr2Str(pgLibError.PG_ERR_CheckErr),"PG_ERR_CheckErr");
});
it("test pgLibErr2Str 24",function(){
    assert.equal(pgLibErr2Str(24),"PG_ERR_NoData");
});
it("test pgLibErr2Str 25",function(){
    assert.equal(pgLibErr2Str(25),"PG_ERR_Unknown");
});
it("test pgLibErr2Str 255",function(){
    assert.equal(pgLibErr2Str(255),"PG_ERR_Unknown");
});
it("test pgLibErr2Str -1",function(){
    assert.equal(pgLibErr2Str(-1),"PG_ERR_Unknown");
});

it("test pgLibErr2Str 0",function(){
    assert.equal(pgLibErr2Str(0),"PG_ERR_Normal");
});