var Observable      = require("FuseJS/Observable");
var InterApp        = require("FuseJS/InterApp");

var data            = require( 'assets/js/data' );

var isFavouriting   = Observable( false );
var isReposting     = Observable( false );

function replyToPost( args ) {
  if ( args.data.isNotification ) {
    router.push( "write", { postid: args.data.status.id, firstup: args.data.account.username, mentions: args.data.status.mentions } );
  } else {
    router.push( "write", { postid: args.data.id, firstup: args.data.account.acct, mentions: args.data.mentions } );
  }
}

function rePost( args ) {
  isReposting.value = true;

  var _id = ( args.data.isNotification ) ? args.data.status.id : args.data.id;
  var _reposted = ( args.data.isNotification ) ? args.data.status.reblogged : args.data.reblogged;

  try {

    data.rePost( _id, _reposted ).then( function( result ) {

        // console.log( JSON.stringify( result ) );
        if ( result.err ) {
          // TODO show this has gone wrong
        }
        isReposting.value = false;

      },

      function( error ) {
        console.log( 'repost returned in catch()' );
        console.log( JSON.stringify( error ) );
        isReposting.value = false;
      }

    );

  } catch( e ) {
    console.log( JSON.stringify( e ) );
  }

}

function favouritePost( args ) {
  isFavouriting.value = true;

  var _id = ( args.data.isNotification ) ? args.data.status.id : args.data.id;
  var _favourited = ( args.data.isNotification ) ? args.data.status.favourited : args.data.favourited;

  try {

    data.favouritePost( _id, _favourited ).then( function( result ) {

        console.log( JSON.stringify( result ) );
        if ( result.err ) {
          // TODO show this has gone wrong
        } else {
          // TODO only update this post
          data.refresh();
        }
        isFavouriting.value = false;

      },

      function( error ) {
        console.log( 'favourited returned in catch()' );
        console.log( JSON.stringify( error ) );
        isFavouriting.value = false;
      }

    );

  } catch( e ) {
    console.log( JSON.stringify( e ) );
  }

}

function gotoUser( args ) {
  // var HtmlEnt = require( 'assets/js/he/he.js' );
  // args.data.account.note = HtmlEnt.decode( args.data.account.note );
  // console.log( JSON.stringify( args.data.account ) );
  if ( args.data.isNotification ) {
    // TODO in notifications, we have args.data.account and args.data.status.account
    router.push( "userprofile", { userprofile: args.data.account } );
  } else {
    router.push( "userprofile", { userid: args.data.account.id } );
  }
}

function wordClicked( args ) {
  console.log( 'word: ' + JSON.stringify( args.data ) );
  if ( args.data.mention ) {
    router.push( "userprofile", { userid: args.data.userid } );
  } else if ( args.data.link ) {
    InterApp.launchUri( args.data.uri );
  }
  // TODO a click on a word that's not bold, will also trigger this function
  // the click is ignored, yet it bothers me
}

function postClicked( args ) {
  console.log( 'post: ' + JSON.stringify( args.data ) );
}

module.exports = {
  replyToPost: replyToPost,
  rePost: rePost,
  isReposting: isReposting,
  favouritePost: favouritePost,
  isFavouriting: isFavouriting,
  gotoUser: gotoUser,
  wordClicked: wordClicked,
  postClicked: postClicked
};
