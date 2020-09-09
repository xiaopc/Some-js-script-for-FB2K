/**
 * Created by cimoc on 2016/12/23
 * Modified by xiaopc on 2020/08/27
 * Netease Cloud Music Lyric Source For ESLyric
 * version : 0.1.3
 * 感谢 ChowDPa02K,Jeannela\Elia, 不知名的的api提供者
 * 页面 : https://github.com/cimoc-sokka/Some-js-script-for-FB2K
 * 下载 : https://github.com/cimoc-sokka/Some-js-script-for-FB2K/releases
 * cimoc的邮箱 : cimoc@sokka.cn
 */

/**
 * 用户设置部分
 */

// - 歌词显示

// 歌词输出顺序,删除即不获取
//   same_line: 并排合并歌词
//   new_line: 翻译在下一行，仿网易云
//   tran: 翻译
//   origin: 原文
//   same_line_k: 并排合并歌词，在卡拉OK模式下仅高亮原语言歌词（其他模式会出现显示问题）
//           不推荐使用,仅能即时获取歌词即时使用,不能保存
var lrc_order = [
    "new_line",
    "same_line",
    "same_line_k",
    "origin",
    "tran",
];

// new_line 翻译滚动时长 以及 same_line_k 翻译时间轴滞后时长
// （秒），设为 0 则取消，如果翻译歌词跳得快，酌情设为 0.4-1.0
var savefix = 0.01;

// new_line 最后一句时长（秒）
var new_line_last = 10;

// 翻译外括号，可以为空
//  括号示例：〔 〕〈 〉《 》「 」『 』〖 〗【 】( ) [ ] { }
//  如果都为空的话，same_line 下原文与翻译没有间隔
var bracket = [
    ' ', // 左括号
    ''   // 右括号
];

// 要从翻译中删除的括号
var bracket_rm = /(〔|〕|〈|〉|《|》|「|」|『|』|〖|〗|【|】|{|}|\/)/g;

// 去除空行
//   在 new_line 时，若空行时间不准确，空行会导致歌词提前消失
var rm_empty = false;

// - 搜索

// 搜索请求返回的最多结果数,如果经常搜不到试着改小或改大
var limit = 5;

// 去除标题附加内容
var rm_suffix = [
    "feat.",
    "Featuring",
    "（Cover",
    "（cover",
    "（翻自",
]

// 开启简繁转换
//   由于 ESLyric 会将繁体歌曲信息转为简体去搜索，这会导致匹配不上等问题
//   「本程式使用了繁化姬的 API 服務」，「繁化姬商用必須付費」。https://zhconvert.org/
//   由于连接速度等问题，开启后可能会降低歌词搜索速度，酌情开启
var trad_to_simp = false;

// 与网易云标题对比时，去除半角括号/全角括号中的内容
//   分别为半角和全角的开关，若不需要可改为 false
//   ESLyric 在搜索时好像会去除本地曲名中半角括号的部分，这会导致匹配度计算出现问题
//   去除全角括号仅对网易云添加了（）内容的曲名有帮助，酌情开启
var title_bracket = [true, true];

// 最小准确匹配度，分别为标题和艺术家字段
var min_exact_matching = [85, 70];

// 最小模糊匹配度
// 模糊匹配：不考虑艺术家字段
var min_fuzzy_matching = 80;

// 匹配曲目时长误差率
// 如本地曲目时长 3 分钟，误差率为 10%，则仅匹配时长在 3 分 ± 18s 的在线曲目
// 小于 0 则不使用这条规则
var length_error_rate = 15;

// 输出调试信息
var debug = true;

/**
 * 插件定义部分
 */

var xmlHttp = new ActiveXObject("WinHttp.WinHttpRequest.5.1");

var headers = {
    "Origin": "https://music.163.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) (KHTML, like Gecko) Chrome/55.0.2919.83 Safari/537.36",
    "Referer": "https://music.163.com/search/"
}
// "Content-Type": "application/x-www-form-urlencoded",

function get_my_name() {
    return "网易云音乐";
}

function get_version() {
    return "0.1.3";
}

function get_author() {
    return "cimoc & wwh1004";
}

/**
 * 面向 ESLyric 的搜索实现
 * @param Object info 歌曲信息，Title& Artist
 * @param {*} callback 回调函数
 */

