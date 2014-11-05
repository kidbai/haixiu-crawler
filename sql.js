// var locationInfo = [{"author":"三角眼科学家","location":""},{"author":"空空","location":"常居: \n      江苏常州"},{"author":"大萌","location":"常居: \n      北京"},{"author":"橙子","location":"常居: \n      Krung Thep, Thailand"},{"author":"大宝","location":"常居: \n      上海"},{"author":"一过性黑朦","location":"常居: \n      江西南昌"},{"author":"小城姑娘","location":""},{"author":"小Ss","location":"常居: \n      Sydney, Australia"},{"author":"不要脸她后妈","location":"常居: \n      广东广州"},{"author":"所谓追求","location":"常居: \n      浙江杭州"},{"author":"枣","location":"常居: \n      Casablanca (Dar-el-Beida), Morocco"},{"author":"姨","location":"常居: \n      Praha, Czech Republic"},{"author":"Ci","location":"常居: \n      Tarābulus, Libya"},{"author":"Wendy.Zhang","location":""},{"author":"KingW","location":"常居: \n      北京"},{"author":"玫瑰，﹖","location":"常居: \n      黑龙江大庆"},{"author":"what 7 you say","location":""},{"author":"崔MEGA","location":"常居: \n      澳门"},{"author":"傻傻傻芭芭拉","location":""},{"author":"海树","location":"常居: \n      北京"},{"author":"依米","location":"常居: \n      北京"},{"author":"C小贱","location":"常居: \n      广东广州"},{"author":"一只旅行猫","location":"常居: \n      湖南长沙"},{"author":"Amazing","location":"常居: \n      湖南株洲"}];
// locationInfo.forEach(function (item){
//     console.log(item['location'].replace(/\r|\n/ig, ''));
// });
// var mysql = require('mysql');
// var conn = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: 'yang',
//     database: 'node_crawler'
// });

// conn.connect();
// locationInfo.forEach(function (item){
//     var values = [];
//     values.push(item['author']);
//     values.push(item['location']);
//     console.log(values);
//     conn.query('insert into tbl_post SET author_name = ?, author_location = ? ', values, function(err, results){
//         if(err){
//             console.error(err);
//         }
//     });;
// });
// var values = ['Chad', 'Lung'];
// conn.query('insert into tbl_post SET author_name = ?, author_location = ?', values, function (err, results){
//    if(err){
//     console.error(err);
//    }
// });
// conn.query('insert into tbl_post (title, href, author_href, author_name, author_location) values ("123", "123", "123", "123", "123")');

var a = [1,2,3];
var b = [];
console.log(b.concat(a));