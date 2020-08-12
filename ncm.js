/**
 * Created by cimoc on 2016/12/23
 * Modified by wwh1004 on 2019/05/02
 * Netease Cloud Music Lyric Source For ESLyric
 * version : 0.1.3
 * 感谢 ChowDPa02K,Jeannela\Elia, 不知名的的api提供者
 * 页面 : https://github.com/cimoc-sokka/Some-js-script-for-FB2K
 * 下载 : https://github.com/cimoc-sokka/Some-js-script-for-FB2K/releases
 * cimoc的邮箱 : cimoc@sokka.cn
 */

    //更改lrc_order内标识顺序,设置歌词输出顺序,删除即不获取
    //old_merge:并排合并歌词,newtype:并列合并,tran:翻译,origin:原版歌词,
	/*
	new_merge:并排合并歌词,在卡拉OK模式下仅高亮原语言歌词
	不推荐使用,仅能即时获取歌词即时使用,不能保存,且若原词为全英文或英文符号则翻译前会显示时间轴
	*/
var lrc_order = [
        "old_merge",
        "newtype",
        "origin",
        "tran", 
		//"new_merge"
    ];

//搜索歌词数,如果经常搜不到试着改小或改大
var limit = 4;

//更改或删除翻译外括号
//提供一些括号〔 〕〈 〉《 》「 」『 』〖 〗【 】( ) [ ] { }
var bracket = [
    "「", //左括号
    "」"  //右括号
];

//修复newtype歌词保存 翻译提前秒数 设为0则取消 如果翻译歌词跳的快看的难过,蕴情设为0.4-1.0
var savefix = 0.01;
//new_merge歌词翻译时间轴滞后秒数，防闪
var timefix = 0.01;
//当timefix有效时设置offset(毫秒),防闪
var offset=-20;
// 最小准确匹配度
var min_exact_matching=85;
// 最小模糊匹配度
var min_fuzzy_matching=85;

var debug = false;
var xmlHttp = new ActiveXObject("WinHttp.WinHttpRequest.5.1");
if(debug)
    xmlHttp.SetProxy(2, "127.0.0.1:8888");
function get_my_name() {
    return "网易云音乐";
}

function get_version() {
    return "0.1.3";
}

function get_author() {
    return "cimoc & wwh1004";
}

