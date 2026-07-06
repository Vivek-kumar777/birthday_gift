(function($) {
    $.fn.typewriter = function() {
        this.each(function() {
            var $ele = $(this), str = $ele.html(), progress = 0;
            $ele.html('');
            var lastTime = Date.now();
            
            function update() {
                var current = Date.now();
                if (current - lastTime >= 60) {
                    var currentChar = str.substr(progress, 1);
                    if (currentChar == '<') {
                        progress = str.indexOf('>', progress) + 1;
                    } else {
                        progress++;
                    }
                    $ele.html(str.substring(0, progress) + (progress & 1 ? '_' : ''));
                    lastTime = current;
                    
                    if (progress < str.length) {
                        requestAnimationFrame(update);
                    }
                } else {
                    requestAnimationFrame(update);
                }
            }
            
            requestAnimationFrame(update);
        });
        return this;
    };
})(jQuery);
