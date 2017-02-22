var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();
var yam_array = [];

function Yam(artist, track_name, link, likes, priority) {
    this.artist = artist;
    this.track_name = track_name;
    this.link = link;
    this.likes = likes;
    this.priority = priority;

    console.log('ARTIST: ', artist);
    console.log('track NAME: ', track_name);
    console.log('link: ', link);
    console.log('likes: ', likes);
    console.log('priority: ', priority + '\n');
    console.log('length: ', yam_array.length+1);

}

//webscraping magic
app.get('/scrape', function(req, res) {

    // url = 'http://hypem.com/popular/3?workaround=lol';
    url = 'http://hypem.com/popular';

    // The structure of our request call
    // The first parameter is our URL
    // The callback function takes 3 parameters, an error, response status code and the html
    request(url, function(error, response, html) {

        // First we'll check to make sure no errors occurred when making the request

        if (!error) {
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality

            var $ = cheerio.load(html);

            // Finally, we'll define the variables we're going to capture
            var links = [];
            var hypem = 'http://hypem.com';
            var track_counter = 1;
            $('.track').each(function(i, elem) {
                //links[i] = $(this).text(); //track names
                links[i] = hypem + $(this).attr('href'); //track links

                //console.log('link: ', links[i]);


                request(links[i], function(error2, response, html2) {
                    if (!error2) {
                        //console.log('track_counter: ', track_counter);

                        var $ = cheerio.load(html2);

                        var fav_counter = 0;
                        $('.favdiv').filter(function() {

                            if (fav_counter > 0) {
                                console.log('fav_counter: ', fav_counter + 1);
                                return;
                            }

                            var likes = $(this).children().first().text().trim();
                            if (likes.slice(-1) == 'K') {
                                //turn to real number
                                likes = likes.replace("K", "00");
                                likes = likes.replace(".", "");
                                var likes_number = Number(likes);

                                var artist = $(this).parent().siblings('.track_name').children().first().text().trim();
                                var track_name = $(this).parent().siblings('.track_name').children().last().text().trim();

                                var priority = '';
                                if (likes_number > 20 || artist == 'Fetty Wap' || artist == 'Kygo') {
                                    if (likes_number > 9000) {
                                        priority = 'OVER 9000';
                                    } else if (likes_number > 5000) {
                                        priority = 'YAAAAAS';

                                    } else if (likes_number > 2000) {
                                        priority = 'BANGS';
                                    }
                                    if (priority == '') {
                                        priority = 'ya boi';
                                    }
                                    yam_array.push(new Yam(artist, track_name, links[i], likes, priority));
                                    console.log('stringify', JSON.stringify(yam_array));
                                }

                            }
                            fav_counter++;
                        })
                    }
                })
                track_counter++;
            });



        }
        console.log('end request 1');
    });

    writeFile();
    // //write to output file
    // fs.writeFile('output.json', JSON.stringify(yam_array, null, 4), function(err) {
    //         console.log('err: ', err);
    //         console.log('File successfully written! - Check your project directory for the output.json file');
    //
    //     })
    //     // Finally, we'll just send out a message to the browser reminding you that this app does not have a UI.
    res.send('Check your console!')

});

function writeFile() {
  //write to output file
  fs.writeFile('output.json', JSON.stringify(yam_array, null, 4), function(err) {
          console.log('err: ', err);
          console.log('File successfully written! - Check your project directory for the output.json file');

      });
      // Finally, we'll just send out a message to the browser reminding you that this app does not have a UI.

}

app.listen('8081');

console.log('port 8081 open');

exports = module.exports = app;
