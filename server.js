var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var scrape = require('./cheerio.js');
var app = express();


//webscraping magic
app.get('/ncaab', function(req, res) {


    scrape.ncaab();
    // url = 'http://hypem.com/popular/3?workaround=lol';
    // url = 'http://hypem.com/popular';


});

app.listen('8081');

console.log('port 8081 open');

exports = module.exports = app;