function start_search(info, callback) {
    debug && console(
        "info.Title: " + info.Title + "\n" +
        "info.Artist: " + info.Artist + "\n" +
        "info.Length:" + info.Length);
    // 删除冗余内容
    var title = del(info.Title, rm_suffix);
    var artist = del(info.Artist, rm_suffix);
    debug && console("search_title: " + title + "\n" + "search_artist: " + artist);
    // 搜索语句
    var s = title + " " + (artist ? artist : "");
    // searchURL = "http://music.163.com/api/search/get/web?csrf_token=";//如果下面的没用,试试改成这句
    var searchURL = "https://music.163.com/api/search/get/";
    var post_data = 'hlpretag=<span class="s-fc7">&hlposttag=</span>&s=' + encodeURIComponent(s) + '&type=1&offset=0&total=true&limit=' + limit;
    ncm_back = request("POST", searchURL, headers, post_data);
    // 先转简体
    if (trad_to_simp) ncm_back = zhconvert(ncm_back, "Simplified");
    // parse 返回 json
    var ncm_back = json(ncm_back);
    var result = ncm_back.result;
    if (ncm_back.code != 200 || !result || !result.songs.length) {
        debug && console("get info failed");
        return;
    }
    // 筛选曲名及艺术家
    var songs = result.songs;
    var times = 0; // 第一遍精确搜索，第二遍模糊搜索
    var songid = -1;
    var fetchlyric = [null, null];
    var p0, p1;
    var found_action = function () {
        // 处理歌曲基础信息
        var res_name = info.Title; // 必须要完整包括搜索的曲名才能添加？
        if (info.Title != songs[songid].name) res_name += songs[songid].name.replace(title, "");
        var res_album = songs[songid].album.name;
        var res_artist;
        if (times > 0) res_artist = info.Artist + '(原) - ' + songs[songid].artist_combine; // 必须要完整包括搜索的艺术家才能添加？
        else if (times == 0 && p1 > 99) res_artist = info.Artist; // 顺序相反可能导致无法添加
        else res_artist = songs[songid].artist_combine;
        debug && console("selected #" + songs[songid].id + ": " + res_name + "-" + res_artist);
        insert_lyric(callback, fetchlyric, [res_name, res_artist, res_album]);
    };
    // 获取匹配歌曲，先精确后模糊
    while (times < 2 && songid < 0) {
        for (var k in songs) {
            var ncm_name = songs[k].name;
            // 去除曲名中的后缀
            cmp_name = del(ncm_name, rm_suffix);
            cmp_name = cmp_name.replace(/\xa0/g, ' ');
            // 如果搜索关键词不含括号，而搜索结果含，则去除括号部分
            if (title_bracket[0] && title.indexOf('(') < 0 && cmp_name.indexOf('(') >= 0)
                cmp_name = cmp_name.replace(/\(.*\)/g, '');
            if (title_bracket[1] && title.indexOf('（') < 0 && cmp_name.indexOf('（') >= 0)
                cmp_name = cmp_name.replace(/（.*）/g, '');
            // 匹配曲名
            p0 = compare(title, cmp_name);
            debug && console("ncm_title: " + ncm_name + " match: " + p0);
            // 匹配时长
            var length_diff = Math.abs(songs[k].duration / 1000 - info.Length) / info.Length;
            debug && console("duration: " + songs[k].duration / 1000 + "s, delta: " + length_diff);
            if (length_error_rate > 0 && length_diff > length_error_rate / 100)
                continue;
            // 模糊匹配
            if (times > 0) {
                if (p0 >= min_fuzzy_matching && (fetchlyric = get_lyric_from_id(songs[k].id))[0] != null) { // 同时获取歌曲对应歌词
                    songid = k;
                    found_action();
                }
                continue;
            }
            // 精确匹配之匹配艺术家
            var artist_combine = [];
            // 合并艺术家信息
            for (var key in songs[k].artists) {
                artist_combine.push(songs[k].artists[key].name);
            }
            songs[k].artist_combine = artist_combine.join("/");
            // 匹配艺术家
            p1 = compare(artist, songs[k].artist_combine);
            debug && console("ncm_artist: " + songs[k].artist_combine + " match: " + p1);
            if (p0 >= min_exact_matching[0] && p1 >= min_exact_matching[1] && (fetchlyric = get_lyric_from_id(songs[k].id))[0] != null) {
                songid = k;
                found_action();
            }
        }
        times++;
        debug && console(times + "# search finished");
    }
}

/**
 * 插入歌词
 * @param {*} callback 
 * @param Array fetchlyric [string | null, string | null]
 * @param Array info [res_name, res_artist, res_album]
 */

