var express = require('express');
var eventproxy = require('eventproxy');
var superagent = require('superagent');
var cheerio = require('cheerio');
var app = express();
var mysql = require('mysql');
var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'yang',
    database: 'node_crawler'
});
var shyUrl = 'http://www.douban.com/group/haixiuzu/discussion?start=0';

var async = require('async');
var excutetimes = 0;

var itemInfo = []; // href、authorUrl的信息
var hrefs = [];
var authorUrls = [];
var contentInfo = []; //存储title、imgs
var authorInfo = []; //存储author、location
var concurrencyCount = 0;
var concurrencyCount2 = 0;
var resultContent = [];
var resultAuthor = [];
var resultAll = [];
var getShyUrl = function(shyUrl, res, callback){
    superagent
    .get(shyUrl)
    .set({'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2202.3 Safari/537.36'})
    .end(function (err, sres) {
        if(err){
            return console.error(err);
        }
        console.log(excutetimes++ + 'excutetimes');
        // res.send(sres.text);
        var authorUrlsList = [];
        var $ = cheerio.load(sres.text);
        var jishu = 0; 
        $('.olt tr .title').each(function (idx, element){
            jishu++;
            itemInfo.push({
                href: $(element).children('a').attr('href'),
                authorUrl: $(element).siblings('td[nowrap=nowrap]').children('a').attr('href')
            })
            
        });
        var c1 = 0;
        hrefs = itemInfo.map(function (item){
            c1++;
            // console.log(c1);
            // console.log(item.href);
            return item.href;
        });
        var c2 = 0;
        authorUrls = itemInfo.map(function (item){
            c2++;
            console.log(c2);
            console.log(item.authorUrl);
            return item.authorUrl;
        });

        
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
                // console.log(authorInfo);
                // console.log(authorInfo.length + 'authorInfo');
            });
            var delay = parseInt(2000);
            concurrencyCount2++;
            console.log('现在的并发数是', concurrencyCount2, '，正在抓取的是', url, '，耗时' + delay + '毫秒');

            setTimeout(function () {
                concurrencyCount2--;
                callback(null, data);
            }, delay); 
        }

        //抓取作者信息
        async.mapLimit(authorUrls, 1, function (url, callback){
            getLocation(url, callback);
        }, function (err, result) {
            if(err){
                console.error(err);
            }
            // console.log('final');
            // console.log(result[0]);
            resultAuthor = resultAuthor.concat(result);
            // res.send(result);
            
        });

        var getPicture = function(url, callback){

            var imgs = [];
            var data = {};
            superagent.get(url) //判断第一个是否抓完，否者排序有误
            .end(function (err, sres){
                if(err){
                    console.error(err);
                }
                var $ = cheerio.load(sres.text);
                $(".topic-figure img").each(function (idx, element){
                    src = $(element).attr("src")
                    imgs.push(src);
                    console.log(imgs);
                });
                data['title'] = $('h1').text().trim();
                data['imgs'] = imgs;
               
            });

            var delay = parseInt(2000);
            concurrencyCount++;
            console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', url, '，耗时' + delay + '毫秒');

            setTimeout(function () {
                concurrencyCount--;
                callback(null, data);
            }, delay);

        }

        //抓取title.imgs
        async.mapLimit(hrefs, 1, function (url, callback) {
            getPicture(url, callback);
            }, function (err, result) {
                if(err){
                    return console.error(err);
                }
                // console.log('final:');
                // console.log(result[0]);
                // console.log(result.length + 'result');
                resultContent = resultContent.concat(result);
                // res.send(result);
            });
        
        
    });
}

app.get('/', function (req, res, next) {
        getShyUrl(shyUrl, res);
        setTimeout(function (){
            var maxNum = hrefs.length;
            for(var i = 0; i < hrefs.length; i++)
            {
                resultAll.push({
                    title: resultContent[i]['title'],
                    img: resultContent[i]['imgs'],
                    href: hrefs[i],
                    author_href: authorUrls[i],
                    author_name: resultAuthor[i]['author_name'],
                    author_location: resultAuthor[i]['location']
                });
            }
            res.send(resultAll);
            var notExist = false;
            resultAll.forEach(function (item){
                conn.query('select * from tbl_post', function (err, results){
                    if(err){
                        console.error(err);
                    }
                    notExist = true;
                    results.forEach(function (sqlItem){
                        sqlItem['info'] = JSON.parse(sqlItem['info']);
                        
                        if(sqlItem['info']['title'] == item['title'])
                        {
                            console.log(sqlItem);     
                            notExist = false;
                        }
                       

                    });
                    if(notExist)
                    {
                        console.log(item);
                        item = JSON.stringify(item);
                        conn.query('insert into tbl_post SET info = ?', item, function (err, results){
                            if(err){
                                console.error(err);
                            }
                            else
                            {
                                console.log('success');
                            }
                        });
                    }

                }); //查看数据库中是否有这个字段;
            });
            
        },60000);
});

app.listen(3000, function(){
    console.log('app is listening at port 3000');
})