/* Section location follows a stable reading line. Scroll uses cached positions. */
(function(){
  'use strict';
  var navs=Array.from(document.querySelectorAll('.review-section-nav,.therapies-guide nav'));
  navs.forEach(function(nav){
    var links=Array.from(nav.querySelectorAll('a[href^="#"]'));
    var targets=links.map(function(a){return document.getElementById(a.getAttribute('href').slice(1));});
    var tops=[],line=150,raf=0,dirty=true,current=null;
    function active(target){if(current===target)return;current=target;links.forEach(function(a,i){if(targets[i]===target)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
    // Reveal transforms are visual only; anchors must use their stable layout position.
    function layoutTop(target){var top=0;for(var node=target;node;node=node.offsetParent)top+=node.offsetTop;return top;}
    function update(){
      raf=0;
      if(dirty){
        var header=document.querySelector('header'),sectionNav=document.querySelector('.review-section-nav');
        line=(header?header.offsetHeight:72)+(sectionNav?sectionNav.offsetHeight:0)+22;
        if(targets[0])line=Math.max(line,(parseFloat(getComputedStyle(targets[0]).scrollMarginTop)||0)+2);
        tops=targets.map(function(t){return t?layoutTop(t):Infinity;});dirty=false;
      }
      var position=window.scrollY+line,chosen=targets[0];
      for(var i=0;i<targets.length;i++){if(tops[i]<=position)chosen=targets[i];else break;}
      active(chosen);
    }
    function wake(){if(!raf)raf=requestAnimationFrame(update);}
    function measure(){dirty=true;wake();}
    links.forEach(function(a,i){a.addEventListener('click',function(){active(targets[i]);});});
    window.addEventListener('scroll',wake,{passive:true});window.addEventListener('resize',measure,{passive:true});
    document.addEventListener('load',measure,true);document.addEventListener('toggle',measure,true);
    if(document.fonts)document.fonts.ready.then(measure);
    if(window.ResizeObserver){var observer=new ResizeObserver(measure);observer.observe(document.body);}
    measure();
  });
})();