function insert_lyric(callback, fetchlyric, info) {
    var newLyric = callback.CreateLyric();
    // 顺序默认值
    lrc_order = lrc_order || ["same_line_k", "new_line", "origin", "tran"];
    for (var key in lrc_order) {
        newLyric.Title = info[0];
        newLyric.Artist = info[1];
        newLyric.Album = info[2];
        switch (lrc_order[key]) {
            case "origin":
                if (fetchlyric[0]) {
                    newLyric.LyricText = fetchlyric[0];
                    newLyric.Source = "(原词)" + get_my_name();
                }
                break;
            case "tran":
                if (fetchlyric[1]) {
                    newLyric.LyricText = fetchlyric[1];
                    newLyric.Source = "(翻译)" + get_my_name();
                }
                break;
            case "same_line_k":
                if (fetchlyric[0] && fetchlyric[1]) {
                    newLyric.LyricText = lrc_merge_same_line_k(fetchlyric[0], fetchlyric[1]);
                    newLyric.Source = "(并排β)" + get_my_name();
                }
                break;
            case "new_line":
                if (fetchlyric[0] && fetchlyric[1]) {
                    newLyric.LyricText = lrc_merge_new_line(fetchlyric[0], fetchlyric[1]);
                    newLyric.Source = "(并列)" + get_my_name();
                }
                break;
            case "same_line":
                if (fetchlyric[0] && fetchlyric[1]) {
                    newLyric.LyricText = lrc_merge_same_line(fetchlyric[0], fetchlyric[1]);
                    newLyric.Source = "(并排)" + get_my_name();
                }
                break;
        }
        callback.AddLyric(newLyric);
    }
    newLyric.Dispose();
}

/**
 * 获取歌曲对应歌词
 * @param Number id 
 */
function get_lyric_from_id(id) {
    var lyricURL = "https://music.163.com/api/song/lyric?os=pc&id=" + id + "&lv=-1&kv=-1&tv=-1";
    var ncm_lrc = json(request("GET", lyricURL, { "Cookie": "appver=1.5.0.75771" }));
    // （原语言）歌词
    var lyric = null;
    if (ncm_lrc.lrc && ncm_lrc.lrc.lyric)
        lyric = ncm_lrc.lrc.lyric;
    else
        debug && console("no (original) lyric");
    // 翻译歌词
    var translrc = null;
    if (ncm_lrc.tlyric && ncm_lrc.tlyric.lyric) {
        translrc = ncm_lrc.tlyric.lyric;
        translrc = translrc.replace(bracket_rm, "");
    } else debug && console("no translation");
    return [lyric, translrc];
}

/**
 * 歌词处理
 */

/**
 * 分析时间轴并重排，返回 [ {time: string, time_ms: [毫秒, ...], text: ...}, ]
 * @param String lrc 
 */

function lrc_timeline(lrc) {
    // TODO: by 这些标记信息（好像网易云现在都没这部分？
    lines = lrc.split("\n");
    objs = []
    for (var i in lines) {
        // 分别为： 全部内容，所有时间戳，正文
        var parts = /((?:\[(?:\d|\.|\:)*\])+)(.*)/g.exec(lines[i]);
        if (parts == null || parts.length < 3) continue;
        var times = timestamp_parser(parts[1]);
        // 处理非时间戳情况
        if (times.length == 0) {
            // TODO
            continue;
        }
        for (var j in times) {
            objs.push({ time: times[j][0], time_ms: timestamp_to_ms(times[j]), text: parts[2] });
        }
    }
    var cmp = function (a, b) {
        return a.time_ms - b.time_ms;
    }
    return objs.sort(cmp);
}

/**
 * 将（可含多个）时间戳 string 转为 [[原串, mm, ss, (毫秒)], ...]
 * @param String str 
 */

function timestamp_parser(str) {
    var regex = /\[(\d{2}):(\d{2})(\.\d{2,3})?\]/g;
    var lis = [], find = null;
    while ((find = regex.exec(str)) != null) lis.push(find);
    return lis;
}

/**
 * 将 [原串, mm, ss, (毫秒)] 转为毫秒数
 * @param Array arr
 */

function timestamp_to_ms(arr) {
    return Number(arr[1]) * 60000 + Number(arr[2]) * 1000 + (arr.length > 3 ? Number(arr[3].substr(1)) * Math.pow(10, (4 - arr[3].length)) : 0);
}

function num_pad(num, length) {
    length = length || 2;
    return (Array(length).join("0") + Math.floor(num)).slice(-length);
}

function timestamp_to_str(t) {
    return '[' + num_pad(t / 60000) + ':' + num_pad(t % 60000 / 1000) + '.' + num_pad(t % 1000 / 10) + ']';
}

/**
 * same_line 同行合并
 * @param String olrc 
 * @param String tlrc 
 */

function lrc_merge_same_line(olrc, tlrc) {
    var olrc = lrc_timeline(olrc), tlrc = lrc_timeline(tlrc), lrc = [];
    var i = 0, j = 0;
    while (i < olrc.length && j < tlrc.length) {
        var cmp = olrc[i].time_ms - tlrc[j].time_ms;
        if (cmp == 0) {
            if (!rm_empty || olrc[i].text != '')
                lrc.push(olrc[i].time + olrc[i].text + bracket[0] + tlrc[j].text + bracket[1]);
            i++; j++;
        } else if (cmp < 0) {
            if (!rm_empty || olrc[i].text != '')
                lrc.push(olrc[i].time + olrc[i].text);
            i++;
        } else {
            j++;
            debug && console('unsynced translation:' + tlrc[j].time + tlrc[j].text);
        }
    }
    return lrc.join("\n");
}

