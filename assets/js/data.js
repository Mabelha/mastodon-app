var Observable      = require("FuseJS/Observable");
var EventEmitter    = require("FuseJS/EventEmitter");
var Storage         = require("FuseJS/Storage");

var FILE_DATACACHE  = 'data.cache.json';
var FILE_FAVOCACHE  = 'favourites.data.cache.json';

var HtmlEnt         = require( 'assets/js/he/he.js' );

// api credentials
var api = require( 'assets/js/api' );

var loading         = Observable( false );
var loadErrorMsg    = Observable( '' );

var AccessToken     = '';
var at_file         = "at.json";

var currentType     = Observable( '' );
var posts = {
  public        : Observable(),
  home          : Observable(),
  notifications : Observable(),
  user          : Observable(),
  favourites    : Observable()
};

// for showing a userprofile on UserProfileView.ux
var userprofile = Observable();

function clearPosts() {

  for ( var i in posts ) {
    posts[ i ].clear();
  }

  userprofile.clear();

}

function resetErrorMsg() {
  console.log( 'resetting error data' );
  loadErrorMsg.value = '';
}

// start to load the (timeline) data
// function will return false if parameters are incorrect
// if an error is triggered when the data is fetched,
// the var data.loadErrorMsg is set
function init( _type, _id ) {

  if ( true === loading.value ) {
    console.log( 'already loading data' );
    return;
  }

  console.log( 'loading access token' );

  if ( !loadAccessToken() ) {
    console.log( 'error loading access token' );
    return false;
  }

  // set current type
  currentType.value = _type;

  console.log( 'checking cache' );

  // is this data in cache?
  // postdata for a specific userid is not stored in cache
  if ( 'user' != currentType.value ) {
    var _cache = Storage.readSync( _type + '.' + FILE_DATACACHE );
    if ( '' != _cache) {
      var _json = JSON.parse( _cache );
      if ( ( 'object' == typeof _json ) && ( _json.length > 0 ) ) {
        console.log( 'found data for ' + _type + ' in cache' );
        refreshPosts( _json );
      }
    }
  }

}

function restOfInit() {

  console.log( 'fetch data from server async' );

  // fetch data from API after a small delay to let the page settle
  if ( arguments.length > 2 ) {
    setTimeout( function() { loadTimeline( _id ); }, 2000 );
  } else {
    setTimeout( function() { loadTimeline(); }, 2000 );
  }

}

function refreshTimeline() {
  if ( '' != currentType.value ) {
    loadTimeline( currentType.value );
  }
}

function saveAccessToken( token ) {
  AccessToken = token.access_token;
  return Storage.writeSync( at_file, JSON.stringify( token ) );
}

function loadAccessToken( ) {

  if ( false != AccessToken ) {
    return true;
  }

  try {
    var token = Storage.readSync( at_file );
    // console.log( 'token from file: ' + token );
  }
  catch( e ) {
    return false;
  }

  if ( '' == token ) {
    return false;
  } else {
    token = JSON.parse( token );
    // for ( var i in token ) {
    //   console.log( i + ': ' + token[i] );
    // }
    AccessToken = token.access_token;
    return true;
  }

}

function loadUserFavourites() {

}

function loadUserProfile( _userid ) {

  // console.log( 'getting user profile for user id ' + _userid );

  api.loadUserProfile( _userid, AccessToken ).then(

    function( result ) {

      if ( result.err ) {
        // TODO show this has gone wrong
        console.log( 'error in loading user profile: ' + JSON.stringify( result ) );
      } else {
        // console.log( 'loaded user profile: ' + JSON.stringify( result ) );
        userprofile = result.userprofile;
        userprofile.note = HtmlEnt.decode( userprofile.note );
        userprofile.note = userprofile.note.replace( /<[^>]+>/ig, '' );
      }

    }
  ).catch(

    function( error ) {
      console.log( 'favourited returned in catch()' );
      console.log( JSON.stringify( error ) );
    }

  );

}

