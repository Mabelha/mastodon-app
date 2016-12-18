var InterApp = require("FuseJS/InterApp");

var nav = require("assets/js/navigation");
nav.menuVisible.value = 'Visible';

var data = require( 'assets/js/data' );

function init() {
  data.init( 'notifications' );
}

module.exports = {
  init: init,
  posts: data.posts.notifications,
  menuVisible: nav.menuVisible,
  loading: data.loading
};
