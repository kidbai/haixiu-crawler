var async = require('async');
var superagent = require('superagent');
var cheerio = require('cheerio');

var mysql = require('mysql');

var db_config = ({
    // acquireTimeout: 30000,
    // waitForConnections: true,
    // connectionLimit: 10,
    host: 'us-cdbr-iron-east-01.cleardb.net',
    user: 'b875511a83fee8',
    password: '4428b7df',
    database: 'heroku_28ce897a21c469d'
});

// var pool = mysql.createPool(db_config);
var conn;
function handleError()
{
    conn = mysql.createConnection(db_config);
    conn.connect(function (err){
        if(err){
            console.error(err);
            setTimeout(handleError, 2000);
        }
    });
   conn.on('error', function (err) {
        console.log('db error', err);
        // 如果是连接断开，自动重新连接
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log(err.code);
            handleError();
        } else {
            throw err;
        }
   });
}

var express = require('express');
var app = express();
var concurrencyCount = 0;
var concurrencyCount2 = 0;
var resultContent = [];
var header = {'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Encoding' : 'gzip, deflate, sdch',
              'cookie' : 'viewed="5362856"; ct=y; ll="118172"; dbcl2="106283334:9dn78i9kCic"; ck="hQX6"; bid="qWK40sVDQR0"; __utma=30149280.639687436.1413723293.1416490957.1416496152.48; __utmc=30149280; __utmz=30149280.1416388002.43.10.utmcsr=localhost:3000|utmccn=(referral)|utmcmd=referral|utmcct=/; __utmv=30149280.10628; push_noty_num=0; push_doumail_num=1; _pk_ref.100001.8cb4=%5B%22%22%2C%22%22%2C1416501062%2C%22http%3A%2F%2Flocalhost%3A3000%2F%22%5D; _pk_id.100001.8cb4=b0abd870edd5af87.1413723289.45.1416501062.1416498619.; _pk_ses.100001.8cb4=*',
              'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.6 Safari/537.36',
              'Connection' : 'keep-alive',
              'Accept-Language' : 'en-US,en;q=0.8,zh-CN;q=0.6,zh-TW;q=0.4'}

