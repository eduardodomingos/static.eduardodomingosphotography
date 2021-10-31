// if you're using a bundler, first import:
let Headroom =  require("headroom.js");
// grab an element
var myElement = document.querySelector(".primary-header");
let options = {
    offset : 200
}
// construct an instance of Headroom, passing the element
var headroom  = new Headroom(myElement, options);
// initialise
headroom.init();