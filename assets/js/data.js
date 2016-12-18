var EventEmitter    = require("FuseJS/EventEmitter");
var Observable      = require("FuseJS/Observable");
var Storage         = require("FuseJS/Storage");

var FILE_DATACACHE  = 'data.cache.json';
var FILE_FAVOCACHE  = 'favourites.data.cache.json';

var HtmlEnt         = require( 'assets/js/he/he.js' );

// api credentials
var api = require( 'assets/js/api' );

var loading         = Observable( false );
var loadingError    = Observable( false );
var msg             = Observable( '' );
function resetErrorMsg() {
  console.log( 'resetting error data' );
  loadingError.value = false;
  msg.value = '';
}

var AccessToken     = Observable( false );
var at_file         = "access_code.json";

var currentType     = Observable();
var posts = {
  public        : Observable(),
  home          : Observable(),
  notifications : Observable(),
  user          : Observable(),
  favourites    : Observable()
}

// for showing a userprofile on UserProfileView.ux
var userprofile = Observable();

function refresh() {
  if ( '' != currentType.value ) {
    init( currentType.value, false );
  }
}

// start to load the (timeline) data
// function will return false if parameters are incorrect
// if an error is triggered when the data is fetched,
// the vars data.msg and data.loadingError are set
function init( _type, _clear, _id ) {

  if ( true === loading.value ) {
    console.log( 'already loading data' );
    return;
  }

  console.log( 'loading access token' );

  if ( !loadAccessToken() ) {
    console.log( 'error loading access token' );
    return false;
  }

  // clear first or just refresh data.posts
  if ( arguments.length > 1 && _clear ) {

    console.log( 'refreshing data' );

    posts[ _type ].clear();
    userprofile.clear();

  } else {

    // set current type
    currentType.value = _type;

    console.log( 'checking cache' );

    // is this data in cache?
    // postdata for a specific userid is not stored in cache
    if ( 'user' != currentType.value ) {
      var _cache = Storage.readSync( _type + '.' + FILE_DATACACHE );
      if ( '' != _cache) {
        var _json = JSON.parse( _cache );
        console.log( typeof _json );
        console.log( _json.length );
        if ( ( 'object' == typeof _json ) && ( _json.length > 0 ) ) {
          refreshPosts( _json );
          // posts[ _type ].replaceAll( _json );
          console.log( 'found data for ' + _type + ' in cache' );
          // console.log( JSON.stringify( _json ) );
        }
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

function saveAccessToken( token ) {
  AccessToken.value = token.access_token;
  return Storage.writeSync( at_file, JSON.stringify( token ) );
}

function loadAccessToken( ) {

  if ( false != AccessToken.value ) {
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
    AccessToken.value = token.access_token;
    return true;
  }

}

function loadUserFavourites() {

}

function loadUserProfile( _userid ) {

  // console.log( 'getting user profile for user id ' + _userid.value );

  api.loadUserProfile( _userid.value, AccessToken.value ).then(

    function( result ) {

      if ( result.err ) {
        // TODO show this has gone wrong
        console.log( 'error in loading user profile: ' + JSON.stringify( result ) );
      } else {
        // console.log( 'loaded user profile: ' + JSON.stringify( result ) );
        var _userprofile = result.userprofile;
        _userprofile.note = HtmlEnt.decode( _userprofile.note );
        _userprofile.note = _userprofile.note.replace( /<[^>]+>/ig, '' );
        userprofile.value = _userprofile;
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

  console.log( 'calling API endpoint ' + endpoint + ' with access token ' + AccessToken.value );

  fetch( 'https://mastodon.social/' + endpoint, {
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
      'Authorization': 'Bearer ' + AccessToken.value
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

// change properties of post with id _postid
// set the properties in _data ( e.g. { reblogged: true } )
function refreshPost( _postid, _data ) {

  posts[ currentType.value ].forEach( function( item, key ) {
    if ( 'notifications' == currentType.value ) {

      if ( _postid == item.status.id ) {
        for( var i in _data ) {
          console.log( 'updating ' + i + ' for notification post with id ' + _postid );
          posts[ currentType.value ][ key ].status[ i ] = _data[ i ];
        }
      }

    } else {

      if ( _postid == item.id ) {
        for( var i in _data ) {
          console.log( 'updating ' + i + ' for post with id ' + _postid );
          posts[ currentType.value ][ key ][ i ] = _data[ i ];
        }
      }

    }
  });

}

function refreshPosts( data ) {

  console.log( 'starting refresh of all posts' );

  posts[ currentType.value ].refreshAll(
    data,
    // compare ID
    function( oldItem, newItem ) {
      return oldItem.id == newItem.id;
    },
    // Update text
    function( oldItem, newItem ) {
        // oldItem.user.value = newItem.user;
        // oldItem.favourites.value = newItem.favourites;
    },
    // Map to object with an observable version of text
    function( newItem ) {
      console.log( 'updating item >>>>' );
      console.log( JSON.stringify( newItem ) );
      console.log( '<<<<<<<<<<<<<<<<<<' );
      return ( 'notifications' == currentType.value ) ? new MastodonNotification( newItem ) : new MastodonPost( newItem );
    }
  );

  console.log( 'finished refreshing data.posts' );

}

function doImageUpload( b64 ) {

  try {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener("load",function(e){ uploadDone(e); }, false);
    xhr.addEventListener("error",function(e){ uploadError(e); }, false);
    xhr.open("POST","https://mastodon.social/api/v1/media",true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", "Bearer " + AccessToken.value );
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
    AccessToken.value
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

    api.sendPost( _txt, _inreplyto, _media, AccessToken.value ).then(

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
      'Authorization': 'Bearer ' + AccessToken.value
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
    refreshPost( _postid, { reblogged: !_unRepost } );
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
          'Authorization': 'Bearer ' + AccessToken.value
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

function MastodonNotification( info ) {

  // console.log( JSON.stringify( info ) );

  this.isNotification     = true;

  this.isReblog           = ( 'reblog' == info.type );
  this.isMention          = ( 'mention' == info.type );
  this.isFavourite        = ( 'favourite' == info.type );
  this.isFollow           = ( 'follow' == info.type );

  for (var i in info ) {
    this[ i ] = info[ i ];
  }

  if ( this.isFollow ) {

    this.account.note       = HtmlEnt.decode( this.account.note.replace( /<[^>]+>/ig, '' ) );

  } else {

    this.content            = preparePostContent( this.status );
    this.contenttxt         = this.status.content;
    this.timesince          = timeSince( this.status.created_at );
    this.media_attachments  = this.status.media_attachments.slice( 0, 1 );

  }

  return this;

}

function MastodonPost( info ) {

  this.isNotification     = false;

  this.isReblog           = ( null !== info.reblog );

  if ( this.isReblog ) {
    this.reblogname =  info.account.display_name;
    info            = info.reblog;
  }

  for (var i in info ) {
    this[ i ] = info[ i ];
  }

  this.content            = preparePostContent( info );
  this.contenttxt         = info.content;
  this.timesince          = timeSince( this.created_at );

  // TODO show all attachments
  this.media_attachments  = this.media_attachments.slice(0, 1);

  // avatar a gif? animated or not, FuseTools cannot handle it
  this.isGifAvatar = ( 'gif' == this.account.avatar.slice( -3 ).toLowerCase() );

  return this;

}

function preparePostContent( postdata ) {

  // console.log( JSON.stringify( postdata ) );

  // @<a href=\"http://sn.gunmonkeynet.net/index.php/user/1\">nybill</a> eek, well glad it was finally noticed.

  // replace HTML codes like &amp; and &gt;
  // console.log( 'replace html entities' );
  var _content = HtmlEnt.decode( postdata.content );

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

  var result = Observable();

  var _words = _content.split( /\s/g );

  for ( var i in _words ) {

    // console.log( _words[ i ] );

    // new line?
    if ( _words[ i ].indexOf( ']]]]' ) > -1 ) {

      result.add( { word: '', clear: true } );

    } else if ( -1 === _words[ i ].indexOf( '[[[[' ) ) {

      // this is not a link, add it as a word
      // click event in Part.PostCard can send it to the post context screen
      result.add( { word: _words[ i ] } );

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
        result.add( { mention: true, word: _linkTxt, makeBold: true, userid: _mentioner[0].id } );
      } else {

        // not a mention. maybe a hashtag?
        var _tag = postdata.tags.filter( function (obj) { return '#' + obj.name === _linkTxt; } );
        if ( _tag.length > 0 ) {

          // TODO add hashtags
          result.add( { word: _linkTxt, makeBold: false } );

        } else if ( postdata.media_attachments.some( function (obj) { return ( _linkTxt.indexOf( obj.id ) > -1 ); } ) ) {

          // do not show the urls for media_attachments in the content

        } else if ( ( '@' == _charBeforeLink ) || ( '#' == _charBeforeLink ) ) {
          // mentions on some (older Statusnet installations, says https://community.highlandarrow.com/notice/469679 )
          // are a link with an @ before it. TODO One little thing: no user id from the mentions array
          result.add( { word: _charBeforeLink + _linkTxt, makeBold: false } );

        } else {

          // everything else not true. probably just a link
          // click event sends it to the system browser
          var _linkstart = _uris[ _linkId ].indexOf( 'href="' ) + 6;
          var _linkend = _uris[ _linkId ].indexOf( '"', _linkstart );
          var _linkUrl = _uris[ _linkId ].substring( _linkstart, _linkend );
          result.add( { link: true, word: _linkTxt, uri: _linkUrl, makeBold: true } );

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
  refresh: refresh,
  sendPost: sendPost,
  sendImage: sendImage,
  rePost: rePost,
  favouritePost: favouritePost,
  loadUserProfile: loadUserProfile,
  posts: posts,
  loading: loading,
  loadingError: loadingError,
  msg: msg,
  resetErrorMsg: resetErrorMsg,
  userprofile: userprofile
}