function loadTimeline( _id ) {

  loading.value = true;

  var endpoint = '';
  switch ( currentType.value ) {
    case 'home':
      endpoint = 'api/v1/timelines/home';
      break;
    case 'notifications':
      endpoint = 'api/v1/notifications';
      break;
    case 'user':
      endpoint = 'api/v1/accounts/' + _id + '/statuses';
      break;
    case 'public':
    default:
      endpoint = 'api/v1/timelines/public';
      break;
  }

  console.log( 'calling API endpoint ' + endpoint + ' with access token ' + AccessToken );

  fetch( 'https://mastodon.social/' + endpoint, {
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
      'Authorization': 'Bearer ' + AccessToken
    }
  })
  .then( function( resp ) {
    console.log( 'LD3: ' + resp.status );
    if ( 200 == resp.status ) {
      // console.log( 'LD3A' );
      return resp.json();
    } else {
      console.log( 'data.loadPosts returned status ' + resp.status );
      loading.value = false;
    }
  })
  .then( function( json ) {
    console.log( 'LD4' );
    console.log( 'writing fetch result to cache' );
    Storage.write( currentType.value + '.' + FILE_DATACACHE, JSON.stringify( json ) );
    refreshPosts( json );
    loading.value = false;
  })
  .catch( function( err ) {
    console.log( 'data.loadPosts caused error' );
    loading.value = false;
  });

}

function refreshPosts( data ) {

  console.log( 'resfresh data.posts.' + currentType.value );

   posts[ currentType.value ].refreshAll(
     data,
     // same item?
     function( _old, _new ) {
       return _old.id == _new.id;
     },
     // update if found
     function( _old, _new ) {
       _old = MastodonPost( _new );
     },
     // not found, add new one
     function( _new ) {
       return MastodonPost( _new );
     }
  );

  console.log( 'finished refreshing data.posts; ' + posts[ currentType.value ].length + ' elements now.' );

}

function doImageUpload( b64 ) {

  try {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener("load",function(e){ uploadDone(e); }, false);
    xhr.addEventListener("error",function(e){ uploadError(e); }, false);
    xhr.open("POST","https://mastodon.social/api/v1/media",true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", "Bearer " + AccessToken );
    xhr.send( b64 );
  } catch( err ) {
    console.log( JSON.stringify( err ) );
  }
}

function uploadDone(e) {
  if ( e.target.status === 200) {
    console.log("successfull return");
  }
}

function uploadError( e ) {
  console.log("error: " + JSON.stringify( e.target ) );
}

function sendImage( _imgObj ) {

  var Uploader = require("Uploader");
  return Uploader.send(
    _imgObj.path,
    'https://mastodon.social/api/v1/media',
    AccessToken
  );

}

function sendPost( _txt, _inreplyto, _media ) {

  loading.value = true;

  if ( arguments.length < 2 ) {
    _inreplyto = 0;
  }

  if ( arguments.length < 3 ) {
    _media = [];
  }

  return new Promise( function( resolve, reject ) {

    var _resolve = resolve;
    var _reject = reject;

    api.sendPost( _txt, _inreplyto, _media, AccessToken ).then(

      function( data ) {

        loading.value = false;
        _resolve();
      }

    ).catch(

      function( error ) {
        console.log( JSON.parse( error ) );
        loading.value = false;
        _reject();
      }

    );

  });

}

function rePost( _postid, _unRepost ) {

  if ( arguments.length < 2 ) {
    var _unRepost = false;
  }

  var _apiAction = ( _unRepost ) ? 'unreblog' : 'reblog';

  // create promise
  var rpEmitter = new EventEmitter( 'rePostEnded' );

  fetch( 'https://mastodon.social/api/v1/statuses/' + _postid + '/' + _apiAction, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
      'Authorization': 'Bearer ' + AccessToken
    }
  })
  .then( function( resp ) {
    console.log( 'repost http status ' + resp.status );
    if ( 200 == resp.status ) {
      return resp.json();
    } else {
      rpEmitter.emit( 'rePostEnded', { err: true } );
    }
  })
  .then( function( json ) {
    refreshPosts( json );
    rpEmitter.emit( 'rePostEnded', { err: false, post: json } );
  })
  .catch( function( err ) {
    console.log( 'repost error in call' );
    rpEmitter.emit( 'rePostEnded', { err: true } );
  });

  return rpEmitter.promiseOf( 'rePostEnded' );

}