/**
 * new_line 将翻译添加到下一句原文前 savefix 时长处
 * @param String olrc 
 * @param String tlrc 
 */

function lrc_merge_new_line(olrc, tlrc) {
    var olrc = lrc_timeline(olrc), tlrc = lrc_timeline(tlrc), lrc = [];
    var i = 0, j = 0;
    while (i < olrc.length && j < tlrc.length) {
        var t_time = timestamp_to_str((i + 1 < olrc.length) ? olrc[i + 1].time_ms - savefix * 1000 : olrc[i].time_ms + new_line_last * 1000);
        var cmp = olrc[i].time_ms - tlrc[j].time_ms;
        if (cmp <= 0) {
            if (!rm_empty || olrc[i].text != '') {
                lrc.push(timestamp_to_str(olrc[i].time_ms) + olrc[i].text);
                lrc.push(t_time + ((cmp == 0) ? bracket[0] + tlrc[j].text + bracket[1] : ''));
            }
            i++; (cmp == 0) && j++;
        } else {
            j++;
            debug && console('unsynced translation:' + tlrc[j].time + tlrc[j].text);
        }
    }
    return lrc.join("\n");
}

/**
 * same_line_k 将翻译带时间轴添加到原文后面（同一行）
 * @param String olrc 
 * @param String tlrc 
 */

function lrc_merge_same_line_k(olrc, tlrc) {
    var olrc = lrc_timeline(olrc), tlrc = lrc_timeline(tlrc), lrc = [];
    var i = 0, j = 0;
    while (i < olrc.length && j < tlrc.length) {
        var t_time = timestamp_to_str((i + 1 < olrc.length) ? olrc[i + 1].time_ms - savefix * 1000 : olrc[i].time_ms + new_line_last * 1000);
        var cmp = olrc[i].time_ms - tlrc[j].time_ms;
        if (cmp == 0) {
            if (!rm_empty || olrc[i].text != '')
                lrc.push(timestamp_to_str(olrc[i].time_ms) + olrc[i].text + '　' + t_time + bracket[0] + tlrc[j].text + bracket[1]);
            i++; j++;
        } else if (cmp < 0) {
            if (!rm_empty || olrc[i].text != '')
                lrc.push(timestamp_to_str(olrc[i].time_ms) + olrc[i].text);
            i++;
        } else {
            j++;
            debug && console('unsynced translation:' + tlrc[j].time + tlrc[j].text);
        }
    }
    return lrc.join("\n");
}

/**
 * 辅助函数, 库或 polyfills
 */

/**
 * 输出控制台
 * @param String s 内容
 */

function console(s) {
    fb.trace("* lyric-js: " + s);
}

/**
 * 去除分隔符之后内容
 * @param String str 
 * @param String del_arr 
 */

function del(str, del_arr) {
    for (var i = 0; i < del_arr.length; i++) {
        str = str.split(del_arr[i])[0];
    }
    return str
}

/**
 * 字符串匹配度,0-1
 * @param String x 
 * @param String y 
 */

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

/**
 * JSON 解析包装
 * @param {*} text 
 */

function json(text) {
    try {
        var data = JSON.parse(text);
        return data;
    } catch (e) {
        return false;
    }
}

function request(method, url, headers, data) {
    try {
        xmlHttp.Open(method, url, false);
        add_headers(headers, xmlHttp);
        if (method == "POST") {
            add_headers({ "Content-Type": "application/x-www-form-urlencoded" }, xmlHttp);
            xmlHttp.Send(data);
        } else {
            xmlHttp.Send();
        }
        if (xmlHttp.Status != 200) throw 'HTTP.Status=' + xmlHttp.Status;
    } catch (e) {
        debug && console("request " + url + " failed: " + e);
        return;
    }
    return xmlHttp.responseText;
}

/**
 * 给 xmlhttp 加 header
 * @param {*} header 
 * @param Object client 
 */

function add_headers(header, client) {
    for (var i in header) {
        client.SetRequestHeader(i, header[i]);
    }
}

/**
 * 由「繁化姬」提供的转换服务，API 文档：https://docs.zhconvert.org/api/convert/
 * @param String text 
 * @param String converter: ‘Simplified’ 简体化，‘Traditional’ 繁体化
 */

function zhconvert(text, converter) {
    var post_data = 'converter=' + converter + '&text=' + encodeURIComponent(text);
    var response = json(request("POST", "https://api.zhconvert.org/convert", {}, post_data));
    if (response.code != 0) {
        debug && console("zhconvert api: " + response.msg);
        return;
    }
    return response.data.text;
}
