var casper = require('casper').create();
// casper.start('http://casperjs.org/');
//
// casper.then(function() {
//     this.echo('First Page: ' + this.getTitle());
// });
//
// casper.thenOpen('http://phantomjs.org', function() {
//     this.echo('Second Page: ' + this.getTitle());
// });
//
// casper.run();

casper.start();

casper
  .then(function(){
    console.log("Start:");
  })
  .thenOpen("https://www.stubhub.com/golden-state-warriors-tickets-golden-state-warriors-oakland-oracle-arena-3-26-2017/event/9640278/?mbox=1&rS=6&abbyo=true&sliderpos=false&qtyq=false&qtyddab=true&sort=price+asc")
  .then(function(){
    // scrape something
    console.log(this);
    this.echo(this.getHTML('body'));
  })
  .thenClick("div.see-more")
  .then(function(){
    // scrape something else
    console.log('clicked button');
    this.echo(this.getHTML('h2#foobar'));
  })
  .thenClick("#button2")
  .thenOpen("mongodb://localhost:27017/test", {
    method: "post",
    data: {
        my: 'data',
    }
  }, function() {
      this.echo("data sent back to the server")
  });

casper.run();
