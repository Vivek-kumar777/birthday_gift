$(function() {
    var isMobile          = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    var $balloonContainer  = $('#balloon-container');
    var $confettiContainer = $('#confetti-container');
    var $heartsContainer   = $('#hearts-container');
    var $musicBtn          = $('#musicBtn');
    var bgMusic            = $('#bgMusic')[0];
    var musicFadeTimer     = null;

    /* ── Helpers ── */
    function randomRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /* ── Confetti pieces (canvas overlay) ── */
    function createConfetti(count) {
        if (isMobile) {
            count = Math.max(4, Math.min(count, 10));
        }
        for (var i = 0; i < count; i++) {
            var piece = $('<span class="confetti-piece"></span>');
            var size  = randomRange(6, 10);
            piece.css({
                left:            randomRange(12, 88) + '%',
                top:             randomRange(10, 40) + '%',
                width:           size + 'px',
                height:          (size + 4) + 'px',
                backgroundColor: ['#ffe07d','#ff8fbf','#ffb8c5','#ffe6a4','#c5ffea'][randomRange(0, 4)],
                transform:       'rotate(' + randomRange(0, 360) + 'deg)',
                opacity:         isMobile ? 0.75 : 0.95
            });
            $confettiContainer.append(piece);
            (function(el) { setTimeout(function() { el.remove(); }, isMobile ? 1500 : 2200); })(piece);
        }
    }

    /* ── Balloons ── */
    function createBalloons(count) {
        if (isMobile) return;
        count = Math.min(count, 6);
        for (var i = 0; i < count; i++) {
            var balloon  = $('<span class="balloon"></span>');
            var duration = randomRange(5000, 7500);
            balloon.css({
                left:              randomRange(10, 85) + '%',
                animationDuration: duration + 'ms',
                background:        'linear-gradient(180deg, ' +
                    ['#ff8fbf','#ffbf8f','#a0d8ff','#f2b7ff'][randomRange(0, 3)] +
                    ' 0%, rgba(255,255,255,0.9) 100%)'
            });
            balloon.on('click', function() {
                $(this).addClass('pop');
                var self = this;
                setTimeout(function() { $(self).remove(); }, 300);
            });
            $balloonContainer.append(balloon);
            (function(el) { setTimeout(function() { el.remove(); }, duration + 400); })(balloon);
        }
    }

    /* ── Floating background hearts ── */
    var HEARTS = ['💖','💕','💗','💓','🌸','✨','💝'];
    function spawnHeart() {
        if (isMobile && ($('.fheart').length >= 4 || Math.random() > 0.72)) return;
        var el = $('<span class="fheart"></span>');
        var duration = randomRange(isMobile ? 12 : 7, isMobile ? 20 : 14);
        el.text(HEARTS[randomRange(0, HEARTS.length - 1)]);
        el.css({
            left:              randomRange(2, 96) + '%',
            fontSize:          randomRange(isMobile ? 16 : 14, isMobile ? 22 : 24) + 'px',
            animationDuration: duration + 's',
            animationDelay:    '0s'
        });
        $heartsContainer.append(el);
        setTimeout(function() { el.remove(); }, duration * 1000 + 200);
    }
    // Spawn one heart every 4200ms on mobile, 2200ms on desktop
    setInterval(spawnHeart, isMobile ? 4200 : 2200);
    // Seed only 1 immediately on mobile
    for (var h = 0; h < (isMobile ? 1 : 3); h++) {
        setTimeout(spawnHeart, h * 1000);
    }

    /* ── Music toggle with volume fade ── */
    function fadeVolume(target, duration, onDone) {
        if (!bgMusic) return;
        clearInterval(musicFadeTimer);
        var steps    = 20;
        var interval = duration / steps;
        var start    = bgMusic.volume;
        var delta    = (target - start) / steps;
        var count    = 0;
        musicFadeTimer = setInterval(function() {
            count++;
            bgMusic.volume = Math.min(1, Math.max(0, start + delta * count));
            if (count >= steps) {
                clearInterval(musicFadeTimer);
                if (onDone) onDone();
            }
        }, interval);
    }

    $musicBtn.on('click', function() {
        if (!bgMusic) return;
        if (bgMusic.paused) {
            bgMusic.volume = 0;
            bgMusic.play();
            fadeVolume(0.75, 800);
            $musicBtn.addClass('playing').text('♫');
        } else {
            fadeVolume(0, 600, function() { bgMusic.pause(); });
            $musicBtn.removeClass('playing').text('♪');
        }
    });

    /* ── Canvas click: confetti + balloons ── */
    $('#canvas').on('click', function() {
        createConfetti(isMobile ? 6 : 20);
        createBalloons(6);
    });

    /* ── Wish modal close ── */
    $('#wishClose, #wishModal').on('click', function(e) {
        if (e.target === this) $('#wishModal').removeClass('show');
    });

    /* ── Initial confetti burst on load ── */
    createConfetti(isMobile ? 6 : 18);
});