function start_search(info, callback) {
    var lyricURL, lyricInfo;

    //删除feat.及之后内容并保存
    var str1 = del(info.Title, "feat.");
    var str2 = del(info.Artist, "feat.");
    var outstr1 = str1[1];
    var outstr2 = str2[1];

    debug && console(
        "info.Title: " + info.Title + "\n" +
        "info.Artist: " + info.Artist);
    lyricInfo = getLyricInfo(info, true);
    if (!lyricInfo) {
        lyricInfo = getLyricInfo(info, false);
        if (!lyricInfo)
            return false;
    }
    var song = lyricInfo[0];
    var b = lyricInfo[1];
    var c = lyricInfo[2];

    var res_id = song[b].id;
    var res_name = song[b].name;
    var res_artist = song[b].artists[c].name;
    debug && console(res_id + "-" + res_name + "-" + res_artist);

    //获取歌词
    lyricURL = "http://music.163.com/api/song/lyric?os=pc&id=" + res_id + "&lv=-1&kv=-1&tv=-1";
    try {
        xmlHttp.Open("GET", lyricURL, false);
        //noinspection JSAnnotator
        xmlHttp.Option(4) = 13056;
        //noinspection JSAnnotator
        xmlHttp.Option(6) = false;
        xmlHttp.SetRequestHeader("Cookie", "appver=1.5.0.75771");
        xmlHttp.SetRequestHeader("Referer", "http://music.163.com/");
        xmlHttp.SetRequestHeader("Connection", "Close");
        xmlHttp.Send();
    } catch (e) {
        debug && console("Get Lyric failed");
        return;
    }
    //添加歌词
    if (xmlHttp.Status == 200) {
        var ncm_lrc = json(xmlHttp.responseText);
        var issettran = 0;
        var issetlrc = 0;
        if (!ncm_lrc.lrc)
            return false;
        if (ncm_lrc.tlyric && ncm_lrc.tlyric.lyric) {
            tranlrc = ncm_lrc.tlyric.lyric.replace(/(〔|〕|〈|〉|《|》|「|」|『|』|〖|〗|【|】|{|}|\/)/g, "");
            issettran = 1;
        } else debug && console("no translation");
        if (ncm_lrc.lrc.lyric)
            issetlrc = 1;
        else
            debug && console("no lyric");
        if (!lrc_order.length)
            lrc_order = ["new_merge", "newtype", "origin", "tran"];

        var newLyric = callback.CreateLyric();
        for (var key in lrc_order) {
            switch (lrc_order[key]) {
                case "new_merge" :
                    if (issetlrc && issettran) {
                        newLyric.LyricText = lrc_newtype(ncm_lrc.lrc.lyric, tranlrc, false);
                        newLyric.Title = res_name + outstr1;
                        newLyric.Artist = res_artist + outstr2;
                        newLyric.Source = "(并排)" + get_my_name();
                        callback.AddLyric(newLyric);
                    }
                    break;
                case "origin" :
                    if (issetlrc) {
                        newLyric.LyricText = ncm_lrc.lrc.lyric;
                        newLyric.Title = res_name + outstr1;
                        newLyric.Artist = res_artist + outstr2;
                        newLyric.Source = "(原词)" + get_my_name();
                        callback.AddLyric(newLyric);
                    }
                    break;
                case "tran" :
                    if (issettran) {
                        newLyric.LyricText = tranlrc;
                        newLyric.Title = res_name + outstr1;
                        newLyric.Artist = res_artist + outstr2;
                        newLyric.Source = "(翻译)" + get_my_name();
                        callback.AddLyric(newLyric);
                    }
                    break;
                case "newtype":
                    if (issetlrc && issettran) {
                        newLyric.LyricText = lrc_newtype(ncm_lrc.lrc.lyric, tranlrc, true);
                        newLyric.Title = res_name + outstr1;
                        newLyric.Artist = res_artist + outstr2;
                        newLyric.Source = "(并列)" + get_my_name();
                        callback.AddLyric(newLyric);
                    }
                    break;
                case "old_merge" :
                    if (issetlrc && issettran) {
                        newLyric.LyricText = lrc_merge(ncm_lrc.lrc.lyric, tranlrc);
                        newLyric.Title = res_name + outstr1;
                        newLyric.Artist = res_artist + outstr2;
                        newLyric.Source = "(并排-旧)" + get_my_name();
                        callback.AddLyric(newLyric);
                    }
                    break;
            }
        }
        newLyric.Dispose();
    }
}
function getLyricInfo(info, exact) {
    var searchURL;

    //删除feat.及之后内容并保存
    var str1 = del(info.Title, "feat.");
    var str2 = del(info.Artist, "feat.");
    var title = str1[0];
    var artist = str2[0];
    //搜索
    var s = "";
    if(exact)
        s = artist ? (title + "+" + artist) : title;
    else
        s = title;
    //searchURL = "http://music.163.com/api/search/get/web?csrf_token=";//如果下面的没用,试试改成这句
    searchURL = "http://music.163.com/api/search/get/";
    var post_data = 'hlpretag=<span class="s-fc7">&hlposttag=</span>&s=' + encodeURIComponent(s) + '&type=1&offset=0&total=true&limit=' + limit;
    try {
        xmlHttp.Open("POST", searchURL, false);
        //noinspection JSAnnotator
        xmlHttp.Option(4) = 13056;
        //noinspection JSAnnotator
        xmlHttp.Option(6) = false;
        xmlHttp.SetRequestHeader("Host", "music.163.com");
        xmlHttp.SetRequestHeader("Origin", "http://music.163.com");
        xmlHttp.SetRequestHeader("User-Agent", "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36");
        xmlHttp.SetRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xmlHttp.SetRequestHeader("Referer", "http://music.163.com/search/");
        xmlHttp.SetRequestHeader("Connection", "Close");
        xmlHttp.Send(post_data);
    } catch (e) {
        debug && console("search failed");
        return;
    }

    if (xmlHttp.Status == 200) {
        //  console(xmlHttp.responseText);
        var ncm_back = json(xmlHttp.responseText);
        var result = ncm_back.result;
        if (ncm_back.code != 200 || !result.songCount) {
            debug && console("get info failed");
            return;
        }
        //筛选曲名及艺术家
        var song = result.songs;
        var out = [0, 0];
        var b = -1;
        var c = 0;
        debug && console(
            "title: " + title + "\n" + 
            "artist: " + artist);
        lb1:
        for (var k in song) {
            var ncm_name = song[k].name;
            //不知道为什么ESLyric会把繁体转换成简体
            ncm_name = simplized(ncm_name);
            for (var a_k in song[k].artists) {
                var ncm_artist = song[k].artists[a_k].name;
                var p0, p1;

                ncm_artist = simplized(ncm_artist);
                if (exact) {
                    p0 = compare(title, ncm_name);
                    p1 = compare(artist, ncm_artist);
                    debug && a_k == 0 && console(
                        "exact-matching" + "\n" +
                        "ncm_title: " + ncm_name + "\n" +
                        "ncm_artist: " + ncm_artist + "\n" +
                        "title_matching: " + p0 + "\n" +
                        "artist_matching: " + p1);
                    if (p0 >= min_exact_matching && p1 >= min_exact_matching) {
                        b = k;
                        c = a_k;
                        break lb1;
                    }
                }
                else {
                    p0 = compare(title, ncm_name);
                    debug && a_k == 0 && console(
                        "fuzzy-matching" + "\n" +
                        "ncm_title: " + ncm_name + "\n" +
                        "title_matching: " + p0);
                    if (p0 >= min_fuzzy_matching) {
                        b = k;
                        c = a_k;
                        break lb1;
                    }
                }
            }
        }
        if (b == -1)
            return;
        else
            return [song, b, c];
    }
}

