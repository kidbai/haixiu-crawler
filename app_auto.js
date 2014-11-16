var async = require('async');
var superagent = require('superagent');
var cheerio = require('cheerio');

var mysql = require('mysql');
var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'yang',
    database: 'node_crawler'
});

var express = require('express');
var app = express();
var concurrencyCount = 0;
var concurrencyCount2 = 0;
var resultContent = [];




app.get('/', function (req, res){

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
            async.mapLimit(authorLocationUrl, 1, function (url, callback){
                getLocation(url, callback);
            }, function (err, result) {
                if(err){
                    console.error(err);
                }
                // console.log('final');
                // console.log(result[0]);
                // resultAuthor = resultAuthor.concat(result);
                // res.send(result);
                getAuthorLocationCallback(null, result);
                
            });
        }],
        save: ['getTitleImgData', 'getAuthorLocation', 'getUrl', function (callback, results){
            console.log(results.getTitleImgData);
            console.log(results.getAuthorLocation);
            console.log(results.getUrl);
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
            var notExist = false;
            allInfo.forEach(function (item){

                conn.query('select * from tbl_post_new', function (err, results){
                    
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
                        conn.query('insert into tbl_post_new SET ?', item, function (err, results){
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

            res.send(allInfo);
            callback(null, allInfo);
        }]
    }, function (err, results){
        if(err){
            console.error(err);
        }
        console.log(results);
    });
});

app.listen(3000, function(){
    console.log('listen 3000');
});
