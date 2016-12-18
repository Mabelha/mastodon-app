var nav = require("assets/js/navigation");
nav.menuVisible.value = 'Visible';

var Observable = require("FuseJS/Observable");

var data = require( 'assets/js/data' );

function init() {
  console.log( 'start timeline' );
  data.init( 'home' );
}

module.exports = {
  init: init,
  posts: data.posts.home,
  menuVisible: nav.menuVisible
};
