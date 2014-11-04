var express = require('express');
var eventproxy = require('eventproxy');
var superagent = require('superagent');
var cheerio = require('cheerio');
var app = express();

var url = require('url');

var pageNum = 0;
var count = 0;
var maxNum = 10;
var offset = 25;
var shyUrl = 'http://www.douban.com/group/haixiuzu/discussion?start=';

var ep = eventproxy();
var async = require('async');
var excutetimes = 0;
var getShyUrl = function(shyUrl){
    console.log(excutetimes++);
    superagent.get(shyUrl)
    .end(function (err, sres) {
        if(err){
            return console.error(err);
        }
        var topicInfo = [];
        var authorInfo = [];
        var $ = cheerio.load(sres.text);
        // res.send(sres.text);

        $('.title a').each(function (idx, element){
            topicInfo.push({
                title: $(element).attr('title'),
                href: $(element).attr('href')
            });
        });
        $("td[nowrap=nowrap] a").each(function (idx, element){
            authorInfo.push({
                author: $(element).text(),
                authorUrls: $(element).attr('href')
            });
        });
        console.log(topicInfo);
        console.log(authorInfo);
        var authorUrlsList = [];
        authorUrlsList = authorInfo.map(function (infoItem){
            return infoItem.authorUrls;
        });
        console.log(authorUrlsList);


        //抓取作者信息
        var concurrencyCount = 0;
        var fetchAuthorLocation = function(url, callback) {
            var delay = parseInt((Math.random() * 10000000) % 2000, 10);
            concurrencyCount++;
            console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', url, '，耗时' + delay + '毫秒');

            var author = [];
            superagent.get(url)
                .end(function (err, sres){
                    if(err){
                        return console.error(err);
                    }
                    // res.send(sres.text);
                    var $ = cheerio.load(sres.text);
                    author.push({
                        name: $('.name').text().trim(),
                        location: $('.loc').text().trim()
                    });
                });
            setTimeout(function () {
                concurrencyCount--;
                callback(null, author);
            }, delay);
        };
        //抓取作者信息
        async.mapLimit(authorUrlsList, 3, function (url, callback) {
            fetchAuthorLocation(url, callback);
            }, function (err, result) {
                if(err){
                    return console.error(err);
                }
                console.log('final:');
                console.log(result);
            });

    });
}

app.get('/', function (req, res, next) {
    for(count = 0; count < maxNum; count++)
    {
        pageNum = count * offset;
        console.log(pageNum);
        getShyUrl(shyUrl + pageNum);
    } 
});

app.listen(3000, function(){
    console.log('app is listening at port 3000');
})