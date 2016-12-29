var Observable = require("FuseJS/Observable");
var nav = require("assets/js/navigation");
nav.menuVisible.value = 'Visible';

var data = require( 'assets/js/data' );

var posts = Observable();

function init() {
  console.log( 'start home timeline' );
  // data.clear();
  data.init( 'home' );
}

module.exports = {
  init: init,
  posts: data.posts.home,
  menuVisible: nav.menuVisible
};