function console(s) {
    fb.trace("NCMscript: \n" + s);
}
function del(str, delthis) {
    var s = [str, ""];
    var set = str.indexOf(delthis);

    if (set == -1) {
        return s;
    }
    s[1] = " " + str.substr(set);
    s[0] = str.substring(0, set);

    return s;
}
function compare(x, y) {
    x = x.split("");
    y = y.split("");
    var z = 0;
    var s = x.length + y.length;


    x.sort();
    y.sort();
    var a = x.shift();
    var b = y.shift();

    while (a !== undefined && b !== undefined) {
        if (a === b) {
            z++;
            a = x.shift();
            b = y.shift();
        } else if (a < b) {
            a = x.shift();
        } else if (a > b) {
            b = y.shift();
        }
    }
    return z / s * 200;
}
function lrc_merge(olrc, tlrc) {
    olrc = olrc.split("\n");
    tlrc = tlrc.split("\n");
    var o_f = olrc[0].indexOf("[by:");
    if (o_f == 0) {
        var o_b = olrc[0].indexOf("]");
        var o = (o_f != -1 && o_b != -1) ? olrc[0].substring(4, o_b) : "";

        var t_f = tlrc[0].indexOf("[by:");
        var t_b = tlrc[0].indexOf("]");
        var t = (t_f != -1 && t_b != -1) ? olrc[0].substring(4, o_b) : "";
        olrc[0] = "[by:" + o + "/译:" + t + "]";
    }
    for (var ii = 5,set=0,counter; ii < 10; ii++) {//玄学取set...
        counter = olrc[ii].indexOf("]");
        // debug &&console(ii+':'+counter);
        counter = (counter == -1) ? 9 : counter;
        set+=counter;
    }
	set = Math.round(set/5);
    var i = 0;
    var l = tlrc.length;
    var lrc = [];
    for (var k in olrc) {
        var a = olrc[k].substring(1, set);
        while (i < l) {
            var j = 0;
            var tf = 0;
            while (j < 5) {
                if (i + j >= l) break;
                var b = tlrc[i + j].substring(1, set);
                if (a == b) {
                    tf = 1;
                    i += j;
                    break;
                }
                j++;
            }
            if (tf == 0) {
                lrc[k] = olrc[k];
                break;
            }
            var c = tlrc[i].substr(set + 1);
            if (c) {
                lrc[k] = olrc[k] + bracket[0] + tlrc[i].substr(set + 1) + bracket[1];
                i++;
                break;
            } else {
                lrc[k] = olrc[k];
                break;
            }
        }
    }
    return lrc.join("\n");

}
function lrc_newtype(olrc, tlrc, merge_type) {
    olrc = olrc.split("\n");
    tlrc = tlrc.split("\n");
    /*
    var o_f = olrc[0].indexOf("[by:");
    if (o_f == 0) {
        var o_b = olrc[0].indexOf("]");
        var o = (o_f != -1 && o_b != -1) ? olrc[0].substring(4, o_b) : "";

        var t_f = tlrc[0].indexOf("[by:");
        var t_b = tlrc[0].indexOf("]");
        var t = (t_f != -1 && t_b != -1) ? olrc[0].substring(4, o_b) : "";
        olrc[0] = "[by:" + o + "/译:" + t + "]";
    }
    */
    for (var ii = 5,set=0,counter; ii < 10; ii++) {//玄学取set...
        counter = olrc[ii].indexOf("]");
        // debug &&console(ii+':'+counter);
        counter = (counter == -1) ? 9 : counter;
        set+=counter;
    }
    set = Math.round(set/5);
    // debug &&console("set:"+set);
    var i = 0;
    var l = tlrc.length;
    var lrc = new Array();
    var r = new Array();
    for (var k in olrc) {
        var a = olrc[k].substring(1, set);
        if (i >= l) break;//防溢出数组
        var j = 0;
        var tf = 0;//标记变量,时间轴符合置1
        while (j < 5) {
            if (i + j >= l) break;//防溢出数组
            var b = tlrc[i + j].substring(1, set);
            if (a == b) {
                tf = 1;
                i += j;
                break;
            }
            j++;
        }
        if (tf == 0) {
            r.push([k, false, a]);
        } else {
            r.push([k, i, a]);
        }

    }
    var l_r = r.length;

    if (merge_type) {
        for (var kk = 0; kk < l_r; kk++) {
            o = r[kk][0];
            t = r[kk][1];
            var o_lrc=olrc[o].substr(set + 1);
            o_lrc=o_lrc?olrc[o]:"["+r[kk][2]+"]  ";
            lrc.push(o_lrc);
            var t_lrc = t !==false && tlrc[t].substr(set + 1) ? bracket[0] + tlrc[t].substr(set + 1) + bracket[1] : " ";
            if (kk + 2 > l_r) break;
            if (r[kk + 1][2]) {
                var timeb = r[kk + 1][2].replace(/(])/, "");

                if (savefix) {
                    var x = parseInt(timeb.substr(0, 2));
                    var y = parseFloat(timeb.substr(3, set - 4));
                    var ut = x * 60 + y - savefix;
                    var time = "[" + prefix(Math.floor(ut / 60),2) + ":" + prefix((ut % 60).toFixed(2),5) + "]";
                    // debug && console(time);
                } else var time = "[" + timeb + "]";
            } else {
                var x = parseInt(r[kk][2].substr(0, 2));
                var y = parseInt(r[kk][2].substr(3, 2));
                var z = r[kk][2].substr(5, 3);
                var ut = x * 60 + y + 4;
                var time = "[" + prefix(Math.floor(ut / 60),2) + ":" + prefix((ut % 60).toFixed(2),5) + "]";
                // debug && console(time);
            }

            lrc.push(time + t_lrc);
        }
    } else {
        if (timefix&&offset) lrc.push("[offset:"+offset+"]");
        for (var kk = 0; kk < l_r; kk++) {
            o = r[kk][0];
            t = r[kk][1];
            var o_lrc=olrc[o].substr(set + 1);
            o_lrc=o_lrc?olrc[o]:"["+r[kk][2]+"]  ";//重要：空格
            var t_lrc = t !==false && tlrc[t].substr(set + 1) ? bracket[0] + tlrc[t].substr(set + 1) + bracket[1] : " ";
            if (kk + 2 > l_r) break;
            if (r[kk + 1][2]) {
                var timeb = r[kk + 1][2].replace(/(])/, "");
                // debug &&console("timeb="+timeb);

                if (timefix) {
                    var x = parseInt(timeb.substr(0, 2));
                    var y = parseFloat(timeb.substr(3, set - 4));
                    var ut = x * 60 + y + timefix;
                    var time = "[" + prefix(Math.floor(ut / 60),2) + ":" + prefix((ut % 60).toFixed(2),5) + "]";
                    // debug &&console("time="+time);
                } else {var time = "[" + timeb + "]";}
                lrc.push(o_lrc + " " + time + t_lrc);
            } else {
                var x = parseInt(r[kk][2].substr(0, 2));
                var y = parseInt(r[kk][2].substr(3, 2));
                var z = r[kk][2].substr(5, 3);
                var ut = x * 60 + y + 4;
                var time = "[" + prefix(Math.floor(ut / 60),2) + ":" + prefix((ut % 60).toFixed(2),5) + "]";
                lrc.push(o_lrc + " " + time + t_lrc);
                lrc.push(time+"-End-");
                // debug && console(time);
            }
            // debug &&console(o_lrc + time + t_lrc);

        }


    }


    // debug && console("lyric length:" + lrc.length);
    return lrc.join("\n");

}
function prefix(num, length) {
 return (Array(length).join('0') + num).slice(-length);
}
function json(text) {
    try {
        var data = JSON.parse(text);
        return data;
    } catch (e) {
        return false;
    }
}