function favouritePost( _postid, unFavourite ) {

  console.log( 'start' );

  if ( arguments.length < 2 ) {
    var unFavourite = false;
  }

  var _apiAction = ( unFavourite ) ? 'unfavourite' : 'favourite';

  // console.log( 'favourite: ' + _postid + '/' + _apiAction );

  // create promise
  var favEmitter = new EventEmitter( 'favouritePostEnded' );

  fetch( 'https://mastodon.social/api/v1/statuses/' + _postid + '/' + _apiAction, {
      method: 'POST',
      headers: {
          'Content-type': 'application/json',
          'Authorization': 'Bearer ' + AccessToken
      }
  })
  .then( function( resp ) {
      // console.log( 'LD3' );
      if ( 200 == resp.status ) {
          // console.log( 'LD3A' );
          return resp.json();
      } else {
          // console.log( 'LD3B' );
          favEmitter.emit( 'favouritePostEnded', { err: true } );
      }
  })
  .then( function( json ) {
    // console.log( 'LD4' );
    favEmitter.emit( 'favouritePostEnded', { err: false, post: json } );
  })
  .catch( function( err ) {
    // console.log( 'LD5' );
    favEmitter.emit( 'favouritePostEnded', { err: true } );
  });

  return favEmitter.promiseOf( 'favouritePostEnded' );

}

function MastodonPost( info ) {

  var _this = {};

  _this.isNotification    = ( 'notifications' == currentType.value );
  _this.isReblog          = ( 'reblog' == info.type ) || ( null !== info.reblog );
  _this.isMention         = ( 'mention' == info.type );
  _this.isFavourite       = ( 'favourite' == info.type );
  _this.isFollow          = ( 'follow' == info.type );

  console.log( JSON.stringify( info ) );

  if ( 'notifications' == currentType.value ) {
    info = info.status;
  } else if ( ( 'reblog' == info.type ) || ( null !== info.reblog ) ) {
    _this.reblogname      = info.account.display_name;
    info = info.reblog;
  }

  for (var i in info ) {
    _this[ i ]            = info[ i ];
  }

  if ( !_this.isFollow ) {
    _this.preparedContent   = preparePostContent( info );
    _this.media_attachments = info.media_attachments;
    _this.timesince         = timeSince( info.created_at );

    // avatar a gif? animated or not, FuseTools cannot handle it
    _this.isGifAvatar       = ( 'gif' == info.account.avatar.slice( -3 ).toLowerCase() );
  }

  // console.log( JSON.stringify( _this ) );

  return _this;
}