// app.get('/', function (req, res){
        async.auto({
        getUrl: function (getUrlCallback){
            superagent
            .get('http://www.douban.com/group/haixiuzu/discussion?start=0')
            .set(header)
            .end(function (err, res){
                if(err){
                    console.error(err);
                }
                var $ = cheerio.load(res.text);
                var itemInfo = [];
                $('.olt tr .title').each(function (idx, element){
                    itemInfo.push({
                        href: $(element).children('a').attr('href'),
                        authorUrl: $(element).siblings('td[nowrap=nowrap]').children('a').attr('href')
                    })
                });
                getUrlCallback(null, itemInfo);

            });
        },
        // -------------- 获取title 和 imgs 信息
        getTitleImgData: ['getUrl', function (getTitleImgDataCallback, results){
            // console.log('getTitleImgData');
            // getTitleImgDataCallback(null, 'getTitleImgData');
            var titleImgUrl = [];
            titleImgUrl = results.getUrl;
            titleImgUrl = titleImgUrl.map(function (item){
                return item['href'];
            }); 
            // console.log(titleImgUrl);
            var getPicture = function(url, callback){
                console.log('handle:' + url);

                var imgs = [];
                var data = {};
                superagent.get(url) 
                .set(header)
                .end(function (err, sres){
                    if(err){
                        console.error(err);
                    }
                    var $ = cheerio.load(sres.text);
                    $(".topic-figure img").each(function (idx, element){
                        src = $(element).attr("src")
                        imgs.push(src);
                        // console.log(imgs);
                    });
                    data['title'] = $('h1').text().trim();
                    data['imgs'] = imgs;
                   
                });

                var delay = parseInt(2000);
                concurrencyCount++;
                console.log('getpicture现在的并发数是', concurrencyCount, '，正在抓取的是', url, '，耗时' + delay + '毫秒');

                setTimeout(function () {
                    concurrencyCount--;
                    callback(null, data);
                }, delay);

            }

            //抓取title.imgs
            async.mapLimit(titleImgUrl, 1, function (url, callback) {
                console.log('enter url:' + url);
                getPicture(url, callback);
                }, function (err, result) {
                    if(err){
                        return console.error(err);
                    }
                    // console.log('final:');
                    // console.log(result[0]);
                    // console.log(result.length + 'result');
                    // resultContent = resultContent.concat(result);
                    getTitleImgDataCallback(null, result);
                });
        }],
        //--------------- 作者地址 ----------------
        getAuthorLocation: ['getUrl', function (getAuthorLocationCallback, results){
            var authorLocationUrl = [];
            authorLocationUrl = results.getUrl;
            authorLocationUrl = authorLocationUrl.map(function (item){
                return item.authorUrl;
            });
            var getLocation = function(url, callback){
                var data = {};
                superagent.get(url)
                .set(header)
                .end(function (err, sres){
                    if(err){
                        console.error(err);
                    }
                    var $ = cheerio.load(sres.text);
                    
                    data['author_name'] = $('.name').text().trim();
                    data['location'] = $('.loc').text().replace(/\n|\s|常居:/ig, '');
                });
                var delay = parseInt(2000);
                concurrencyCount2++;
                console.log('getauthor现在的并发数是', concurrencyCount2, '，正在抓取的是', url, '，耗时' + delay + '毫秒');

                setTimeout(function () {
                    concurrencyCount2--;
                    callback(null, data);
                }, delay); 
            }

            //抓取作者信息
            async.mapLimit(authorLocationUrl, 1, function (url, callback){
                getLocation(url, callback);
            }, function (err, result) {
                if(err){
                    console.error(err);
                }
                getAuthorLocationCallback(null, result);
                
            });
        }],
        save: ['getTitleImgData', 'getAuthorLocation', 'getUrl', function (callback, results){
            var allInfo = [];
            var length = results.getTitleImgData.length;
            console.log('length:' + length);
            for(var i = 0;i < length;i++)
            {
                allInfo.push({
                    title: results.getTitleImgData[i]['title'],
                    img: results.getTitleImgData[i]['imgs'],
                    url: results.getUrl[i]['href'],
                    author_name: results.getAuthorLocation[i]['author_name'],
                    location: results.getAuthorLocation[i]['location'],
                    author_url: results.getUrl[i]['authorUrl']
                });
            }
            // 把图片数据处理，转化成json保存
            allInfo.forEach(function (item){
                var img = {};
                img['imgs'] = item.img;
                img = JSON.stringify(img);
                item.img = img;
            });
            // ------------ Save --------------
            handleError();
            var countInserDate = 0;
            var notExist = false;
            allInfo.forEach(function (item){
                conn.query('select * from tbl_post', function (err, results){
                    
                    if(err){
                        console.error(err);
                    }
                    notExist = true;
                    results.forEach(function (sqlItem){
                        if(item['title'] == sqlItem['title'])
                        {
                            // console.log(sqlItem);
                            notExist = false;
                        }
                    });
                    if(notExist)
                    {
                        if(item.title != '403 Forbidden')
                        {
                            conn.query('insert into tbl_post SET ?', item, function (err, results){
                                if(err){
                                    console.error(err);
                                }
                                else
                                {
                                    countInserDate++;
                                    console.log('success,' + countInserDate + 'insert...');
                                }
                            });
                        }
                        
                    }
                });
            });
            callback(null, allInfo);
        }]
    }, function (err, results){
        if(err){
            console.error(err);
        }
        console.log(results);
    });
// });

// var port = process.env.PORT || 3000;
// app.listen(port, function(){
//     console.log('listen port:' + port);
// });
