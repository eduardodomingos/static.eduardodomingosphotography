// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const body = document.querySelector('body');
const burger = document.querySelector('.burger');
const lightboxModal = document.querySelector(".lightbox__modal");
const previews = document.querySelectorAll(".lightbox__list img");




// -----------------------------------------------------------------------------
// Burger Menu
// -----------------------------------------------------------------------------
burger.addEventListener('click', () => {
    if(body.classList.contains('primary-nav-is-open')) {
        body.classList.remove('primary-nav-is-open');
    } else {
        body.classList.add('primary-nav-is-open');
    }
});




// -----------------------------------------------------------------------------
// Lightbox
// -----------------------------------------------------------------------------
previews.forEach((preview) => {
    preview.addEventListener('click', () => {
        body.classList.add('lightbox-is-open');
        let previewID = preview.dataset.id; // get data-id from preview
        if(document.querySelector(`.lightbox__modal figure[data-id="${previewID}"]`)) {
            // if image has been already loaded just toggle its visibility:
            document.querySelector(`.lightbox__modal figure[data-id="${previewID}"]`).style.display = 'block';
        }
        else {
            // if image is not loaded yet, build it:
            const figure = document.createElement("figure");
            figure.setAttribute('data-id', previewID);
            const figcaption = document.createElement("figcaption");
            const img = document.createElement("img");
            img.src =  preview.getAttribute('data-src');
            img.alt =  preview.getAttribute('alt');
            figcaption.innerHTML = preview.getAttribute('alt');
            figure.append(img, figcaption);
            lightboxModal.appendChild(figure);
        }
    });
});
lightboxModal.addEventListener('click', () => {
    if(body.classList.contains('lightbox-is-open')) {
        body.classList.remove('lightbox-is-open');
        document.querySelectorAll('.lightbox__modal figure').forEach(el => el.style.display = 'none');
    }
});




// -----------------------------------------------------------------------------
// Sticky header
// -----------------------------------------------------------------------------
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