$(function () {

    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    var $confettiContainer = $('#confetti-container');
    var $balloonContainer  = $('#balloon-container');
    var $heartsContainer   = $('#hearts-container');
    var $musicBtn          = $('#musicBtn');
    var bgMusic            = document.getElementById('bgMusic');
    var musicFadeTimer     = null;
    var audioStarted       = false;

    /* ── Helpers ── */
    function randomRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /* ── Music ── */
    function fadeVolume(target, duration, onDone) {
        if (!bgMusic) return;
        clearInterval(musicFadeTimer);
        var steps    = 20;
        var interval = duration / steps;
        var start    = bgMusic.volume;
        var delta    = (target - start) / steps;
        var count    = 0;
        musicFadeTimer = setInterval(function () {
            count++;
            bgMusic.volume = Math.min(1, Math.max(0, start + delta * count));
            if (count >= steps) {
                clearInterval(musicFadeTimer);
                if (onDone) onDone();
            }
        }, interval);
    }

    $musicBtn.on('click', function () {
        if (!bgMusic) return;
        if (bgMusic.paused) {
            bgMusic.volume = 0;
            bgMusic.play().catch(function () {});
            fadeVolume(0.75, 800);
            $musicBtn.addClass('playing').text('♫');
            audioStarted = true;
        } else {
            fadeVolume(0, 600, function () { bgMusic.pause(); });
            $musicBtn.removeClass('playing').text('♪');
        }
    });

    /* ── Confetti pieces ── */
    function createConfetti(count) {
        if (isMobile) count = Math.min(count, 10);
        for (var i = 0; i < count; i++) {
            var piece = $('<span class="confetti-piece"></span>');
            var size  = randomRange(6, 10);
            piece.css({
                left:            randomRange(12, 88) + '%',
                top:             randomRange(10, 40) + '%',
                width:           size + 'px',
                height:          (size + 4) + 'px',
                backgroundColor: ['#ffe07d','#ff8fbf','#ffb8c5','#ffe6a4','#c5ffea'][randomRange(0, 4)],
                transform:       'rotate(' + randomRange(0, 360) + 'deg)'
            });
            $confettiContainer.append(piece);
            (function (el) {
                setTimeout(function () { el.remove(); }, 2200);
            })(piece);
        }
    }

    /* ── Balloons ── */
    function createBalloons(count) {
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
            balloon.on('click', function () {
                $(this).addClass('pop');
                var self = this;
                setTimeout(function () { $(self).remove(); }, 300);
            });
            $balloonContainer.append(balloon);
            (function (el) {
                setTimeout(function () { el.remove(); }, duration + 400);
            })(balloon);
        }
    }

    /* ── Floating hearts ── */
    var HEARTS = ['💖','💕','💗','💓','🌸','✨','💝'];
    function spawnHeart() {
        if (isMobile && $('.fheart').length >= 4) return;
        var el       = $('<span class="fheart"></span>');
        var duration = randomRange(isMobile ? 12 : 7, isMobile ? 20 : 14);
        el.text(HEARTS[randomRange(0, HEARTS.length - 1)]);
        el.css({
            left:              randomRange(2, 96) + '%',
            fontSize:          randomRange(14, 24) + 'px',
            animationDuration: duration + 's',
            animationDelay:    '0s'
        });
        $heartsContainer.append(el);
        setTimeout(function () { el.remove(); }, duration * 1000 + 200);
    }
    setInterval(spawnHeart, isMobile ? 3500 : 1800);
    for (var h = 0; h < (isMobile ? 1 : 3); h++) {
        setTimeout(spawnHeart, h * 800);
    }

    /* ── Canvas click: confetti + balloons ── */
    $('#canvas').on('click', function () {
        createConfetti(isMobile ? 6 : 20);
        createBalloons(isMobile ? 2 : 5);
    });

    /* ── Wish modal close ── */
    $('#wishClose, #wishModal').on('click', function (e) {
        if (e.target === this) $('#wishModal').removeClass('show');
    });

    /* ── Surprise modal ── */
    // Only shown after tree animation finishes (triggered from index.html via showSurpriseModal)
    window.showSurpriseModal = function () {
        var seen = false;
        try { seen = localStorage.getItem('birthday_surprise_seen') === 'true'; } catch (e) {}
        if (window.sessionStorage && sessionStorage.getItem('pageScrolled') === 'true') {
            seen = true;
            sessionStorage.removeItem('pageScrolled');
        }
        if (!seen) {
            $('#surpriseModal').addClass('show');
        }
    };

    function rememberSurprise() {
        try { localStorage.setItem('birthday_surprise_seen', 'true'); } catch (e) {}
    }

    $('#yesBtn').on('click', function () {
        rememberSurprise();
        $('#surpriseModal').removeClass('show');
        createConfetti(isMobile ? 6 : 18);
        createBalloons(isMobile ? 2 : 5);
    });

    $('#noBtn').on('click', function () {
        rememberSurprise();
        $('#surpriseModal').removeClass('show');
    });

    /* ── Initial confetti on load ── */
    createConfetti(isMobile ? 6 : 18);
});
