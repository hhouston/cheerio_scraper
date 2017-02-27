var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var ncaab = require('./cheerio.js');
var stubhub = require('./stubhub.js');
var app = express();

var phantomjs = require('phantomjs-prebuilt');
var program = phantomjs.exec('casper.js');

// var casper = require('casper').create();
// var mouse = require("mouse").create(casper);


//webscraping magic
app.get('/ncaab', function(req, res) {

    ncaab.scrape();
    // url = 'http://hypem.com/popular/3?workaround=lol';
    // url = 'http://hypem.com/popular';


});

app.get('/stubhub', function(req, res) {

    stubhub.scrape();
    // url = 'http://hypem.com/popular/3?workaround=lol';
    // url = 'http://hypem.com/popular';


});

app.get('/test', (req, res) => {

  var casper_nodejs = require('./index.js');

  var url = "http://google.com";
  // load the page refered with 'url' with casper
  var casper = casper_nodejs.create(url, {});

  // once the page is loaded, execute that in our current nodejs context
  // casper.then(function executed_in_this_context() {
  //   console.log("page loaded");
  // });

  // then, execute that in casperjs, and the second callback in the current nodejs context
  // casper.then(function executed_in_casperjs_context() {
  //   return 42;
  // }, function executed_in_this_context(ret) {
  //   console.log("it works: " + ret);

  // casper.exit() can be placed here too, instead of in the bottom :)
  // casper.exit();
// });

// exit casper after executing the 2 previous 'then'
casper.exit();
  //
  // var linkSelector = 'div.see-more';
  //
  // casper.then(function() {
  //     if (!this.exists(linkSelector)) {
  //       console.log('div.see-more does not exist');
  //       return;
  //     } else if (this.exists('div.see-more hide')) {
  //       console.log('div.see-more hide exists');
  //     }
  //
  //     //click see-more div
  //     this.mouse.click(linkSelector);

      // this.evaluate(function(linkSelector) {
      //     __utils__.findOne(linkSelector).setAttribute("className", "clicked");
      // }, linkSelector);
  // });


});

app.listen('8081');

console.log('port 8081 open');

exports = module.exports = app;
