
#怎样测试DEMO

    1、在电脑中安装Peergine中间件,安装包为：pgPluginSetup_zh_vXXX.XX.msi。
	
	2、然后用IE打开Demo/demo.html。
	
	3、拷贝整个包到其他电脑，重复步骤1和步骤2。
	
	4、根据页面提示两条电脑输入相同会议ID，其他一台启动为主席（Chairman），其他为非主席。
	
	5、查看视频连接效果。

	
#怎样使用会议模块开发网页

	1、网页页面中引入pgLibConference/pgLibConference.js脚本。
	
	2、在网页页面创建一个对象object，其classid="clsid:FFC9369F-A8D9-4598-8E22-ED07C7628BFC" 其他参数自定。
	
		例如：<object id="pgAtx_1" classid="clsid:FFC9369F-A8D9-4598-8E22-ED07C7628BFC" width="280" height="210" style="border:1px solid #cccccc;">请先安装Peergine控件，再重新打开页面！
		</object>。
		
	3、创建一个JavaScript对象用于做事件接受器，参考demo中var OnEventListener={OnEvent: function(sAct, sData, sPeer) {}}。
	
	4、详细请查看 Doc 文件夹下文档。


#版本升级日志
v1.0.5
1.添加视频外部采集接口参数VideoInExternal
2.视频流角度调整参数。
3.添加API给服务器发送扩展消息
4.添加事件PeerSync表示本端与对端建立通道，可以利用MessageSend进行通信。
5.添加事件PeerOffline表示对端已经离线。
6.添加事件VideoLost用来报告视频已经丢失
7.内部添加成员端对主席端的心跳。以加快将网络异常报告给应用程序。
8.内部添加视频连接时的心跳，以检测异常重启时对端不能及时获取视频丢失的消息。
进行了若干优化。修复了若干BUG。

updata 2016/11/17 v1.0.6
 * 添加视频的抓拍和录制功能
 * 做了一个超时检测 在执行MemberAdd MemberDel Leave 操作是 如果45秒内没有退出和加入会议   。就产生TimeOut 的回调    sData 数操作名   sPeer是参数
 还添加了CallSend 功能比较MessageSend会产生CallSend的回执
 CallSend函数的最后一个参数自定义
 CallSend回调事件的sData 是错误代码 0是正常 ，sPeer是CallSend的最后一个参数
 
 