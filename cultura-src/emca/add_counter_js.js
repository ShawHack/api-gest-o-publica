const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.js');
let content = fs.readFileSync(filePath, 'utf8');

const counterCode = `
    /* =========================================
       Number Counter Animation
    ========================================= */
    const counters = document.querySelectorAll('.count-up');
    const speed = 200; // The lower the slower

    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const updateCount = () => {
                    const target = +counter.getAttribute('data-target');
                    const count = +counter.innerText;
                    
                    // Lower inc to slow and higher to fast
                    const inc = target / speed;

                    // Check if target is reached and increment
                    if (count < target) {
                        // Add inc to count and output in counter
                        counter.innerText = Math.ceil(count + inc);
                        // Call function every ms
                        setTimeout(updateCount, 15);
                    } else {
                        counter.innerText = target;
                    }
                };
                
                updateCount();
                observer.unobserve(counter); // Only run once
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
`;

if (!content.includes('Number Counter Animation')) {
    content += '\n' + counterCode;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Counter JS added!');
} else {
    console.log('Counter JS already exists.');
}
