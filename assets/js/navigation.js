var Observable = require('FuseJS/Observable');

var menuVisible = Observable( 'Collapsed' );

function goBack() {
	router.goBack();
}

module.exports = {
	menuVisible: menuVisible,
	goBack: goBack
};
