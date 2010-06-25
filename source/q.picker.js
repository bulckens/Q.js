/*
 * Q.Picker 0.1.1
 *
 * Copyright (c) 2010 Boys Abroad (Wout Fierens)
 *
 * Licensed under the MIT (http://opensource.org/licenses/mit-license.php) license.
 */

if (typeof Q == 'undefined')
  alert("Q is not loaded. Please make sure that your page includes q.js before it includes q.picker.js");

Q.Picker = Class.create(Q.Base, {
  initialize: function($super, input, options) {
    $super(input);
    
    if (typeof options == "string" && options.isJSON())
      options = options.evalJSON();
    
    // merge user options, Q.Slider options and Q default options
    this.options = $H(this.options).merge({
      holderStyle: {
        position: "absolute" },
      // offset corretion
      offset: { left: 0, top: 0 }
    }).merge(options).toObject();
    
    // init static vars
    this.picking = false;
    
    // register subclass
    Q.register('picker');
    
    // attach colorpicker to a given field or else to any field with a given or the default class
    if (!this.input)
      alert("Q.Picker Error: No input was defined to attach the Picker to!");
    else
      this.build();
  },
  // add control
  build: function() {
    var paper   = new Element("div"),
        color   = this.options.value || this.input.value,
        holder;
    
    this.size   = this.options.size || 200;
    if (this.size < 75)
      this.size = 75;
    else if (this.size > 500)
      this.size = 500;
    
    if (!(holder = $(this.options.div))) {
      holder = this.createHolder("plain")
        .down("div.q-background")
        .center;
    }
    holder
      .insert(paper
        .setStyle({ width: this.size + "px", height: this.size + "px" }));
    
    this.zoom   = this.size / 200;
    this.paper  = Raphael(paper, this.size, this.size);
    this.mode   = null;
    this.sb_box = {
      x:      35  * this.zoom,
      y:      25  * this.zoom,
      width:  130 * this.zoom,
      height: 112 * this.zoom };
    
    // first create the wheel
    this.buildColorwheel();
    // than the triangle
    this.buildTriangle();
    
    // initialize color
    switch(this.identify(color)) {
      case "hex": this.setHex(color); break;
      case "rgb": this.setRgb(color); break;
      case "hsb": this.setHsb(color); break;
      default: this.setHsb({ h:0, s:100, b:100 }); break;
    }
    
    // behavior
    
    // mouse down event
    holder.observe("mousedown", (function(event) {
      event.preventDefault ? event.preventDefault() : event.returnValue = false;
      this.picking = true;
      
      this.onMouseDown(
        Event.pointerX(event) - this.offset(holder).x,
        Event.pointerY(event) - this.offset(holder).y,
        event.target);
    }).bind(this));
    
    // mousemove event
    document.observe("mousemove", (function(event) {
      if (this.picking) {
        event.preventDefault ? event.preventDefault() : event.returnValue = false;
        
        this.onMouseMove(
          Event.pointerX(event) - this.offset(holder).x,
          Event.pointerY(event) - this.offset(holder).y,
          event.target);
      }
    }).bind(this));
    
    // mouseup event
    document.observe("mouseup", (function(event) {
      if (this.picking) {
        event.preventDefault ? event.preventDefault() : event.returnValue = false;
        
        this.picking = false;
        
        this.onMouseUp(
          Event.pointerX(event) - this.offset(holder).x,
          Event.pointerY(event) - this.offset(holder).y,
          event.target);
      }
    }).bind(this));
    
    $w("Open Pick Change Close").each((function(e) {
      this["on" + e] = function() {
        var hex = this.getHex(this.hsb);
        
        Q.callback("on" + e, this, hex);
        
        this.input.setValue(hex);
      }
    }).bind(this));
    
    this.input.observe("focus", (function() {
      this.onOpen(this.hsb, this);
    }).bind(this));
    
    this.input.observe("blur", (function() {
      this.onClose(this.hsb, this);
    }).bind(this));
    
    this.input.observe("change", (function() {
      this.setHex(this.input.value);
    }).bind(this));
  },
  // set mode
  setMode: function(mode) {
    this.mode = mode || null;
  },
  // build the color wheel
  buildColorwheel: function() {
    var wheel;
    
    wheel = this.paper.image(Q.imagePath + "/colorwheel.png", 0, 0, this.size, this.size);
    wheel.id  = "wheel";
    Event.observe(wheel.node, "mousedown", (function() { this.setMode("hue"); }).bind(this));
    
    this.hue_picker = this.buildPicker(14, "hue");
    this.hue_picker.translate(this.size / 2, 8.5 * this.zoom);
  },
  // build a triagle with gradient
  buildTriangle: function() {
    // calculate the triangle points
    var points = [],
        r = 75 * this.zoom,
        part = 120,
        tri, gradient, box, hit;
    (3).times(function(i) {
      var a = i * part - 90,
          x = r * Math.cos(a * Math.PI / 180),
          y = r * Math.sin(a * Math.PI / 180);
      points.push((i == 0 ? "M" : "L") + x + "," + y);
    });
    points.push("Z");
    
    // create a triangle set
    this.triangle = this.paper.set();
    
    // create triangle
    tri = this.paper
      .path(points.join(" "))
      .translate(this.size / 2, this.size / 2 + 0.45 * this.zoom)
      .scale(0.985, 0.985, this.size / 2, this.size / 2)
      .attr({ fill: "#f00", "stroke-width": 0 })
      .toBack();
    this.triangle.push(tri);
    
    // create dots at points
    $w("#f00 #000 #fff").each((function(color, i) {
      var c = this.paper.circle(this.size / 2, 25 * this.zoom, 7 * this.zoom)
        .attr({ fill: color, "stroke-width": 0 })
        .rotate(120 * i, this.size / 2, this.size / 2)
        .toFront();
      if (i == 0)
        this.triangle.push(c);
    }).bind(this));
    
    // create hitarea
    hit = this.paper
      .circle(this.size / 2, this.size / 2, 80 * this.zoom)
      .attr({ fill: "#f00", "stroke-width": 0, opacity: 0 });
    Event.observe(hit.node, "mousedown", (function() { this.setMode("sb"); }).bind(this));
    
    // add saturation / brightness marker
    this.sb_picker = this.buildPicker(12, "sb");
    this.sb_picker.translate(this.size / 2, 25 * this.zoom)
  },
  // build a picker
  buildPicker: function(size, mode) {
    var light = this.paper.circle(0, 0, size / 2 * this.zoom)
          .attr({ "stroke-width": 3 * this.zoom, stroke: "#fff", "stroke-opacity": 0.8 }),
        dark = this.paper.circle(0, 0, size / 3 * this.zoom)
          .attr({ "stroke-width": 1 * this.zoom, stroke: "#333", "stroke-opacity": 0.8 }),
        set = this.paper.set();
    // events
    Event.observe(light.node, "mousedown", (function() { this.setMode(mode); }).bind(this));
    Event.observe(dark.node,  "mousedown", (function() { this.setMode(mode); }).bind(this));
    // put both in a set
    set.push(light, dark);
    return set;
  },
  // mousedown behavior
  onMouseDown: function(x, y, target) {
    switch(this.mode) {
      case "hue":
        this.changeHue(x, y);
      break;
      case "sb":
        this.changeSB(x, y);
      break;
    }
  },
  // mousemove behavior
  onMouseMove: function(x, y, target) {
    switch(this.mode) {
      case "hue":
        this.changeHue(x, y);
      break;
      case "sb":
        this.changeSB(x, y);
      break;
    }
  },
  // mouseup behavior
  onMouseUp: function(x, y, target) {
    if (this.mode)
      this.onChange();
    this.setMode();
  },
  // rotate triangle and set the hue
  changeHue: function(x, y) {
    x -= this.size / 2;
    y -= this.size / 2;
        // determine the length of the hypotinuse (hyp) for x and y
    var hyp = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)),
        // change value of the mouse x position into a cosine by dividing it by the hyp
        cos = x / hyp,
        // covert the cos into an angle in radians
        rad = Math.acos(cos),
        deg = Math.floor(180/(Math.PI / rad));
    // compensate for a negative angle
    if (y < 0)
      deg = -deg;
    else if ((Math.floor(y) == 0) && (x < 0))
      deg = 180;
    deg += 90;
    // apply the value
    this.setHue(deg);
    this.applyValue({ h: deg, s: this.hsb.s, b: this.hsb.b });
    this.onPick();
  },
  // set the picker's hue value
  setHue: function(hue) {
    // reposition the hue picker
    this.hue_picker.rotate(hue, this.size / 2, this.size / 2);
    // set the color of the triangle
    this.triangle.attr({ fill: this.hsbToHex({ h: hue, s: 100, b: 100 }) });
  },
  // change the saturation and brightness
  changeSB: function(x, y) {
    // restrict saturation brightness slider to triangle
    var box, pct, sat, bgt, half, left, right;
    box = this.sb_box;
    // restrict to the box
    if (x < box.x)              x = box.x;
    if (x > box.x + box.width)  x = box.x + box.width;
    if (y < box.y)              y = box.y;
    if (y > box.y + box.height) y = box.y + box.height;
    // restrict to triangle
    pct   = (y - box.y) / box.height;
    half  = box.width / 2;
    left  = box.x + half - (half * pct);
    right = box.x + half + half * pct;
    if (x < left)   x = left;
    if (x > right)  x = right;
    // update picker
    this.sb_picker.attr({ cx: x, cy: y });
    // calculate saturation and brightness
    sat = Math.abs(-100 + pct * 100);
    brt = Math.abs(-100 + (((x - box.x) + pct * half) - half) / box.width * 100);
    // apply the value
    this.applyValue({ h: this.hsb.h, s: sat, b: brt });
    this.onPick();
  },
  // set the picker's saturation and brightness value
  setSB: function(sat, brt) {
    var n_sat = Math.abs(-100 + sat),
        n_brt = Math.abs(-100 + brt),
        half  = this.sb_box.width / 2,
        width = this.sb_box.width / 100 * n_sat,
        x_off = this.sb_box.x + half / 100 * sat,
        point = (brt - sat) / (100 - sat) * width,
        x     = x_off + width - (point || 0),
        y     = this.sb_box.y + n_sat / 100 * this.sb_box.height;
    this.sb_picker.attr({ cx: x, cy: y });
  },
  // apply the value
  applyValue: function(hsb) {
    this.hsb = hsb;
    var hex  = this.getHex();
    this.input
      .setValue(hex)
      .setStyle({ backgroundColor: hex, color: this.getTextColor(hsb) });
  },
  
  //////////////////////////////////////////
  // public API
  //////////////////////////////////////////
  setValue: function(hsb) {
    if (typeof hsb != "string") {
      this.setHue(hsb.h);
      this.setSB(hsb.s, hsb.b);
      this.applyValue(hsb);
    }
  },
  // set the value by hex
  setHex: function(hex) {
    this.setValue(this.hexToHsb(hex));
  },
  // set the value by rgb
  setRgb: function(rgb) {
    this.setValue(this.rgbToHsb(rgb));
  },
  // set the value by hsb
  setHsb: function(hsb) {
    this.setValue(hsb);
  },
  // get the picked color in hex
  getHex: function() {
    return this.rgbToHex(this.hsbToRgb(this.hsb));
  },
  // get the picked color in rgb
  getRgb: function() {
    return this.hsbToRgb(this.hsb);
  },
  // get the picked color in hsb
  getHsb: function() {
    return this.hsb;
  },
  // return a contrasting text according to the true brightness of a given color
  getTextColor: function(hsb) {
    var rgb = this.hsbToRgb(hsb),
        brt = (rgb.r / 255 * 0.30) + (rgb.g / 255 * 0.59) + (rgb.b / 255 * 0.11);
    if (brt < 0.5) {
      var m = Math.floor(brt * 20) + 3;
      var im = 255 * (m - 1);
    } else {
      var m = Math.floor((1.0 - brt) * 20) + 3;
      var im = 0;
    }
    return this.rgbToHex({
      r: Math.floor((rgb.r + im) / m),
      g: Math.floor((rgb.g + im) / m),
      b: Math.floor((rgb.b + im) / m)
    });
  },
  
  //////////////////////////////////////////
  // helpers
  //////////////////////////////////////////
  // calculate object offset
  offset: function(element) {
    var pos = $(this.options.div || element).cumulativeOffset(),
        off = { x: pos.left, y: pos.top },
        scroll;
    
    // take border offset into account if on IE
    if (Prototype.Browser.IE && typeof this.options.div == "undefined" && Prototype.BrowserFeatures.version < 8) {
      off.x -= 12;
      off.y -= 12;
    }
    
    // calculate scrolloffset if with fixed postion
    if (this.options.position == 'fixed') {
      scroll = document.viewport.getScrollOffsets();
      off.x += scroll.left;
      off.y += scroll.top;
    }
    
    return off;
  },
  // convert a hsb object to rgb
  hsbToRgb: function(hsb) {
    // process brightness
    var v = this.toNumber(hsb.b);
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    v = v * 255 / 100;
    // process saturation
    var s = this.toNumber(hsb.s);
    //if (s <= 0) {
    //  v = Math.floor(v + 0.5);
    //  return { r:v, g:v, b:v };
    //}
    if (s > 100) s = 100;
    // process hue
    var h = this.toNumber(hsb.h);
    h = h % 360;
    if (h < 0) h += 360;
    // compile rgb
    var vs = v * s / 100;
    var vsf = (vs * ((h * 256 / 60) % 256)) / 256;
    var r, g, b;
    switch (Math.floor(h / 60)) {
      case 0: r = v;        g = v-vs+vsf; b = v-vs;     break;
      case 1: r = v-vsf;    g = v;        b = v-vs;     break;
      case 2: r = v-vs;     g = v;        b = v-vs+vsf; break;
      case 3: r = v-vs;     g = v-vsf;    b = v;        break;
      case 4: r = v-vs+vsf; g = v-vs;     b = v;        break;
      case 5: r = v;        g = v-vs;     b = v-vsf;    break;
    }
    r = Math.floor(r + 0.5);
    g = Math.floor(g + 0.5);
    b = Math.floor(b + 0.5);
    // return conversion
    return this.normalize({ r: r, g: g, b: b });
  },
  // convert a hsb object to hex
  hsbToHex: function(hsb) {
    return this.rgbToHex(this.hsbToRgb(hsb));
  },
  // convert a rgb object to hsb
  rgbToHsb: function(rgb) {
    var r = Math.floor(this.toNumber(rgb.r) + 0.5);
    var g = Math.floor(this.toNumber(rgb.g) + 0.5);
    var b = Math.floor(this.toNumber(rgb.b) + 0.5);
    if (r < 0) r = 0;
    if (r > 255) r = 255;
    if (g < 0) g = 0;
    if (g > 255) g = 255;
    if (b < 0) b = 0;
    if (b > 255) b = 255;

    var max, delta, diff, offset;
    var h = r, s = g, v = b;

    if (r > g) {
      if (r > b) v = max = r, offset =   0, diff = g - b;
      else       v = max = b, offset = 240, diff = r - g;
      delta = max - ((g < b) ? g : b);
    }
    else {
      if (g > b) v = max = g, offset = 120, diff = b - r;
      else       v = max = b, offset = 240, diff = r - g;
      delta = max - ((r < b) ? r : b);
    }

    if (max != 0) s = Math.floor((delta * 100) / max + 0.5);
    else s = 0;

    if (s != 0) {
      h = (offset + Math.floor(diff * 120 / (delta * 2) + 0.5)) % 360;
      if (h < 0) h += 360;
    }
    else h = 0;
    
    v = Math.floor(v * 100 / 255 + 0.5);
    
    return this.normalize({ h: h, s: s, b: v });
  },
  // convert a rgb object to hex
  rgbToHex: function(rgb) {
    rgb = this.normalize(rgb);
    return "#" + rgb.r.toColorPart() + rgb.g.toColorPart() + rgb.b.toColorPart();
  },
  // convert hex string to rgb object
  hexToRgb: function(hex) {
    var m;
    // Six-to-eight hex values.  Treat as RRGGBB, RRGGBBA, or RRGGBBAA
    if (m = /^[^0-9A-Fa-f]*([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{0,2})(?:[^0-9A-Fa-f]|$)/.exec(hex))
      return { r:parseInt(m[1], 16), g:parseInt(m[2], 16), b:parseInt(m[3],16) };
      
    // Five hex values.  Treat as RRGGB
    if (m = /^[^0-9A-Fa-f]*([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f])(?:[^0-9A-Fa-f]|$)/.exec(hex)) {
      var b = parseInt(m[3], 16);
      return { r:parseInt(m[1], 16), g:parseInt(m[2], 16), b:b*16+b };
    }
    
    // Four hex values.  Treat as RRGG, B=G
    if (m = /^[^0-9A-Fa-f]*([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})(?:[^0-9A-Fa-f]|$)/.exec(hex)) {
      var g = parseInt(m[2], 16);
      return { r:parseInt(m[1], 16), g:g, b:g };
    }
    
    // Three hex values.  Treat as RGB
    if (m = /^[^0-9A-Fa-f]*([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f]{0,2})(?:[^0-9A-Fa-f]|$)/.exec(hex)) {
      var r = parseInt(m[1], 16);
      var g = parseInt(m[2], 16);
      var b = parseInt(m[3], 16);
      return { r:r*16+r, g:g*16+g, b:b*16+b };
    }
    
    // Two hex values.  Treat as 8-bit grayscale
    if (m = /^[^0-9A-Fa-f]*([0-9A-Fa-f]{2})(?:[^0-9A-Fa-f]|$)/.exec(hex)) {
      var g = parseInt(m[1], 16);
      return { r:g, g:g, b:g };
    }

    // One hex value.  Treat as 4-bit grayscale
    if (m = /^[^0-9A-Fa-f]*([0-9A-Fa-f])(?:[^0-9A-Fa-f]|$)/.exec(hex)) {
      var g = parseInt(m[1], 16);
      g = g * 16 + g;
      return { r:g, g:g, b:g };
    }
    // if none matched, return false
    return false;
  },
  // convert a hex string to a hsb object
  hexToHsb: function(hex) {
    return this.rgbToHsb(this.hexToRgb(hex));
  },
  // convert any type of given data to a number
  toNumber: function(data) {
    switch (typeof data) {
      case "number":
        return data;
      break;
      case "string":
        if (m = /^[^0-9.+-]*([+-]?(?:[0-9]*\.[0-9]+|[0-9]+(?:\.[0-9]*)?))(?:[^0-9]|$)/.exec(data))
          return Number(m[1]);
        else return 0;
      break;
      case "boolean":
        return data ? 1 : 0;
      break;
      case "object":
        return data ? 1 : 0;
      break;
      case "function":
        return 1;
      break;
      default:
      case "undefined":
        return 0;
      break;
    }
  },
  // normalize a color
  normalize: function(color) {
    switch(this.identify(color)) {
      case "rgb":
        var rgb = color;
        rgb.r = this.toNumber(rgb.r);
        rgb.g = this.toNumber(rgb.g);
        rgb.b = this.toNumber(rgb.b);
        if (rgb.r < 0)    rgb.r = 0;
        if (rgb.r > 255)  rgb.r = 255;
        if (rgb.g < 0)    rgb.g = 0;
        if (rgb.g > 255)  rgb.g = 255;
        if (rgb.b < 0)    rgb.b = 0;
        if (rgb.b > 255)  rgb.b = 255;
        return rgb;
      break;
      case "hsb":
        var hsb = color;
        hsb.h = this.toNumber(hsb.h);
        hsb.s = this.toNumber(hsb.s);
        hsb.b = this.toNumber(hsb.b);
        if (hsb.h < 0)    hsb.h += 360;
        if (hsb.h > 360)  hsb.h -= 360;
        if (hsb.s < 0)    hsb.s = 0;
        if (hsb.s > 100)  hsb.s = 100;
        if (hsb.b < 0)    hsb.b = 0;
        if (hsb.b > 100)  hsb.b = 100;
        return hsb;
      break;
      default:
        return color;
      break;
    }
  },
  // detect color type
  identify: function(data) {
    switch (typeof data) {
      case "string":
        if (m = data.match(/^#([A-Fa-f0-9]{2,8})$/))
          return "hex";
      break;
      case "object":
        if ((data.r === 0 || data.r) && (data.g === 0 || data.g) && (data.b === 0 || data.b))
          return "rgb";
        if ((data.h === 0 || data.h) && (data.s === 0 || data.s) && (data.b === 0 || data.b))
          return "hsb";
      break;
    }
  }
});
