var nav = require("assets/js/navigation");
nav.menuVisible.value = 'Visible';

var Observable = require("FuseJS/Observable");

var data = require( 'assets/js/data' );

function init() {
  data.init( 'public' );
}

module.exports = {
  init: init,
  posts: data.posts.public
}
