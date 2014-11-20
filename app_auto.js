var async = require('async');
var superagent = require('superagent');
var cheerio = require('cheerio');

var mysql = require('mysql');

var db_config = ({
    host: 'us-cdbr-iron-east-01.cleardb.net',
    user: 'b875511a83fee8',
    password: '4428b7df',
    database: 'heroku_28ce897a21c469d'
});
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

app.set('port', (process.env.PORT || 3000));

app.get('/', function (req, res){
    setInterval(function (){
            async.auto({
            getUrl: function (getUrlCallback){
                superagent
                .get('http://www.douban.com/group/haixiuzu/discussion?start=0')
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
                async.mapLimit(titleImgUrl, 2, function (url, callback) {
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
                // console.log(authorLocationUrl);
                var getLocation = function(url, callback){
                    var data = {};
                    superagent.get(url)
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
                async.mapLimit(authorLocationUrl, 2, function (url, callback){
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
                            console.log('notExist');
                            console.log(item);
                            conn.query('insert into tbl_post SET ?', item, function (err, results){
                                if(err){
                                    console.error(err);
                                }
                                else
                                {
                                    console.log('success');
                                }
                            });
                        }
                    });

                });
                callback(null, allInfo);
            }]
        }, function (err, results){
            if(err){
                console.error(err);
            }
            res.send(results);
        });
    }, 300000); 
});

var port = process.env.PORT || 3000;
app.listen(port, function(){
    console.log('listen port:' + port);
});
