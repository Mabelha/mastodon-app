var nav = require("assets/js/navigation");
nav.menuVisible.value = 'Visible';

var Observable = require("FuseJS/Observable");

var data = require( 'assets/js/data' );

this.Parameter.onValueChanged( module, function( param ) {
  data.init( 'user', param.userid );
  data.loadUserProfile( param.userid );
})

function goBack() {
	router.goBack();
}

module.exports = {
  account: data.userprofile,
  posts: data.posts.user,
  goBack: goBack
}