function JTPYStr() {
    return '皑蔼碍爱翱袄奥坝罢摆败颁办绊帮绑镑谤剥饱宝报鲍辈贝钡狈备惫绷笔毕毙闭边编贬变辩辫鳖瘪濒滨宾摈饼拨钵铂驳卜补参蚕残惭惨灿苍舱仓沧厕侧册测层诧搀掺蝉馋谗缠铲产阐颤场尝长偿肠厂畅钞车彻尘陈衬撑称惩诚骋痴迟驰耻齿炽冲虫宠畴踌筹绸丑橱厨锄雏础储触处传疮闯创锤纯绰辞词赐聪葱囱从丛凑窜错达带贷担单郸掸胆惮诞弹当挡党荡档捣岛祷导盗灯邓敌涤递缔点垫电淀钓调迭谍叠钉顶锭订东动栋冻斗犊独读赌镀锻断缎兑队对吨顿钝夺鹅额讹恶饿儿尔饵贰发罚阀珐矾钒烦范贩饭访纺飞废费纷坟奋愤粪丰枫锋风疯冯缝讽凤肤辐抚辅赋复负讣妇缚该钙盖干赶秆赣冈刚钢纲岗皋镐搁鸽阁铬个给龚宫巩贡钩沟构购够蛊顾剐关观馆惯贯广规硅归龟闺轨诡柜贵刽辊滚锅国过骇韩汉阂鹤贺横轰鸿红后壶护沪户哗华画划话怀坏欢环还缓换唤痪焕涣黄谎挥辉毁贿秽会烩汇讳诲绘荤浑伙获货祸击机积饥讥鸡绩缉极辑级挤几蓟剂济计记际继纪夹荚颊贾钾价驾歼监坚笺间艰缄茧检碱硷拣捡简俭减荐槛鉴践贱见键舰剑饯渐溅涧浆蒋桨奖讲酱胶浇骄娇搅铰矫侥脚饺缴绞轿较秸阶节茎惊经颈静镜径痉竞净纠厩旧驹举据锯惧剧鹃绢杰洁结诫届紧锦仅谨进晋烬尽劲荆觉决诀绝钧军骏开凯颗壳课垦恳抠库裤夸块侩宽矿旷况亏岿窥馈溃扩阔蜡腊莱来赖蓝栏拦篮阑兰澜谰揽览懒缆烂滥捞劳涝乐镭垒类泪篱离里鲤礼丽厉励砾历沥隶俩联莲连镰怜涟帘敛脸链恋炼练粮凉两辆谅疗辽镣猎临邻鳞凛赁龄铃凌灵岭领馏刘龙聋咙笼垄拢陇楼娄搂篓芦卢颅庐炉掳卤虏鲁赂禄录陆驴吕铝侣屡缕虑滤绿峦挛孪滦乱抡轮伦仑沦纶论萝罗逻锣箩骡骆络妈玛码蚂马骂吗买麦卖迈脉瞒馒蛮满谩猫锚铆贸么霉没镁门闷们锰梦谜弥觅绵缅庙灭悯闽鸣铭谬谋亩钠纳难挠脑恼闹馁腻撵捻酿鸟聂啮镊镍柠狞宁拧泞钮纽脓浓农疟诺欧鸥殴呕沤盘庞国爱赔喷鹏骗飘频贫苹凭评泼颇扑铺朴谱脐齐骑岂启气弃讫牵扦钎铅迁签谦钱钳潜浅谴堑枪呛墙蔷强抢锹桥乔侨翘窍窃钦亲轻氢倾顷请庆琼穷趋区躯驱龋颧权劝却鹊让饶扰绕热韧认纫荣绒软锐闰润洒萨鳃赛伞丧骚扫涩杀纱筛晒闪陕赡缮伤赏烧绍赊摄慑设绅审婶肾渗声绳胜圣师狮湿诗尸时蚀实识驶势释饰视试寿兽枢输书赎属术树竖数帅双谁税顺说硕烁丝饲耸怂颂讼诵擞苏诉肃虽绥岁孙损笋缩琐锁獭挞抬摊贪瘫滩坛谭谈叹汤烫涛绦腾誊锑题体屉条贴铁厅听烃铜统头图涂团颓蜕脱鸵驮驼椭洼袜弯湾顽万网韦违围为潍维苇伟伪纬谓卫温闻纹稳问瓮挝蜗涡窝呜钨乌诬无芜吴坞雾务误锡牺袭习铣戏细虾辖峡侠狭厦锨鲜纤咸贤衔闲显险现献县馅羡宪线厢镶乡详响项萧销晓啸蝎协挟携胁谐写泻谢锌衅兴汹锈绣虚嘘须许绪续轩悬选癣绚学勋询寻驯训讯逊压鸦鸭哑亚讶阉烟盐严颜阎艳厌砚彦谚验鸯杨扬疡阳痒养样瑶摇尧遥窑谣药爷页业叶医铱颐遗仪彝蚁艺亿忆义诣议谊译异绎荫阴银饮樱婴鹰应缨莹萤营荧蝇颖哟拥佣痈踊咏涌优忧邮铀犹游诱舆鱼渔娱与屿语吁御狱誉预驭鸳渊辕园员圆缘远愿约跃钥岳粤悦阅云郧匀陨运蕴酝晕韵杂灾载攒暂赞赃脏凿枣灶责择则泽贼赠扎札轧铡闸诈斋债毡盏斩辗崭栈战绽张涨帐账胀赵蛰辙锗这贞针侦诊镇阵挣睁狰帧郑证织职执纸挚掷帜质钟终种肿众诌轴皱昼骤猪诸诛烛瞩嘱贮铸筑驻专砖转赚桩庄装妆壮状锥赘坠缀谆浊兹资渍踪综总纵邹诅组钻致钟么为只凶准启板里雳余链泄';
}
function FTPYStr() {
    return '皚藹礙愛翺襖奧壩罷擺敗頒辦絆幫綁鎊謗剝飽寶報鮑輩貝鋇狽備憊繃筆畢斃閉邊編貶變辯辮鼈癟瀕濱賓擯餅撥缽鉑駁蔔補參蠶殘慚慘燦蒼艙倉滄廁側冊測層詫攙摻蟬饞讒纏鏟産闡顫場嘗長償腸廠暢鈔車徹塵陳襯撐稱懲誠騁癡遲馳恥齒熾沖蟲寵疇躊籌綢醜櫥廚鋤雛礎儲觸處傳瘡闖創錘純綽辭詞賜聰蔥囪從叢湊竄錯達帶貸擔單鄲撣膽憚誕彈當擋黨蕩檔搗島禱導盜燈鄧敵滌遞締點墊電澱釣調叠諜疊釘頂錠訂東動棟凍鬥犢獨讀賭鍍鍛斷緞兌隊對噸頓鈍奪鵝額訛惡餓兒爾餌貳發罰閥琺礬釩煩範販飯訪紡飛廢費紛墳奮憤糞豐楓鋒風瘋馮縫諷鳳膚輻撫輔賦複負訃婦縛該鈣蓋幹趕稈贛岡剛鋼綱崗臯鎬擱鴿閣鉻個給龔宮鞏貢鈎溝構購夠蠱顧剮關觀館慣貫廣規矽歸龜閨軌詭櫃貴劊輥滾鍋國過駭韓漢閡鶴賀橫轟鴻紅後壺護滬戶嘩華畫劃話懷壞歡環還緩換喚瘓煥渙黃謊揮輝毀賄穢會燴彙諱誨繪葷渾夥獲貨禍擊機積饑譏雞績緝極輯級擠幾薊劑濟計記際繼紀夾莢頰賈鉀價駕殲監堅箋間艱緘繭檢堿鹼揀撿簡儉減薦檻鑒踐賤見鍵艦劍餞漸濺澗漿蔣槳獎講醬膠澆驕嬌攪鉸矯僥腳餃繳絞轎較稭階節莖驚經頸靜鏡徑痙競淨糾廄舊駒舉據鋸懼劇鵑絹傑潔結誡屆緊錦僅謹進晉燼盡勁荊覺決訣絕鈞軍駿開凱顆殼課墾懇摳庫褲誇塊儈寬礦曠況虧巋窺饋潰擴闊蠟臘萊來賴藍欄攔籃闌蘭瀾讕攬覽懶纜爛濫撈勞澇樂鐳壘類淚籬離裏鯉禮麗厲勵礫曆瀝隸倆聯蓮連鐮憐漣簾斂臉鏈戀煉練糧涼兩輛諒療遼鐐獵臨鄰鱗凜賃齡鈴淩靈嶺領餾劉龍聾嚨籠壟攏隴樓婁摟簍蘆盧顱廬爐擄鹵虜魯賂祿錄陸驢呂鋁侶屢縷慮濾綠巒攣孿灤亂掄輪倫侖淪綸論蘿羅邏鑼籮騾駱絡媽瑪碼螞馬罵嗎買麥賣邁脈瞞饅蠻滿謾貓錨鉚貿麽黴沒鎂門悶們錳夢謎彌覓綿緬廟滅憫閩鳴銘謬謀畝鈉納難撓腦惱鬧餒膩攆撚釀鳥聶齧鑷鎳檸獰甯擰濘鈕紐膿濃農瘧諾歐鷗毆嘔漚盤龐國愛賠噴鵬騙飄頻貧蘋憑評潑頗撲鋪樸譜臍齊騎豈啓氣棄訖牽扡釺鉛遷簽謙錢鉗潛淺譴塹槍嗆牆薔強搶鍬橋喬僑翹竅竊欽親輕氫傾頃請慶瓊窮趨區軀驅齲顴權勸卻鵲讓饒擾繞熱韌認紉榮絨軟銳閏潤灑薩鰓賽傘喪騷掃澀殺紗篩曬閃陝贍繕傷賞燒紹賒攝懾設紳審嬸腎滲聲繩勝聖師獅濕詩屍時蝕實識駛勢釋飾視試壽獸樞輸書贖屬術樹豎數帥雙誰稅順說碩爍絲飼聳慫頌訟誦擻蘇訴肅雖綏歲孫損筍縮瑣鎖獺撻擡攤貪癱灘壇譚談歎湯燙濤縧騰謄銻題體屜條貼鐵廳聽烴銅統頭圖塗團頹蛻脫鴕馱駝橢窪襪彎灣頑萬網韋違圍爲濰維葦偉僞緯謂衛溫聞紋穩問甕撾蝸渦窩嗚鎢烏誣無蕪吳塢霧務誤錫犧襲習銑戲細蝦轄峽俠狹廈鍁鮮纖鹹賢銜閑顯險現獻縣餡羨憲線廂鑲鄉詳響項蕭銷曉嘯蠍協挾攜脅諧寫瀉謝鋅釁興洶鏽繡虛噓須許緒續軒懸選癬絢學勳詢尋馴訓訊遜壓鴉鴨啞亞訝閹煙鹽嚴顔閻豔厭硯彥諺驗鴦楊揚瘍陽癢養樣瑤搖堯遙窯謠藥爺頁業葉醫銥頤遺儀彜蟻藝億憶義詣議誼譯異繹蔭陰銀飲櫻嬰鷹應纓瑩螢營熒蠅穎喲擁傭癰踴詠湧優憂郵鈾猶遊誘輿魚漁娛與嶼語籲禦獄譽預馭鴛淵轅園員圓緣遠願約躍鑰嶽粵悅閱雲鄖勻隕運蘊醞暈韻雜災載攢暫贊贓髒鑿棗竈責擇則澤賊贈紮劄軋鍘閘詐齋債氈盞斬輾嶄棧戰綻張漲帳賬脹趙蟄轍鍺這貞針偵診鎮陣掙睜猙幀鄭證織職執紙摯擲幟質鍾終種腫衆謅軸皺晝驟豬諸誅燭矚囑貯鑄築駐專磚轉賺樁莊裝妝壯狀錐贅墜綴諄濁茲資漬蹤綜總縱鄒詛組鑽緻鐘麼為隻兇準啟闆裡靂餘鍊洩';
}
function traditionalized(cc) {
    var str = '',
    ss = JTPYStr(),
    tt = FTPYStr();
    for (var i = 0; i < cc.length; i++) {
        if (cc.charCodeAt(i) > 10000 && ss.indexOf(cc.charAt(i)) != -1) str += tt.charAt(ss.indexOf(cc.charAt(i)));
        else str += cc.charAt(i);
    }
    return str;
}
function simplized(cc) {
    var str = '',
    ss = JTPYStr(),
    tt = FTPYStr();
    for (var i = 0; i < cc.length; i++) {
        if (cc.charCodeAt(i) > 10000 && tt.indexOf(cc.charAt(i)) != -1) str += ss.charAt(tt.indexOf(cc.charAt(i)));
        else str += cc.charAt(i);
    }
    return str;
}