function preparePostContent( postdata ) {

  // console.log( JSON.stringify( postdata ) );

  // @<a href=\"http://sn.gunmonkeynet.net/index.php/user/1\">nybill</a> eek, well glad it was finally noticed.

  // replace HTML codes like &amp; and &gt;
  // console.log( 'replace html entities' );
  var _content = ( postdata.content ) ? HtmlEnt.decode( postdata.content ) : '';

  return _content.replace( /<[^>]+>/ig, '' );

  // temporary replace urls to prevent splitting on spaces in linktext
  // console.log( 'replace urls with temp indicator' );
  var regex = /<[aA].*?\s+href=["']([^"']*)["'][^>]*>(?:<.*?>)*(.*?)(?:<.*?>)?<\/[aA]>/igm ;
  var _uris = _content.match( regex );
  if ( _uris && ( _uris.length > 0 ) ) {
    for ( var i in _uris ) {
      // console.log( _uris[ i ] );
      _content = _content.replace( _uris[ i ], '[[[[' + i );
    }
  }

  // whould like some empty lines to survive in the content
  // first: remove last </p> as this need not be replaced
  // console.log( 'replace last </p> with temp indicator' );
  _content = _content.replace(new RegExp('<\/p>$'), '');
  _content = _content.replace( "</p>", " ]]]] " );

  // now remove al HTML tags
  _content = _content.replace( /<[^>]+>/ig, '' );

  // console.log( ' >>>>>>>>>>>>>>> replaced uris in content with [[[[x' );
  // console.log( _content );
  // console.log( ' <<<<<<<<<<<<<<<' );

  var result = [];

  var _words = _content.split( /\s/g );

  for ( var i in _words ) {

    // console.log( _words[ i ] );

    // new line?
    if ( _words[ i ].indexOf( ']]]]' ) > -1 ) {

      result.push( { word: '', clear: true } );

    } else if ( -1 === _words[ i ].indexOf( '[[[[' ) ) {

      // this is not a link, add it as a word
      // click event in Part.PostCard can send it to the post context screen
      result.push( { word: _words[ i ] } );

    } else {

      // link found! but: what kind of link?
      // bug fix: if e.g. a mention links to another server, it's a link with a @ before it
      var _charBeforeLink = ( '[[[[' == _words[ i ].substring( 1, 5 ) ) ? _words[ i ].substring( 0, 1 ) : '';
      var _linkId = Number.parseInt( _words[ i ].match(/\d/g).join('') );
      var _linkTxt = _uris[ _linkId ].replace( /<[^>]+>/ig, '' );

      // console.log( _uris[ _linkId ] );
      // console.log( 'link text: ' + _linkTxt );
      // console.log( 'start char: ' + _charBeforeLink );

      // first: mentions
      var _mentioner = postdata.mentions.filter( function (obj) { return ( 0 ==  _linkTxt.indexOf( '@' + obj.acct ) ); } );
      if ( _mentioner.length > 0 ) {
        result.push( { mention: true, word: _linkTxt, makeBold: true, userid: _mentioner[0].id } );
      } else {

        // not a mention. maybe a hashtag?
        var _tag = postdata.tags.filter( function (obj) { return '#' + obj.name === _linkTxt; } );
        if ( _tag.length > 0 ) {

          // TODO add hashtags
          result.push( { word: _linkTxt, makeBold: false } );

        } else if ( postdata.media_attachments.some( function (obj) { return ( _linkTxt.indexOf( obj.id ) > -1 ); } ) ) {

          // do not show the urls for media_attachments in the content

        } else if ( ( '@' == _charBeforeLink ) || ( '#' == _charBeforeLink ) ) {
          // mentions on some (older Statusnet installations, says https://community.highlandarrow.com/notice/469679 )
          // are a link with an @ before it. TODO One little thing: no user id from the mentions array
          result.push( { word: _charBeforeLink + _linkTxt, makeBold: false } );

        } else {

          // everything else not true. probably just a link
          // click event sends it to the system browser
          var _linkstart = _uris[ _linkId ].indexOf( 'href="' ) + 6;
          var _linkend = _uris[ _linkId ].indexOf( '"', _linkstart );
          var _linkUrl = _uris[ _linkId ].substring( _linkstart, _linkend );
          result.push( { link: true, word: _linkTxt, uri: _linkUrl, makeBold: true } );

        }
      }
    }
  }

  return result;

}

function timeSince(date) {

    var seconds = Math.floor( ( new Date() - new Date( date ) ) / 1000 );

    var interval = Math.floor(seconds / 31536000);
    if (interval > 1) { return interval + "y"; }

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) { return interval + "m"; }

    interval = Math.floor(seconds / 86400);
    if (interval > 1) { return interval + "d"; }

    interval = Math.floor(seconds / 3600);
    if (interval > 1) { return interval + "h"; }

    interval = Math.floor(seconds / 60);
    if (interval > 1) { return interval + "m"; }

    return Math.floor(seconds) + "s";
}

module.exports = {
  loadAccessToken: loadAccessToken,
  saveAccessToken: saveAccessToken,
  init: init,
  clear: clearPosts,
  refreshTimeline: refreshTimeline,
  sendPost: sendPost,
  sendImage: sendImage,
  rePost: rePost,
  favouritePost: favouritePost,
  loadUserProfile: loadUserProfile,
  posts: posts,
  loading: loading,
  msg: loadErrorMsg,
  resetErrorMsg: resetErrorMsg,
  userprofile: userprofile
}
