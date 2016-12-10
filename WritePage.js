var nav = require("assets/js/navigation");
nav.menuVisible.value = 'Visible';

var data = require( 'assets/js/data' );

var Observable = require("FuseJS/Observable");

var errorInSending = Observable( false );

// get arguments passed by router
var inReplyToPostId = this.Parameter.map( function( param ) {
    return param.postid;
});

var txtToToot = this.Parameter.map( function( param ) {
    return param.account ? '@' + param.account + ' ' : '';
});

var cameraRoll = require("FuseJS/CameraRoll");

function doToot() {

  data.sendPost( txtToToot.value, inReplyToPostId.value ).then( function( result ) {

    txtToToot.value = '';
    if ( inReplyToPostId > 0 ) {
      router.goBack();
    } else {
      router.push( "timeline" );
    }

  } ).catch( function( error ) {

    errorInSending.value = true;

  } );

}

function selectImage() {

  cameraRoll.getImage()
      .then(function(image) {

          data.sendImage( image );

      }, function(error) {
          console.log( error );
      });
}

module.exports = {
  inReplyToPostId: inReplyToPostId,
  txtToToot: txtToToot,
  doToot: doToot,
  errorInSending: errorInSending,
  selectImage: selectImage
}
