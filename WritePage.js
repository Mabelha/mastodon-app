var nav = require( "assets/js/navigation" );
nav.menuVisible.value = 'Visible';

var data = require( 'assets/js/data' );

var Observable = require("FuseJS/Observable");

var errorInSending = Observable( false );

// get arguments passed by router
var inReplyToPostId = this.Parameter.map( function( param ) {
    return param.postid;
});

var media_attachments = Observable();

var txtToToot = this.Parameter.map( function( param ) {

  var _prefillPost = '';

  // firstup: args.data.account.acct, mentions: args.data.mentions
  if ( param.firstup ) {
    var _prefillPost = '@' + param.firstup + ' ';
  }

  for ( var i in param.mentions ) {
    if ( param.firstup != param.mentions[ i ].acct ) {
      _prefillPost += '@' + param.mentions[ i ].acct + ' ';
    }
  }

  return _prefillPost;
});

// stats
var attachments_length = Observable( function() {
  return media_attachments.length;
});

var txtLength = Observable( function() {
  return ( txtToToot.value ) ? txtToToot.value.length : 0;
});

var cameraRoll = require("FuseJS/CameraRoll");

function doToot() {

  // TODO why can this be undefined? I've mapped from parameter aboven
  if ( 'undefined' == typeof txtToToot.value ) {
    return;
  }

  if ( '' == txtToToot.value.replace(/\s+/g, '') ) {
    console.log( 'Please, give me something to work with (will not send empty post)' );
    return;
  }

  var _media_ids = [];
  // console.log( 'media_attachments has length ' + media_attachments.length );
  media_attachments.forEach( function( item ) {
    // console.log( 'item in media array: ' + JSON.stringify( item ) );
    _media_ids.push( item.id );
  } );

  // console.log( 'preparing media attachment ids: ' + JSON.stringify( _media_ids ) );

  data.sendPost( txtToToot.value, inReplyToPostId.value, _media_ids ).then( function( result ) {

    emptyScreenAndReturn();

  } ).catch( function( error ) {

    errorInSending.value = true;

  } );

}

function emptyScreenAndReturn() {

  txtToToot.value = '';
  inReplyToPostId.value = 0;
  media_attachments.clear();
  router.goBack();

}

function selectImage() {

  if ( media_attachments.length > 3 ) {
    return false;
  }

  // catch error when selecting tif file
  // https://www.fusetools.com/community/forums/bug_reports/camerarollgetimage_throws_error_when_selecting_tif
  try {

    cameraRoll.getImage()
        .then(function(image) {

          data.sendImage( image ).then( function( result ) {
            // console.log( result );
            media_attachments.add( JSON.parse( result ) );
          }, function( err ) {
            console.log( err );
          });

      }, function(error) {
          console.log( error );
      });

  } catch( e ) {
    // TODO let user know image was not used
  }
}

module.exports = {
  inReplyToPostId: inReplyToPostId,
  txtToToot: txtToToot,
  txtLength: txtLength,
  attachments: media_attachments,
  attachments_length: attachments_length,
  doToot: doToot,
  emptyScreenAndReturn: emptyScreenAndReturn,
  errorInSending: errorInSending,
  selectImage: selectImage
}
