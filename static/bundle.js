(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
},{"headroom.js":2}],2:[function(require,module,exports){
/*!
 * headroom.js v0.12.0 - Give your page some headroom. Hide your header until you need it
 * Copyright (c) 2020 Nick Williams - http://wicky.nillia.ms/headroom.js
 * License: MIT
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.Headroom = factory());
}(this, function () { 'use strict';

  function isBrowser() {
    return typeof window !== "undefined";
  }

  /**
   * Used to detect browser support for adding an event listener with options
   * Credit: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
   */
  function passiveEventsSupported() {
    var supported = false;

    try {
      var options = {
        // eslint-disable-next-line getter-return
        get passive() {
          supported = true;
        }
      };
      window.addEventListener("test", options, options);
      window.removeEventListener("test", options, options);
    } catch (err) {
      supported = false;
    }

    return supported;
  }

  function isSupported() {
    return !!(
      isBrowser() &&
      function() {}.bind &&
      "classList" in document.documentElement &&
      Object.assign &&
      Object.keys &&
      requestAnimationFrame
    );
  }

  function isDocument(obj) {
    return obj.nodeType === 9; // Node.DOCUMENT_NODE === 9
  }

  function isWindow(obj) {
    // `obj === window` or `obj instanceof Window` is not sufficient,
    // as the obj may be the window of an iframe.
    return obj && obj.document && isDocument(obj.document);
  }

  function windowScroller(win) {
    var doc = win.document;
    var body = doc.body;
    var html = doc.documentElement;

    return {
      /**
       * @see http://james.padolsey.com/javascript/get-document-height-cross-browser/
       * @return {Number} the scroll height of the document in pixels
       */
      scrollHeight: function() {
        return Math.max(
          body.scrollHeight,
          html.scrollHeight,
          body.offsetHeight,
          html.offsetHeight,
          body.clientHeight,
          html.clientHeight
        );
      },

      /**
       * @see http://andylangton.co.uk/blog/development/get-viewport-size-width-and-height-javascript
       * @return {Number} the height of the viewport in pixels
       */
      height: function() {
        return win.innerHeight || html.clientHeight || body.clientHeight;
      },

      /**
       * Gets the Y scroll position
       * @return {Number} pixels the page has scrolled along the Y-axis
       */
      scrollY: function() {
        if (win.pageYOffset !== undefined) {
          return win.pageYOffset;
        }

        return (html || body.parentNode || body).scrollTop;
      }
    };
  }

  function elementScroller(element) {
    return {
      /**
       * @return {Number} the scroll height of the element in pixels
       */
      scrollHeight: function() {
        return Math.max(
          element.scrollHeight,
          element.offsetHeight,
          element.clientHeight
        );
      },

      /**
       * @return {Number} the height of the element in pixels
       */
      height: function() {
        return Math.max(element.offsetHeight, element.clientHeight);
      },

      /**
       * Gets the Y scroll position
       * @return {Number} pixels the element has scrolled along the Y-axis
       */
      scrollY: function() {
        return element.scrollTop;
      }
    };
  }

  function createScroller(element) {
    return isWindow(element) ? windowScroller(element) : elementScroller(element);
  }

  /**
   * @param element EventTarget
   */
  function trackScroll(element, options, callback) {
    var isPassiveSupported = passiveEventsSupported();
    var rafId;
    var scrolled = false;
    var scroller = createScroller(element);
    var lastScrollY = scroller.scrollY();
    var details = {};

    function update() {
      var scrollY = Math.round(scroller.scrollY());
      var height = scroller.height();
      var scrollHeight = scroller.scrollHeight();

      // reuse object for less memory churn
      details.scrollY = scrollY;
      details.lastScrollY = lastScrollY;
      details.direction = scrollY > lastScrollY ? "down" : "up";
      details.distance = Math.abs(scrollY - lastScrollY);
      details.isOutOfBounds = scrollY < 0 || scrollY + height > scrollHeight;
      details.top = scrollY <= options.offset[details.direction];
      details.bottom = scrollY + height >= scrollHeight;
      details.toleranceExceeded =
        details.distance > options.tolerance[details.direction];

      callback(details);

      lastScrollY = scrollY;
      scrolled = false;
    }

    function handleScroll() {
      if (!scrolled) {
        scrolled = true;
        rafId = requestAnimationFrame(update);
      }
    }

    var eventOptions = isPassiveSupported
      ? { passive: true, capture: false }
      : false;

    element.addEventListener("scroll", handleScroll, eventOptions);
    update();

    return {
      destroy: function() {
        cancelAnimationFrame(rafId);
        element.removeEventListener("scroll", handleScroll, eventOptions);
      }
    };
  }

  function normalizeUpDown(t) {
    return t === Object(t) ? t : { down: t, up: t };
  }

  /**
   * UI enhancement for fixed headers.
   * Hides header when scrolling down
   * Shows header when scrolling up
   * @constructor
   * @param {DOMElement} elem the header element
   * @param {Object} options options for the widget
   */
  function Headroom(elem, options) {
    options = options || {};
    Object.assign(this, Headroom.options, options);
    this.classes = Object.assign({}, Headroom.options.classes, options.classes);

    this.elem = elem;
    this.tolerance = normalizeUpDown(this.tolerance);
    this.offset = normalizeUpDown(this.offset);
    this.initialised = false;
    this.frozen = false;
  }
  Headroom.prototype = {
    constructor: Headroom,

    /**
     * Start listening to scrolling
     * @public
     */
    init: function() {
      if (Headroom.cutsTheMustard && !this.initialised) {
        this.addClass("initial");
        this.initialised = true;

        // defer event registration to handle browser
        // potentially restoring previous scroll position
        setTimeout(
          function(self) {
            self.scrollTracker = trackScroll(
              self.scroller,
              { offset: self.offset, tolerance: self.tolerance },
              self.update.bind(self)
            );
          },
          100,
          this
        );
      }

      return this;
    },

    /**
     * Destroy the widget, clearing up after itself
     * @public
     */
    destroy: function() {
      this.initialised = false;
      Object.keys(this.classes).forEach(this.removeClass, this);
      this.scrollTracker.destroy();
    },

    /**
     * Unpin the element
     * @public
     */
    unpin: function() {
      if (this.hasClass("pinned") || !this.hasClass("unpinned")) {
        this.addClass("unpinned");
        this.removeClass("pinned");

        if (this.onUnpin) {
          this.onUnpin.call(this);
        }
      }
    },

    /**
     * Pin the element
     * @public
     */
    pin: function() {
      if (this.hasClass("unpinned")) {
        this.addClass("pinned");
        this.removeClass("unpinned");

        if (this.onPin) {
          this.onPin.call(this);
        }
      }
    },

    /**
     * Freezes the current state of the widget
     * @public
     */
    freeze: function() {
      this.frozen = true;
      this.addClass("frozen");
    },

    /**
     * Re-enables the default behaviour of the widget
     * @public
     */
    unfreeze: function() {
      this.frozen = false;
      this.removeClass("frozen");
    },

    top: function() {
      if (!this.hasClass("top")) {
        this.addClass("top");
        this.removeClass("notTop");

        if (this.onTop) {
          this.onTop.call(this);
        }
      }
    },

    notTop: function() {
      if (!this.hasClass("notTop")) {
        this.addClass("notTop");
        this.removeClass("top");

        if (this.onNotTop) {
          this.onNotTop.call(this);
        }
      }
    },

    bottom: function() {
      if (!this.hasClass("bottom")) {
        this.addClass("bottom");
        this.removeClass("notBottom");

        if (this.onBottom) {
          this.onBottom.call(this);
        }
      }
    },

    notBottom: function() {
      if (!this.hasClass("notBottom")) {
        this.addClass("notBottom");
        this.removeClass("bottom");

        if (this.onNotBottom) {
          this.onNotBottom.call(this);
        }
      }
    },

    shouldUnpin: function(details) {
      var scrollingDown = details.direction === "down";

      return scrollingDown && !details.top && details.toleranceExceeded;
    },

    shouldPin: function(details) {
      var scrollingUp = details.direction === "up";

      return (scrollingUp && details.toleranceExceeded) || details.top;
    },

    addClass: function(className) {
      this.elem.classList.add.apply(
        this.elem.classList,
        this.classes[className].split(" ")
      );
    },

    removeClass: function(className) {
      this.elem.classList.remove.apply(
        this.elem.classList,
        this.classes[className].split(" ")
      );
    },

    hasClass: function(className) {
      return this.classes[className].split(" ").every(function(cls) {
        return this.classList.contains(cls);
      }, this.elem);
    },

    update: function(details) {
      if (details.isOutOfBounds) {
        // Ignore bouncy scrolling in OSX
        return;
      }

      if (this.frozen === true) {
        return;
      }

      if (details.top) {
        this.top();
      } else {
        this.notTop();
      }

      if (details.bottom) {
        this.bottom();
      } else {
        this.notBottom();
      }

      if (this.shouldUnpin(details)) {
        this.unpin();
      } else if (this.shouldPin(details)) {
        this.pin();
      }
    }
  };

  /**
   * Default options
   * @type {Object}
   */
  Headroom.options = {
    tolerance: {
      up: 0,
      down: 0
    },
    offset: 0,
    scroller: isBrowser() ? window : null,
    classes: {
      frozen: "headroom--frozen",
      pinned: "headroom--pinned",
      unpinned: "headroom--unpinned",
      top: "headroom--top",
      notTop: "headroom--not-top",
      bottom: "headroom--bottom",
      notBottom: "headroom--not-bottom",
      initial: "headroom"
    }
  };

  Headroom.cutsTheMustard = isSupported();

  return Headroom;

}));

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAuanMiLCJub2RlX21vZHVsZXMvaGVhZHJvb20uanMvZGlzdC9oZWFkcm9vbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLy8gaWYgeW91J3JlIHVzaW5nIGEgYnVuZGxlciwgZmlyc3QgaW1wb3J0OlxubGV0IEhlYWRyb29tID0gIHJlcXVpcmUoXCJoZWFkcm9vbS5qc1wiKTtcbi8vIGdyYWIgYW4gZWxlbWVudFxudmFyIG15RWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucHJpbWFyeS1oZWFkZXJcIik7XG5sZXQgb3B0aW9ucyA9IHtcbiAgICBvZmZzZXQgOiAyMDBcbn1cbi8vIGNvbnN0cnVjdCBhbiBpbnN0YW5jZSBvZiBIZWFkcm9vbSwgcGFzc2luZyB0aGUgZWxlbWVudFxudmFyIGhlYWRyb29tICA9IG5ldyBIZWFkcm9vbShteUVsZW1lbnQsIG9wdGlvbnMpO1xuLy8gaW5pdGlhbGlzZVxuaGVhZHJvb20uaW5pdCgpOyIsIi8qIVxuICogaGVhZHJvb20uanMgdjAuMTIuMCAtIEdpdmUgeW91ciBwYWdlIHNvbWUgaGVhZHJvb20uIEhpZGUgeW91ciBoZWFkZXIgdW50aWwgeW91IG5lZWQgaXRcbiAqIENvcHlyaWdodCAoYykgMjAyMCBOaWNrIFdpbGxpYW1zIC0gaHR0cDovL3dpY2t5Lm5pbGxpYS5tcy9oZWFkcm9vbS5qc1xuICogTGljZW5zZTogTUlUXG4gKi9cblxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgdHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCkgOlxuICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoZmFjdG9yeSkgOlxuICAoZ2xvYmFsID0gZ2xvYmFsIHx8IHNlbGYsIGdsb2JhbC5IZWFkcm9vbSA9IGZhY3RvcnkoKSk7XG59KHRoaXMsIGZ1bmN0aW9uICgpIHsgJ3VzZSBzdHJpY3QnO1xuXG4gIGZ1bmN0aW9uIGlzQnJvd3NlcigpIHtcbiAgICByZXR1cm4gdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIjtcbiAgfVxuXG4gIC8qKlxuICAgKiBVc2VkIHRvIGRldGVjdCBicm93c2VyIHN1cHBvcnQgZm9yIGFkZGluZyBhbiBldmVudCBsaXN0ZW5lciB3aXRoIG9wdGlvbnNcbiAgICogQ3JlZGl0OiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvRXZlbnRUYXJnZXQvYWRkRXZlbnRMaXN0ZW5lclxuICAgKi9cbiAgZnVuY3Rpb24gcGFzc2l2ZUV2ZW50c1N1cHBvcnRlZCgpIHtcbiAgICB2YXIgc3VwcG9ydGVkID0gZmFsc2U7XG5cbiAgICB0cnkge1xuICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBnZXR0ZXItcmV0dXJuXG4gICAgICAgIGdldCBwYXNzaXZlKCkge1xuICAgICAgICAgIHN1cHBvcnRlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInRlc3RcIiwgb3B0aW9ucywgb3B0aW9ucyk7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInRlc3RcIiwgb3B0aW9ucywgb3B0aW9ucyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBzdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VwcG9ydGVkO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNTdXBwb3J0ZWQoKSB7XG4gICAgcmV0dXJuICEhKFxuICAgICAgaXNCcm93c2VyKCkgJiZcbiAgICAgIGZ1bmN0aW9uKCkge30uYmluZCAmJlxuICAgICAgXCJjbGFzc0xpc3RcIiBpbiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgJiZcbiAgICAgIE9iamVjdC5hc3NpZ24gJiZcbiAgICAgIE9iamVjdC5rZXlzICYmXG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgICApO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNEb2N1bWVudChvYmopIHtcbiAgICByZXR1cm4gb2JqLm5vZGVUeXBlID09PSA5OyAvLyBOb2RlLkRPQ1VNRU5UX05PREUgPT09IDlcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzV2luZG93KG9iaikge1xuICAgIC8vIGBvYmogPT09IHdpbmRvd2Agb3IgYG9iaiBpbnN0YW5jZW9mIFdpbmRvd2AgaXMgbm90IHN1ZmZpY2llbnQsXG4gICAgLy8gYXMgdGhlIG9iaiBtYXkgYmUgdGhlIHdpbmRvdyBvZiBhbiBpZnJhbWUuXG4gICAgcmV0dXJuIG9iaiAmJiBvYmouZG9jdW1lbnQgJiYgaXNEb2N1bWVudChvYmouZG9jdW1lbnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gd2luZG93U2Nyb2xsZXIod2luKSB7XG4gICAgdmFyIGRvYyA9IHdpbi5kb2N1bWVudDtcbiAgICB2YXIgYm9keSA9IGRvYy5ib2R5O1xuICAgIHZhciBodG1sID0gZG9jLmRvY3VtZW50RWxlbWVudDtcblxuICAgIHJldHVybiB7XG4gICAgICAvKipcbiAgICAgICAqIEBzZWUgaHR0cDovL2phbWVzLnBhZG9sc2V5LmNvbS9qYXZhc2NyaXB0L2dldC1kb2N1bWVudC1oZWlnaHQtY3Jvc3MtYnJvd3Nlci9cbiAgICAgICAqIEByZXR1cm4ge051bWJlcn0gdGhlIHNjcm9sbCBoZWlnaHQgb2YgdGhlIGRvY3VtZW50IGluIHBpeGVsc1xuICAgICAgICovXG4gICAgICBzY3JvbGxIZWlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gTWF0aC5tYXgoXG4gICAgICAgICAgYm9keS5zY3JvbGxIZWlnaHQsXG4gICAgICAgICAgaHRtbC5zY3JvbGxIZWlnaHQsXG4gICAgICAgICAgYm9keS5vZmZzZXRIZWlnaHQsXG4gICAgICAgICAgaHRtbC5vZmZzZXRIZWlnaHQsXG4gICAgICAgICAgYm9keS5jbGllbnRIZWlnaHQsXG4gICAgICAgICAgaHRtbC5jbGllbnRIZWlnaHRcbiAgICAgICAgKTtcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAgICogQHNlZSBodHRwOi8vYW5keWxhbmd0b24uY28udWsvYmxvZy9kZXZlbG9wbWVudC9nZXQtdmlld3BvcnQtc2l6ZS13aWR0aC1hbmQtaGVpZ2h0LWphdmFzY3JpcHRcbiAgICAgICAqIEByZXR1cm4ge051bWJlcn0gdGhlIGhlaWdodCBvZiB0aGUgdmlld3BvcnQgaW4gcGl4ZWxzXG4gICAgICAgKi9cbiAgICAgIGhlaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB3aW4uaW5uZXJIZWlnaHQgfHwgaHRtbC5jbGllbnRIZWlnaHQgfHwgYm9keS5jbGllbnRIZWlnaHQ7XG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgICAqIEdldHMgdGhlIFkgc2Nyb2xsIHBvc2l0aW9uXG4gICAgICAgKiBAcmV0dXJuIHtOdW1iZXJ9IHBpeGVscyB0aGUgcGFnZSBoYXMgc2Nyb2xsZWQgYWxvbmcgdGhlIFktYXhpc1xuICAgICAgICovXG4gICAgICBzY3JvbGxZOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHdpbi5wYWdlWU9mZnNldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIHdpbi5wYWdlWU9mZnNldDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAoaHRtbCB8fCBib2R5LnBhcmVudE5vZGUgfHwgYm9keSkuc2Nyb2xsVG9wO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBlbGVtZW50U2Nyb2xsZXIoZWxlbWVudCkge1xuICAgIHJldHVybiB7XG4gICAgICAvKipcbiAgICAgICAqIEByZXR1cm4ge051bWJlcn0gdGhlIHNjcm9sbCBoZWlnaHQgb2YgdGhlIGVsZW1lbnQgaW4gcGl4ZWxzXG4gICAgICAgKi9cbiAgICAgIHNjcm9sbEhlaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBNYXRoLm1heChcbiAgICAgICAgICBlbGVtZW50LnNjcm9sbEhlaWdodCxcbiAgICAgICAgICBlbGVtZW50Lm9mZnNldEhlaWdodCxcbiAgICAgICAgICBlbGVtZW50LmNsaWVudEhlaWdodFxuICAgICAgICApO1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICAgKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSBoZWlnaHQgb2YgdGhlIGVsZW1lbnQgaW4gcGl4ZWxzXG4gICAgICAgKi9cbiAgICAgIGhlaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBNYXRoLm1heChlbGVtZW50Lm9mZnNldEhlaWdodCwgZWxlbWVudC5jbGllbnRIZWlnaHQpO1xuICAgICAgfSxcblxuICAgICAgLyoqXG4gICAgICAgKiBHZXRzIHRoZSBZIHNjcm9sbCBwb3NpdGlvblxuICAgICAgICogQHJldHVybiB7TnVtYmVyfSBwaXhlbHMgdGhlIGVsZW1lbnQgaGFzIHNjcm9sbGVkIGFsb25nIHRoZSBZLWF4aXNcbiAgICAgICAqL1xuICAgICAgc2Nyb2xsWTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBlbGVtZW50LnNjcm9sbFRvcDtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlU2Nyb2xsZXIoZWxlbWVudCkge1xuICAgIHJldHVybiBpc1dpbmRvdyhlbGVtZW50KSA/IHdpbmRvd1Njcm9sbGVyKGVsZW1lbnQpIDogZWxlbWVudFNjcm9sbGVyKGVsZW1lbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBlbGVtZW50IEV2ZW50VGFyZ2V0XG4gICAqL1xuICBmdW5jdGlvbiB0cmFja1Njcm9sbChlbGVtZW50LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIHZhciBpc1Bhc3NpdmVTdXBwb3J0ZWQgPSBwYXNzaXZlRXZlbnRzU3VwcG9ydGVkKCk7XG4gICAgdmFyIHJhZklkO1xuICAgIHZhciBzY3JvbGxlZCA9IGZhbHNlO1xuICAgIHZhciBzY3JvbGxlciA9IGNyZWF0ZVNjcm9sbGVyKGVsZW1lbnQpO1xuICAgIHZhciBsYXN0U2Nyb2xsWSA9IHNjcm9sbGVyLnNjcm9sbFkoKTtcbiAgICB2YXIgZGV0YWlscyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgICAgdmFyIHNjcm9sbFkgPSBNYXRoLnJvdW5kKHNjcm9sbGVyLnNjcm9sbFkoKSk7XG4gICAgICB2YXIgaGVpZ2h0ID0gc2Nyb2xsZXIuaGVpZ2h0KCk7XG4gICAgICB2YXIgc2Nyb2xsSGVpZ2h0ID0gc2Nyb2xsZXIuc2Nyb2xsSGVpZ2h0KCk7XG5cbiAgICAgIC8vIHJldXNlIG9iamVjdCBmb3IgbGVzcyBtZW1vcnkgY2h1cm5cbiAgICAgIGRldGFpbHMuc2Nyb2xsWSA9IHNjcm9sbFk7XG4gICAgICBkZXRhaWxzLmxhc3RTY3JvbGxZID0gbGFzdFNjcm9sbFk7XG4gICAgICBkZXRhaWxzLmRpcmVjdGlvbiA9IHNjcm9sbFkgPiBsYXN0U2Nyb2xsWSA/IFwiZG93blwiIDogXCJ1cFwiO1xuICAgICAgZGV0YWlscy5kaXN0YW5jZSA9IE1hdGguYWJzKHNjcm9sbFkgLSBsYXN0U2Nyb2xsWSk7XG4gICAgICBkZXRhaWxzLmlzT3V0T2ZCb3VuZHMgPSBzY3JvbGxZIDwgMCB8fCBzY3JvbGxZICsgaGVpZ2h0ID4gc2Nyb2xsSGVpZ2h0O1xuICAgICAgZGV0YWlscy50b3AgPSBzY3JvbGxZIDw9IG9wdGlvbnMub2Zmc2V0W2RldGFpbHMuZGlyZWN0aW9uXTtcbiAgICAgIGRldGFpbHMuYm90dG9tID0gc2Nyb2xsWSArIGhlaWdodCA+PSBzY3JvbGxIZWlnaHQ7XG4gICAgICBkZXRhaWxzLnRvbGVyYW5jZUV4Y2VlZGVkID1cbiAgICAgICAgZGV0YWlscy5kaXN0YW5jZSA+IG9wdGlvbnMudG9sZXJhbmNlW2RldGFpbHMuZGlyZWN0aW9uXTtcblxuICAgICAgY2FsbGJhY2soZGV0YWlscyk7XG5cbiAgICAgIGxhc3RTY3JvbGxZID0gc2Nyb2xsWTtcbiAgICAgIHNjcm9sbGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGFuZGxlU2Nyb2xsKCkge1xuICAgICAgaWYgKCFzY3JvbGxlZCkge1xuICAgICAgICBzY3JvbGxlZCA9IHRydWU7XG4gICAgICAgIHJhZklkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGV2ZW50T3B0aW9ucyA9IGlzUGFzc2l2ZVN1cHBvcnRlZFxuICAgICAgPyB7IHBhc3NpdmU6IHRydWUsIGNhcHR1cmU6IGZhbHNlIH1cbiAgICAgIDogZmFsc2U7XG5cbiAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgaGFuZGxlU2Nyb2xsLCBldmVudE9wdGlvbnMpO1xuICAgIHVwZGF0ZSgpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgICAgICBjYW5jZWxBbmltYXRpb25GcmFtZShyYWZJZCk7XG4gICAgICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBoYW5kbGVTY3JvbGwsIGV2ZW50T3B0aW9ucyk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVVwRG93bih0KSB7XG4gICAgcmV0dXJuIHQgPT09IE9iamVjdCh0KSA/IHQgOiB7IGRvd246IHQsIHVwOiB0IH07XG4gIH1cblxuICAvKipcbiAgICogVUkgZW5oYW5jZW1lbnQgZm9yIGZpeGVkIGhlYWRlcnMuXG4gICAqIEhpZGVzIGhlYWRlciB3aGVuIHNjcm9sbGluZyBkb3duXG4gICAqIFNob3dzIGhlYWRlciB3aGVuIHNjcm9sbGluZyB1cFxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtET01FbGVtZW50fSBlbGVtIHRoZSBoZWFkZXIgZWxlbWVudFxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBvcHRpb25zIGZvciB0aGUgd2lkZ2V0XG4gICAqL1xuICBmdW5jdGlvbiBIZWFkcm9vbShlbGVtLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBIZWFkcm9vbS5vcHRpb25zLCBvcHRpb25zKTtcbiAgICB0aGlzLmNsYXNzZXMgPSBPYmplY3QuYXNzaWduKHt9LCBIZWFkcm9vbS5vcHRpb25zLmNsYXNzZXMsIG9wdGlvbnMuY2xhc3Nlcyk7XG5cbiAgICB0aGlzLmVsZW0gPSBlbGVtO1xuICAgIHRoaXMudG9sZXJhbmNlID0gbm9ybWFsaXplVXBEb3duKHRoaXMudG9sZXJhbmNlKTtcbiAgICB0aGlzLm9mZnNldCA9IG5vcm1hbGl6ZVVwRG93bih0aGlzLm9mZnNldCk7XG4gICAgdGhpcy5pbml0aWFsaXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuZnJvemVuID0gZmFsc2U7XG4gIH1cbiAgSGVhZHJvb20ucHJvdG90eXBlID0ge1xuICAgIGNvbnN0cnVjdG9yOiBIZWFkcm9vbSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0IGxpc3RlbmluZyB0byBzY3JvbGxpbmdcbiAgICAgKiBAcHVibGljXG4gICAgICovXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoSGVhZHJvb20uY3V0c1RoZU11c3RhcmQgJiYgIXRoaXMuaW5pdGlhbGlzZWQpIHtcbiAgICAgICAgdGhpcy5hZGRDbGFzcyhcImluaXRpYWxcIik7XG4gICAgICAgIHRoaXMuaW5pdGlhbGlzZWQgPSB0cnVlO1xuXG4gICAgICAgIC8vIGRlZmVyIGV2ZW50IHJlZ2lzdHJhdGlvbiB0byBoYW5kbGUgYnJvd3NlclxuICAgICAgICAvLyBwb3RlbnRpYWxseSByZXN0b3JpbmcgcHJldmlvdXMgc2Nyb2xsIHBvc2l0aW9uXG4gICAgICAgIHNldFRpbWVvdXQoXG4gICAgICAgICAgZnVuY3Rpb24oc2VsZikge1xuICAgICAgICAgICAgc2VsZi5zY3JvbGxUcmFja2VyID0gdHJhY2tTY3JvbGwoXG4gICAgICAgICAgICAgIHNlbGYuc2Nyb2xsZXIsXG4gICAgICAgICAgICAgIHsgb2Zmc2V0OiBzZWxmLm9mZnNldCwgdG9sZXJhbmNlOiBzZWxmLnRvbGVyYW5jZSB9LFxuICAgICAgICAgICAgICBzZWxmLnVwZGF0ZS5iaW5kKHNlbGYpXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgMTAwLFxuICAgICAgICAgIHRoaXNcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgdGhlIHdpZGdldCwgY2xlYXJpbmcgdXAgYWZ0ZXIgaXRzZWxmXG4gICAgICogQHB1YmxpY1xuICAgICAqL1xuICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5pbml0aWFsaXNlZCA9IGZhbHNlO1xuICAgICAgT2JqZWN0LmtleXModGhpcy5jbGFzc2VzKS5mb3JFYWNoKHRoaXMucmVtb3ZlQ2xhc3MsIHRoaXMpO1xuICAgICAgdGhpcy5zY3JvbGxUcmFja2VyLmRlc3Ryb3koKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVW5waW4gdGhlIGVsZW1lbnRcbiAgICAgKiBAcHVibGljXG4gICAgICovXG4gICAgdW5waW46IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuaGFzQ2xhc3MoXCJwaW5uZWRcIikgfHwgIXRoaXMuaGFzQ2xhc3MoXCJ1bnBpbm5lZFwiKSkge1xuICAgICAgICB0aGlzLmFkZENsYXNzKFwidW5waW5uZWRcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoXCJwaW5uZWRcIik7XG5cbiAgICAgICAgaWYgKHRoaXMub25VbnBpbikge1xuICAgICAgICAgIHRoaXMub25VbnBpbi5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBpbiB0aGUgZWxlbWVudFxuICAgICAqIEBwdWJsaWNcbiAgICAgKi9cbiAgICBwaW46IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuaGFzQ2xhc3MoXCJ1bnBpbm5lZFwiKSkge1xuICAgICAgICB0aGlzLmFkZENsYXNzKFwicGlubmVkXCIpO1xuICAgICAgICB0aGlzLnJlbW92ZUNsYXNzKFwidW5waW5uZWRcIik7XG5cbiAgICAgICAgaWYgKHRoaXMub25QaW4pIHtcbiAgICAgICAgICB0aGlzLm9uUGluLmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRnJlZXplcyB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgd2lkZ2V0XG4gICAgICogQHB1YmxpY1xuICAgICAqL1xuICAgIGZyZWV6ZTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmZyb3plbiA9IHRydWU7XG4gICAgICB0aGlzLmFkZENsYXNzKFwiZnJvemVuXCIpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZS1lbmFibGVzIHRoZSBkZWZhdWx0IGJlaGF2aW91ciBvZiB0aGUgd2lkZ2V0XG4gICAgICogQHB1YmxpY1xuICAgICAqL1xuICAgIHVuZnJlZXplOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZnJvemVuID0gZmFsc2U7XG4gICAgICB0aGlzLnJlbW92ZUNsYXNzKFwiZnJvemVuXCIpO1xuICAgIH0sXG5cbiAgICB0b3A6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLmhhc0NsYXNzKFwidG9wXCIpKSB7XG4gICAgICAgIHRoaXMuYWRkQ2xhc3MoXCJ0b3BcIik7XG4gICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoXCJub3RUb3BcIik7XG5cbiAgICAgICAgaWYgKHRoaXMub25Ub3ApIHtcbiAgICAgICAgICB0aGlzLm9uVG9wLmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgbm90VG9wOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghdGhpcy5oYXNDbGFzcyhcIm5vdFRvcFwiKSkge1xuICAgICAgICB0aGlzLmFkZENsYXNzKFwibm90VG9wXCIpO1xuICAgICAgICB0aGlzLnJlbW92ZUNsYXNzKFwidG9wXCIpO1xuXG4gICAgICAgIGlmICh0aGlzLm9uTm90VG9wKSB7XG4gICAgICAgICAgdGhpcy5vbk5vdFRvcC5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIGJvdHRvbTogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIXRoaXMuaGFzQ2xhc3MoXCJib3R0b21cIikpIHtcbiAgICAgICAgdGhpcy5hZGRDbGFzcyhcImJvdHRvbVwiKTtcbiAgICAgICAgdGhpcy5yZW1vdmVDbGFzcyhcIm5vdEJvdHRvbVwiKTtcblxuICAgICAgICBpZiAodGhpcy5vbkJvdHRvbSkge1xuICAgICAgICAgIHRoaXMub25Cb3R0b20uY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBub3RCb3R0b206IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLmhhc0NsYXNzKFwibm90Qm90dG9tXCIpKSB7XG4gICAgICAgIHRoaXMuYWRkQ2xhc3MoXCJub3RCb3R0b21cIik7XG4gICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoXCJib3R0b21cIik7XG5cbiAgICAgICAgaWYgKHRoaXMub25Ob3RCb3R0b20pIHtcbiAgICAgICAgICB0aGlzLm9uTm90Qm90dG9tLmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgc2hvdWxkVW5waW46IGZ1bmN0aW9uKGRldGFpbHMpIHtcbiAgICAgIHZhciBzY3JvbGxpbmdEb3duID0gZGV0YWlscy5kaXJlY3Rpb24gPT09IFwiZG93blwiO1xuXG4gICAgICByZXR1cm4gc2Nyb2xsaW5nRG93biAmJiAhZGV0YWlscy50b3AgJiYgZGV0YWlscy50b2xlcmFuY2VFeGNlZWRlZDtcbiAgICB9LFxuXG4gICAgc2hvdWxkUGluOiBmdW5jdGlvbihkZXRhaWxzKSB7XG4gICAgICB2YXIgc2Nyb2xsaW5nVXAgPSBkZXRhaWxzLmRpcmVjdGlvbiA9PT0gXCJ1cFwiO1xuXG4gICAgICByZXR1cm4gKHNjcm9sbGluZ1VwICYmIGRldGFpbHMudG9sZXJhbmNlRXhjZWVkZWQpIHx8IGRldGFpbHMudG9wO1xuICAgIH0sXG5cbiAgICBhZGRDbGFzczogZnVuY3Rpb24oY2xhc3NOYW1lKSB7XG4gICAgICB0aGlzLmVsZW0uY2xhc3NMaXN0LmFkZC5hcHBseShcbiAgICAgICAgdGhpcy5lbGVtLmNsYXNzTGlzdCxcbiAgICAgICAgdGhpcy5jbGFzc2VzW2NsYXNzTmFtZV0uc3BsaXQoXCIgXCIpXG4gICAgICApO1xuICAgIH0sXG5cbiAgICByZW1vdmVDbGFzczogZnVuY3Rpb24oY2xhc3NOYW1lKSB7XG4gICAgICB0aGlzLmVsZW0uY2xhc3NMaXN0LnJlbW92ZS5hcHBseShcbiAgICAgICAgdGhpcy5lbGVtLmNsYXNzTGlzdCxcbiAgICAgICAgdGhpcy5jbGFzc2VzW2NsYXNzTmFtZV0uc3BsaXQoXCIgXCIpXG4gICAgICApO1xuICAgIH0sXG5cbiAgICBoYXNDbGFzczogZnVuY3Rpb24oY2xhc3NOYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5jbGFzc2VzW2NsYXNzTmFtZV0uc3BsaXQoXCIgXCIpLmV2ZXJ5KGZ1bmN0aW9uKGNscykge1xuICAgICAgICByZXR1cm4gdGhpcy5jbGFzc0xpc3QuY29udGFpbnMoY2xzKTtcbiAgICAgIH0sIHRoaXMuZWxlbSk7XG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24oZGV0YWlscykge1xuICAgICAgaWYgKGRldGFpbHMuaXNPdXRPZkJvdW5kcykge1xuICAgICAgICAvLyBJZ25vcmUgYm91bmN5IHNjcm9sbGluZyBpbiBPU1hcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5mcm96ZW4gPT09IHRydWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGV0YWlscy50b3ApIHtcbiAgICAgICAgdGhpcy50b3AoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubm90VG9wKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChkZXRhaWxzLmJvdHRvbSkge1xuICAgICAgICB0aGlzLmJvdHRvbSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5ub3RCb3R0b20oKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuc2hvdWxkVW5waW4oZGV0YWlscykpIHtcbiAgICAgICAgdGhpcy51bnBpbigpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnNob3VsZFBpbihkZXRhaWxzKSkge1xuICAgICAgICB0aGlzLnBpbigpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGVmYXVsdCBvcHRpb25zXG4gICAqIEB0eXBlIHtPYmplY3R9XG4gICAqL1xuICBIZWFkcm9vbS5vcHRpb25zID0ge1xuICAgIHRvbGVyYW5jZToge1xuICAgICAgdXA6IDAsXG4gICAgICBkb3duOiAwXG4gICAgfSxcbiAgICBvZmZzZXQ6IDAsXG4gICAgc2Nyb2xsZXI6IGlzQnJvd3NlcigpID8gd2luZG93IDogbnVsbCxcbiAgICBjbGFzc2VzOiB7XG4gICAgICBmcm96ZW46IFwiaGVhZHJvb20tLWZyb3plblwiLFxuICAgICAgcGlubmVkOiBcImhlYWRyb29tLS1waW5uZWRcIixcbiAgICAgIHVucGlubmVkOiBcImhlYWRyb29tLS11bnBpbm5lZFwiLFxuICAgICAgdG9wOiBcImhlYWRyb29tLS10b3BcIixcbiAgICAgIG5vdFRvcDogXCJoZWFkcm9vbS0tbm90LXRvcFwiLFxuICAgICAgYm90dG9tOiBcImhlYWRyb29tLS1ib3R0b21cIixcbiAgICAgIG5vdEJvdHRvbTogXCJoZWFkcm9vbS0tbm90LWJvdHRvbVwiLFxuICAgICAgaW5pdGlhbDogXCJoZWFkcm9vbVwiXG4gICAgfVxuICB9O1xuXG4gIEhlYWRyb29tLmN1dHNUaGVNdXN0YXJkID0gaXNTdXBwb3J0ZWQoKTtcblxuICByZXR1cm4gSGVhZHJvb207XG5cbn0pKTtcbiJdfQ==
