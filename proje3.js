var express = require('express'); //express modülünün tanımlanması
var request = require('request'); //request modülünün tanımlanması
var redis = require('redis'); //redisin tanımlanması
var bodyParser = require('body-parser'); //body-parserin tanımlanması
const mongo = require('mongodb').MongoClient; //mongoDB veritabanının import edilmesi
var app = express();

var redisClient = redis.createClient(); //Create a new Redis Client and connect to local Redis instance.

app.use(bodyParser.urlencoded({ extended: true }));//Middleware

const url = 'mongodb://localhost:27017'; ///mongoDB'nin bilgisayarda çalıştığı port

app.get('/',function(req,res){res.sendFile(__dirname+'/index.html');}); //Get işlemi bir html sayfasından çekilen sayfa ile yapıldı

app.post('/', function (req, res) {
    var FilmAdı = req.body.FilmAdı; //USD, EUR, GBP and etc.
    console.log(FilmAdı);
    redisClient.exists(FilmAdı, function (err1, reply) { //Check whether the key is in the Redis Cache (Cache Hit)
        if (reply == 1) //Önbellekte var ise;
        {
            console.log('The key (' + FilmAdı + ') exists in the Redis Cache.'); //Önbellekte bulunursa bunu yazdırsın
            redisClient.get(FilmAdı, function (err, val) {
                res.send(val) // değeri bana geri yollasın
            });
        } else // Önbellekte bulunamazsa 
        {
            mongo.connect(url, (err2, client) => {
                if (err2) {
                    console.error(err2)
                    return
                }
                const db = client.db('movies'); // mongoDb de kullanılan veri tabanının ismi 
                /* Sorgu işlemi */
                var query = {
                    Film: FilmAdı
                }
                db.collection("imdb").find(query).toArray(function (err3, result) { //imdb kullanılan tablomun adı
                    if (err3) throw err3;
                    console.log(result);

                    var Film, Genre, LeadStudio, AudienceScore, Profitability, RottenTomatoes, WorldwideGross, Year; //Veri tabanında ki film için verilen özellikler
                    /*Aranan değerlerin karşılığında ne vericeği  */
                    Film = result[0]['Film'];
                    AudienceScore = result[0]['Audience score %'];
                    Genre = result[0]['Genre'];
                    LeadStudio = result[0]['Lead Studio'];
                    Profitability = result[0]['Profitability'];
                    RottenTomatoes = result[0]['Rotten Tomatoes %'];
                    WorldwideGross = result[0]['Worldwide Gross'];
                    Year = result[0]['Year'];

                    value = CreateHTMLContent(Film, Genre, LeadStudio, AudienceScore, Profitability, RottenTomatoes, WorldwideGross, Year);

                    redisClient.set(FilmAdı, value, function (err, reply) { //burada 
                        console.log('A new key (' + FilmAdı + ') has been inserted into Redis Cache.');
                    });

                    redisClient.expire(FilmAdı, 300); //önbellekten silme süresi. 5 dakika

                    res.send(value);

                });
            });
        }
    });
});
app.listen(2525, function () {
    console.log('Redis Cache API"si 2525 portunu dinliyor..');
});


/* HTML sayfasının ayarlandığı fonksiyon  */
function CreateHTMLContent(Film, Genre, LeadStudio, AudienceScore, Profitability, RottenTomatoes, WorldwideGross, Year) {
    var content = '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<title>Redis Cache Application</title>' +
    '</head>' +
    '<body>' +
    '<div style="border: 1px solid black; background-color: darksalmon;"><table style="height:auto; width:auto;">' +
    '<tr>' +
    '<td><b>Film:</b></td>' +
    '&emsp;<td>' + Film + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td><b>Genre:</b></td>' +
    '<td>' + Genre + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td><b>LeadStudio:</b></td>' +
    '<td>&emsp;' + LeadStudio + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td><b>AudienceScore:</b></td>' +
    '<td>&emsp;' + AudienceScore + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td><b>Profitability:</b></td>' +
    '<td>&emsp;' + Profitability + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td><b>RottenTomatoes:</b></td>' +
    '<td>&emsp;' + RottenTomatoes + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td><b>WorldwideGross:</b></td>' +
    '<td>&emsp;' + WorldwideGross + '</td>' +
    '</tr>' +
    '<td><b>Year:</b></td>' +
    '<td>&emsp;' + Year + '</td>' +
    '</tr>' +
    '</table>' +
    '</div>'+
    '</body>' +
    '</html>';
    return content;
}