//json2.js
if(typeof JSON!=='object'){JSON={};}
 (function(){'use strict';function f(n){return n<10?'0'+n:n;}
 if(typeof Date.prototype.toJSON!=='function'){Date.prototype.toJSON=function(key){return isFinite(this.valueOf())?this.getUTCFullYear()+'-'+
 f(this.getUTCMonth()+1)+'-'+
 f(this.getUTCDate())+'T'+
 f(this.getUTCHours())+':'+
 f(this.getUTCMinutes())+':'+
 f(this.getUTCSeconds())+'Z':null;};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(key){return this.valueOf();};}
 var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={'\b':'\\b','\t':'\\t','\n':'\\n','\f':'\\f','\r':'\\r','"':'\\"','\\':'\\\\'},rep;function quote(string){escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==='string'?c:'\\u'+('0000'+a.charCodeAt(0).toString(16)).slice(-4);})+'"':'"'+string+'"';}
 function str(key,holder){var i,k,v,length,mind=gap,partial,value=holder[key];if(value&&typeof value==='object'&&typeof value.toJSON==='function'){value=value.toJSON(key);}
 if(typeof rep==='function'){value=rep.call(holder,key,value);}
 switch(typeof value){case'string':return quote(value);case'number':return isFinite(value)?String(value):'null';case'boolean':case'null':return String(value);case'object':if(!value){return'null';}
 gap+=indent;partial=[];if(Object.prototype.toString.apply(value)==='[object Array]'){length=value.length;for(i=0;i<length;i+=1){partial[i]=str(i,value)||'null';}
 v=partial.length===0?'[]':gap?'[\n'+gap+partial.join(',\n'+gap)+'\n'+mind+']':'['+partial.join(',')+']';gap=mind;return v;}
 if(rep&&typeof rep==='object'){length=rep.length;for(i=0;i<length;i+=1){if(typeof rep[i]==='string'){k=rep[i];v=str(k,value);if(v){partial.push(quote(k)+(gap?': ':':')+v);}}}}else{for(k in value){if(Object.prototype.hasOwnProperty.call(value,k)){v=str(k,value);if(v){partial.push(quote(k)+(gap?': ':':')+v);}}}}
 v=partial.length===0?'{}':gap?'{\n'+gap+partial.join(',\n'+gap)+'\n'+mind+'}':'{'+partial.join(',')+'}';gap=mind;return v;}}
 if(typeof JSON.stringify!=='function'){JSON.stringify=function(value,replacer,space){var i;gap='';indent='';if(typeof space==='number'){for(i=0;i<space;i+=1){indent+=' ';}}else if(typeof space==='string'){indent=space;}
 rep=replacer;if(replacer&&typeof replacer!=='function'&&(typeof replacer!=='object'||typeof replacer.length!=='number')){throw new Error('JSON.stringify');}
 return str('',{'':value});};}
 if(typeof JSON.parse!=='function'){JSON.parse=function(text,reviver){var j;function walk(holder,key){var k,v,value=holder[key];if(value&&typeof value==='object'){for(k in value){if(Object.prototype.hasOwnProperty.call(value,k)){v=walk(value,k);if(v!==undefined){value[k]=v;}else{delete value[k];}}}}
 return reviver.call(holder,key,value);}
 text=String(text);cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(a){return'\\u'+
 ('0000'+a.charCodeAt(0).toString(16)).slice(-4);});}
 if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,'@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,']').replace(/(?:^|:|,)(?:\s*\[)+/g,''))){j=eval('('+text+')');return typeof reviver==='function'?walk({'':j},''):j;}
 throw new SyntaxError('JSON.parse');};}}());
