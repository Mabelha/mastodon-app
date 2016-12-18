var nav = require("assets/js/navigation");
nav.menuVisible.value = 'Collapsed';

var data = require("assets/js/data");

function goHome() {
  router.goto( 'timeline' );
}

function goNotifications() {
  router.goto( 'notifications' );
}

function goWrite() {
  router.push( 'write' );
}

function goPublic() {
  router.goto( 'publictimeline' );
}

function refreshData() {
  data.refresh();
}

var Lifecycle = require('FuseJS/Lifecycle');
Lifecycle.on("enteringInteractive", function() {
  // app activated
  refreshData();
});

module.exports = {
  menuVisible: nav.menuVisible,
  goHome: goHome,
  goNotifications: goNotifications,
  goWrite: goWrite,
  goPublic: goPublic,
  loading: data.loading,
  hidePopup: data.resetErrorMsg,
  loadingError: data.loadingError,
  msg: data.msg,
  refreshData: refreshData
}
