var express = require('express');
var eventproxy = require('eventproxy');
var superagent = require('superagent');
var cheerio = require('cheerio');
var app = express();

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
        hrefs = itemInfo.map(function (item){
            return item.href;
        });
        authorUrls = itemInfo.map(function (item){
            return item.authorUrl;
        });
        console.log(hrefs);

        
        var getLocation = function(url, callback){
            superagent.get(url)
            .end(function (err, sres){
                if(err){
                    console.error(err);
                }
                var $ = cheerio.load(sres.text);
                authorInfo.push({
                    author: $('.name').text().trim(),
                    location: $('.loc').text().trim()
                });
                console.log(authorInfo);
                console.log(authorInfo.length + 'authorInfo');
            });
            var delay = parseInt(2000);
            concurrencyCount2++;
            console.log('现在的并发数是', concurrencyCount2, '，正在抓取的是', url, '，耗时' + delay + '毫秒');

            setTimeout(function () {
                concurrencyCount2--;
                callback(null, authorInfo);
            }, delay); 
        }

        //抓取作者信息
        async.mapLimit(authorUrls, 2, function (url, callback){
            getLocation(url, callback);
        }, function (err, result) {
            if(err){
                console.error(err);
            }
            console.log('final');
            console.log(result[0]);
            // resultContent.concat(result[0]);
            
        });

        var getPicture = function(url, callback){

            var imgs = [];
            superagent.get(url)
            .end(function (err, sres){
                if(err){
                    console.error(err);
                }
                var $ = cheerio.load(sres.text);
                $(".topic-figure img").each(function (idx, element){
                    imgs.push('http://img3.douban.com/view/group_topic/large/public/' + $(element).attr("src"));
                    console.log($(element).attr("src"));
                });
                contentInfo.push({
                    title: $("h1").text().trim(),
                    imgs: imgs
                    })
                console.log(contentInfo);
                console.log(contentInfo.length + 'contentInfo');
            });

            var delay = parseInt(2000);
            concurrencyCount++;
            console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', url, '，耗时' + delay + '毫秒');

            setTimeout(function () {
                concurrencyCount--;
                callback(null, contentInfo);
            }, delay);

        }

        //抓取title.imgs
        async.mapLimit(hrefs, 2, function (url, callback) {
            getPicture(url, callback);
            }, function (err, result) {
                if(err){
                    return console.error(err);
                }
                console.log('final:');
                console.log(result[0]);
                console.log(result.length + 'result');
                res.send(result[0]);
                // resultAuthor.concat(result[0]);
            });

        
    });
}

app.get('/', function (req, res, next) {
        getShyUrl(shyUrl, res);
});

app.listen(3000, function(){
    console.log('app is listening at port 3000');
})