/* eslint-disable no-undef */
require('../../src/pgLibNode');
var assert  = require("assert");

it("test PG_CLASS_Peer",function(){
    assert.equal(PG_CLASS_Peer,"PG_CLASS_Peer");
});
it("test pgLibNode.PG_CLASS_Peer",function(){
    assert.equal(pgLibNode.PG_CLASS_Peer,"PG_CLASS_Peer");
});
it("test _ParseInt 2 1",function(){
    assert.equal(_ParseInt("2",1),2);
});
it("test pgLibNode._ParseInt 2 1",function(){
    assert.equal(pgLibNode._ParseInt("2",1),2);
});
it("test _ParseInt null 1",function(){
    assert.equal(_ParseInt(null,1),1);
});
it("test _ParseInt(undefined,1)",function(){

    assert.equal(_ParseInt(undefined,1),1);
});
it("test _ParseInt( ,1)",function(){
    assert.equal(_ParseInt("",1),1);
});
it("test ",function(){
    
});


