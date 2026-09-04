const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cursos', 'danca.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace the css grid container with carousel container
const oldGridStart = /<div class="css-grid-gallery reveal reveal-scale" style="display: grid; grid-template-columns: repeat\(auto-fill, minmax\(280px, 1fr\)\); gap: 20px;">/;

const newCarouselStart = `
<div class="carousel-container danca-carousel-container" style="position: relative; overflow: hidden; max-width: 1200px; margin: 0 auto; padding: 20px 0;">
    <div class="danca-galeria-track" style="display: flex; gap: 30px; transition: transform 0.5s ease;">
`;

content = content.replace(oldGridStart, newCarouselStart);

// 2. Replace the end of the grid with the end of the track and add buttons
const oldGridEnd = /<\/div>\s*<\/div>\s*<\/section>/;
const newCarouselEnd = `
    </div>
    <button class="carousel-btn prev-btn-danca" style="position: absolute; top: 50%; transform: translateY(-50%); left: 10px; width: 52px; height: 52px; background: white; color: var(--lavender); border: 2px solid rgba(255, 213, 201, 0.4); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.08); z-index: 10;"><i data-lucide="chevron-left" style="pointer-events: none; stroke: currentColor;"></i></button>
    <button class="carousel-btn next-btn-danca" style="position: absolute; top: 50%; transform: translateY(-50%); right: 10px; width: 52px; height: 52px; background: white; color: var(--lavender); border: 2px solid rgba(255, 213, 201, 0.4); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.08); z-index: 10;"><i data-lucide="chevron-right" style="pointer-events: none; stroke: currentColor;"></i></button>
</div>
</div>
</section>
`;

content = content.replace(oldGridEnd, newCarouselEnd);

// 3. Update the gallery items to be carousel items
content = content.replace(/class="grid-gallery-item"/g, 'class="danca-galeria-item"');
content = content.replace(/height: 250px;"/g, 'height: 250px; flex: 0 0 calc(33.333% - 20px);"');

// 4. Inject JS to handle the new carousel
const carouselJS = `
<script>
    document.addEventListener("DOMContentLoaded", function() {
        const track = document.querySelector('.danca-galeria-track');
        const prevBtn = document.querySelector('.prev-btn-danca');
        const nextBtn = document.querySelector('.next-btn-danca');
        if (!track || !prevBtn || !nextBtn) return;

        let currentIndex = 0;
        let itemsPerView = 3;

        function updateItemsPerView() {
            if (window.innerWidth <= 768) itemsPerView = 1;
            else if (window.innerWidth <= 1024) itemsPerView = 2;
            else itemsPerView = 3;
            
            const items = document.querySelectorAll('.danca-galeria-item');
            items.forEach(item => {
                item.style.flex = \`0 0 calc(\${100 / itemsPerView}% - \${(30 * (itemsPerView - 1)) / itemsPerView}px)\`;
            });
            updateCarousel();
        }

        function updateCarousel() {
            const items = document.querySelectorAll('.danca-galeria-item');
            const maxIndex = Math.max(0, items.length - itemsPerView);
            if (currentIndex > maxIndex) currentIndex = maxIndex;
            
            const itemWidth = items[0].offsetWidth;
            const gap = 30;
            track.style.transform = \`translateX(-\${currentIndex * (itemWidth + gap)}px)\`;
        }

        nextBtn.addEventListener('click', () => {
            const items = document.querySelectorAll('.danca-galeria-item');
            const maxIndex = Math.max(0, items.length - itemsPerView);
            if (currentIndex < maxIndex) {
                currentIndex++;
                updateCarousel();
            } else {
                currentIndex = 0;
                updateCarousel();
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            } else {
                const items = document.querySelectorAll('.danca-galeria-item');
                currentIndex = Math.max(0, items.length - itemsPerView);
                updateCarousel();
            }
        });

        window.addEventListener('resize', updateItemsPerView);
        updateItemsPerView();
        
        // Ensure icons are loaded for the new buttons
        if(window.lucide) {
            window.lucide.createIcons();
        }
    });
</script>
`;

// Inject JS before closing body
content = content.replace('</body>', carouselJS + '\n</body>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Grid gallery converted to carousel in danca.html');
