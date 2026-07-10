# HBD Love - Enhancement TODO

## 1. Floating Hearts Background
- [x] Add #hearts-container div to index.html (behind everything)
- [x] JS: spawn heart elements continuously with random size/position/duration (every 700ms)
- [x] CSS: @keyframes floatHeart (rise + fade + sway)

## 2. Confetti Burst on "Click Me"
- [x] Add canvas-confetti CDN script to index.html
- [x] fireConfetti() called inside handlePointer when seed is clicked
- [x] Canvas overlay confetti + balloons on general canvas click

## 3. Music Toggle Button
- [x] <audio id="bgMusic"> added back to index.html
- [x] Circular #musicBtn button (♪/♫ icon) fixed bottom-right
- [x] CSS: circular button, musicPulse ring animation, playing state
- [x] JS: click toggles audio with volume fade-in (800ms) / fade-out (600ms)

## 4. Personalized Message Reveal (Birthday Girl click)
- [x] After all wishes finish typing, #wishModal shown with 600ms delay
- [x] CSS: modal with opacity + scale transition (cubic-bezier spring)
- [x] Shimmer @keyframes on wish text-shadow
- [x] Close on ✕ button or backdrop click

## 5. Contrast Enhancement
- [x] h1#mainGreeting: pure white + pink glow text-shadow
- [x] .say lines: white + pink glow + 1px shadow
- [x] Hero card: stronger backdrop-filter blur
- [x] #wishText: white + shimmer glow

## 6. Responsive Layout Cleanup
- [x] Removed all leftover unused media query rules
- [x] #text and canvas stack cleanly on mobile
- [x] Font scaling with clamp() on .say, h1, #wishText
- [x] #musicBtn resizes on mobile

## 7. Extra Touches
- [x] Body background: bgShift keyframes animates gradient (12s loop)
- [x] Sparkle overlay via body::before radial-gradient dots
- [x] Button hover: scale(1.12) + pink glow box-shadow
- [x] #wrap and #mainArea: fadeInDown / fadeInUp on load
- [x] Gradient overlay: light pink → rose gold → deep pink
