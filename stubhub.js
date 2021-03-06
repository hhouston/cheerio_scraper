var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

let db = require('./db.js');

function writeToFile(object) {
// To write to the system we will use the built in 'fs' library.
// In this example we will pass 3 parameters to the writeFile function
// Parameter 1 :  output.json - this is what the created filename will be called
// Parameter 2 :  JSON.stringify(json, null, 4) - the data to write, here we do an extra step by calling JSON.stringify to make our JSON easier to read
// Parameter 3 :  callback function - a callback function to let us know the status of our function

    fs.writeFile('output.json', JSON.stringify(object, null, 4), function(err){

        console.log('File successfully written! - Check your project directory for the output.json file');

    });


    // Finally, we'll just send out a message to the browser reminding you that this app does not have a UI.
}

function scheduleRequest(url) {
  request(url, (error, res, html) => {

    if (!error) {
      let $ = cheerio.load(html);

      let title = $('.stathead').text();
      let teamName = $('.team-name').text();

      let awayStatus = $('li.game-status').text();
      let gameStatus = $('.game-status').children().first().text();
      let score = $('.score').children().first().text();
      console.log(title);
      console.log(teamName);
      console.log(awayStatus);
      console.log(gameStatus);
      console.log(score);

      //call to the db

      db.connect();

      db.saveTeamName(title);
      writeToFile(title);
    } else {
      console.log('error: ', error);
    }
  });
}

function seeMoreRequest(url) {
  request(url, (error, res, html) => {

    if (!error) {
      let $ = cheerio.load(html);
      let returnLink = $('.see-more').attr('href');
      console.log(returnLink);

    } else {
      console.log('error: ', error);
    }
  });
}

module.exports = {
  scrape: function() {
    console.log('scrape me stubhub');

    // let url = 'https://www.teamrankings.com/ncb/';
    // let url = 'http://web1.ncaa.org/stats/StatsSrv/ranksummary';
    // let url = 'http://www.espn.com/mens-college-basketball/rankings';
    let url = 'https://www.stubhub.com/houston-rockets-tickets-houston-rockets-houston-toyota-center-3-12-2017/event/9640397/?mbox=1&rS=6&abbyo=true&sliderpos=false&qtyq=false&qtyddab=true&sort=price+asc';

    request(url, function(error, response, html){

        if(!error){
            console.log('no error');
            var $ = cheerio.load(html);

            let links = [];
            let names = [];

            let counter = 0;

            let allTicketsLink;

            while ($('.see-more')) {
              console.log('click see more');
              // $('.see-more').click();
              // allTicketsLink = seeMoreRequest(see_more_url);
            }

            // $('.oddrow').each((i, el) => {
            //   let data = $(el);
            //
            //   if (i === $('.oddrow').length -1) {
            //     console.log('end');
            //   } else {
            //     names[i] = $(data.children().first().text());
            //     links[i] = data.find('a').attr('href');
            //
            //     linkRequest(links[i]);
            //     //Full Schedule
            //   }
            // });
        } else {
          console.log('error: ', error);
        }
    });
  }
};
