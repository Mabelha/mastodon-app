var InterApp = require("FuseJS/InterApp");
var Observable = require("FuseJS/Observable");
var nav = require("assets/js/navigation");
nav.menuVisible.value = 'Visible';

var data = require( 'assets/js/data' );
var posts = Observable();

function init() {
  console.log( 'start notifications timeline' );
  // data.clear();
  data.init( 'notifications' );
}

module.exports = {
  init: init,
  posts: data.posts.notifications,
  // posts: posts,
  menuVisible: nav.menuVisible,
  loading: data.loading
};
