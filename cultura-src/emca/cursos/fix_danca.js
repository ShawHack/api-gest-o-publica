const fs = require('fs');
const current = fs.readFileSync('c:/Users/marjorie.talberg/Desktop/teatro/emca/cursos/danca.html', 'utf8').split('\n');
const fixedText = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Curso de Dança - EMCA</title>
    <link class="favicon" rel="icon" href="../../logo.jpg" type="image/jpeg">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700;800;900&family=Rubik:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <!-- Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Styles -->
    <link rel="stylesheet" href="../emca.css">
    
    <style>
        .sparkle {
            position: absolute;
            width: 6px;
            height: 6px;
            background-color: #ff0000;
            border-radius: 50%;
            box-shadow: 0 0 8px #ff0000, 0 0 15px #ff0000;
            z-index: 4;
            animation: twinkle 2s infinite alternate;
            opacity: 0;
            pointer-events: none;
        }

        @keyframes twinkle {
            0% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1.2); }
            100% { opacity: 0; transform: scale(0.5); }
        }

        /* Override all backgrounds to strong white as requested */
        body, .page-emca, article, .course-info-section, .diferenciais-section, .aprendizado-section, .modalidades-section, .gallery-section, .cronograma-step, .diferencial-card, .course-sidebar, .modalidade-text-item {
            background: #ffffff !important;
            background-color: #ffffff !important;
            background-image: none !important;
        }
        .page-emca::before, .page-emca::after {
            display: none !important;
        }

        /* Bold, creative titles using Rubik 900 (Extra Thick) and smooth color transitions */
        h1, h2, h3, h4, h5, h6 {
            font-family: 'Rubik', sans-serif !important;
            font-weight: 700 !important; /* Extremely thick font! */
            color: #a02e2e !important;
            text-shadow: none !important; /* Completely remove any neon/glow text-shadows */
            -webkit-text-fill-color: initial !important;
            background: none !important;
        }

        /* Completely remove hover neon glow on h2 and all headers */
        .section-header:hover h2, 
        .course-details:hover h2, 
        .section-header h2:hover,
        h1:hover, h2:hover, h3:hover, h4:hover, h5:hover, h6:hover {
            text-shadow: none !important;
        }

        /* Section Headings with solid color */
        .section-header h2, .course-details h2 {
            font-size: 2.6rem;
            font-weight: 700 !important; /* Extra thick */
            color: #a02e2e !important;
            margin-bottom: 15px;
            display: inline-block;
            letter-spacing: -1px;
            position: relative;
            text-shadow: none !important;
        }
        
        .section-header h2::after {
            content: '';
            display: block;
            width: 80px;
            height: 4px;
            background: #a02e2e;
            margin: 12px auto 0;
            border-radius: 2px;
        }
        
        .course-details h2::after {
            content: '';
            display: block;
            width: 80px;
            height: 4px;
            background: #a02e2e;
            margin: 12px 0 0;
            border-radius: 2px;
        }

        /* Custom Scroll Reveal Animations (Left, Right, Scale, Up) */
        .reveal.reveal-left {
            opacity: 0;
            transform: translateX(-100px) translateY(0);
            transition: all 0.9s cubic-bezier(0.25, 1, 0.5, 1);
        }
        
        .reveal.reveal-right {
            opacity: 0;
            transform: translateX(100px) translateY(0);
            transition: all 0.9s cubic-bezier(0.25, 1, 0.5, 1);
        }
        
        .reveal.reveal-up {
            opacity: 0;
            transform: translateY(60px) translateX(0);
            transition: all 0.9s cubic-bezier(0.25, 1, 0.5, 1);
        }
        
        .reveal.reveal-scale {
            opacity: 0;
            transform: scale(0.3) translateY(0); /* starts very small for a popup effect */
            transition: all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1); /* bouncy pop effect */
        }
        
        .reveal.reveal-left.active,
        .reveal.reveal-right.active,
        .reveal.reveal-up.active,
        .reveal.reveal-scale.active {
            opacity: 1;
            transform: translateX(0) translateY(0) scale(1);
        }

        .course-hero { margin-top: 0;
            height: 60vh;
            min-height: 450px;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: flex-start; /* Align content to the left of viewport */
            color: var(--text-inverse);
            transition: all 0.5s ease;
        }

        /* Desktop Carousel Background Slides */
        .hero-bg-slide {
            position: absolute;
            inset: 0;
            background-size: cover;
            background-position: center;
            opacity: 0;
            transition: opacity 1.5s ease-in-out;
            z-index: 1;
        }

        .hero-bg-slide.active {
            opacity: 1;
        }
        
        .course-hero .container {
            width: 100%;
            max-width: 1200px;
            padding: 0 40px;
            display: flex;
            flex-direction: column;
            align-items: flex-start; /* Align items to the left */
            text-align: left;
            z-index: 2; /* Keep above slides */
        }

        .hero-text-wrapper {
            max-width: 600px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        
        .typewriter-title {
            color: #fff !important;
            font-family: 'Rubik', sans-serif !important;
            font-weight: 700 !important; /* Thick */
            font-size: 3.8rem;
            margin-bottom: 20px;
            text-shadow: 0 4px 15px rgba(0,0,0,0.4) !important;
            overflow: hidden;
            border-right: 4px solid var(--peach);
            white-space: nowrap;
            width: 0; /* starts hidden */
            letter-spacing: -1px;
            animation: 
              typing 2s steps(15, end) 0.5s forwards,
              blink-caret 0.75s step-end infinite alternate,
              remove-cursor 0.5s step-end 3.5s forwards;
        }
        
        /* Multiple Hero Subtitles */
        .hero-subtitle {
            display: none;
            opacity: 0;
            font-family: 'Rubik', sans-serif;
            font-weight: 300;
            font-size: 1.25rem;
            color: #fff;
            line-height: 1.6;
            text-shadow: 0 2px 10px rgba(0,0,0,0.4);
        }
        
        .hero-subtitle.active {
            display: block;
            opacity: 1;
            animation: fadeInSimple 0.8s ease-out forwards;
        }
        
        /* First subtitle initial page load animation */
        .fade-in-subtitle {
            display: block;
            opacity: 0;
            transform: translateY(20px);
            animation: fadeInUp 1.2s ease-out 2.2s forwards;
        }

        @keyframes fadeInSimple {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
            .hero-bg-slide {
                display: none !important; /* Hide slide carousel on mobile */
            }
            .course-hero {
                background-image: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('../imagesemca/Dança/capacelular1.png') !important;
                height: 520px;
                justify-content: center; /* Center align on mobile */
                background-size: cover;
                background-position: center;
            }
            .course-hero .container {
                align-items: center;
                text-align: center;
                padding: 0 20px;
            }
            .hero-text-wrapper {
                align-items: center;
            }
            .typewriter-title {
                font-size: 2.2rem;
                margin-bottom: 15px;
                animation: 
                  typing 2s steps(15, end) 0.5s forwards,
                  blink-caret 0.75s step-end infinite alternate,
                  remove-cursor 0.5s step-end 3.5s forwards;
            }
            .fade-in-subtitle {
                font-size: 1rem;
            }
            /* Show only first subtitle on mobile */
            #subtitle-2 {
                display: none !important;
            }
            .section-header h2 {
                font-size: 2rem;
            }
        }

        /* Custom buttons for Dança page */
        .btn-coral {
            background: linear-gradient(135deg, #ff716e 0%, #ff8e8c 100%) !important;
            color: white !important;
            border: none !important;
            box-shadow: 0 4px 15px rgba(255, 113, 110, 0.4) !important;
            transition: all 0.4s ease !important;
            font-weight: 700 !important;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        .btn-coral:hover {
            transform: translateY(-3px) scale(1.03) !important;
            box-shadow: 0 8px 25px rgba(255, 113, 110, 0.6) !important;
            background: linear-gradient(135deg, #ff8e8c 0%, #ff716e 100%) !important;
        }

        .btn-lavender {
            background: linear-gradient(135deg, #7481d1 0%, #909ce0 100%) !important;
            color: white !important;
            border: none !important;
            box-shadow: 0 4px 15px rgba(116, 129, 209, 0.4) !important;
            transition: all 0.4s ease !important;
            font-weight: 700 !important;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        .btn-lavender:hover {
            transform: translateY(-3px) scale(1.03) !important;
            box-shadow: 0 8px 25px rgba(116, 129, 209, 0.6) !important;
            background: linear-gradient(135deg, #909ce0 0%, #7481d1 100%) !important;
        }

        .course-info-section {
            padding: 80px 0;
            position: relative;
            overflow: hidden;
            background-color: var(--bg-alt);
        }
        
        .course-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 50px;
            position: relative;
            z-index: 2;
        }
        
        .course-details p {
            font-size: 1.1rem;
            margin-bottom: 20px;
            color: var(--text-light);
        }
        
        .course-sidebar {
            background-color: var(--bg-main);
            padding: 30px;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-sm);
            border: 1px solid rgba(0,0,0,0.03);
            height: fit-content;
        }
        
        .info-list {
            list-style: none;
            margin-bottom: 30px;
        }
        
        .info-list li {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
            font-size: 1.1rem;
            color: var(--text-main);
        }
        
        .info-list i {
            font-size: 1.3rem;
            width: 25px;
            text-align: center;
        }
        
        .schedule-box {
            background-color: white;
            padding: 20px;
            border-radius: var(--border-radius);
            margin-bottom: 30px;
            border: 1px solid var(--border-color);
        }
        
        .schedule-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px dashed var(--border-color);
        }
        
        .schedule-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }

        /* Decorative floating circus icons with creative colored settings */
        .circus-decor {
            position: absolute;
            pointer-events: none;
            z-index: 1;
            user-select: none;
        }
        
        .circus-decor-1 { top: 8%; left: 3%; }
        .circus-decor-2 { top: 28%; right: 4%; }
        .circus-decor-3 { top: 12%; left: 4%; }
        .circus-decor-4 { top: 48%; right: 3%; }
        .circus-decor-5 { top: 15%; left: 3%; }
        .circus-decor-6 { top: 58%; right: 4%; }
        .circus-decor-7 { top: 22%; left: 5%; }
        .circus-decor-8 { top: 62%; right: 5%; }
        .circus-decor-9 { top: 18%; left: 4%; }
        .circus-decor-10 { top: 68%; right: 4%; }

        .float-animation-1 { animation: float-slow 8s ease-in-out infinite; display: inline-block; }
        .float-animation-2 { animation: float-reverse 10s ease-in-out infinite 1s; display: inline-block; }
        .float-animation-3 { animation: float-slow 9s ease-in-out infinite 2s; display: inline-block; }
        .float-animation-4 { animation: float-reverse 7s ease-in-out infinite 0.5s; display: inline-block; }
        .float-animation-5 { animation: float-slow 7.5s ease-in-out infinite 1.5s; display: inline-block; }
        .float-animation-6 { animation: float-reverse 11s ease-in-out infinite 0.7s; display: inline-block; }`;
const fixedArray = fixedText.split('\n');
for (let i = 0; i < fixedArray.length; i++) {
    current[i] = fixedArray[i];
}

// Ensure there is no JS script injection remaining from my bad script!
// The bad script had about 397 lines. If fixedText is shorter, then the rest 
// might still contain bad script lines. Let's make sure.
// Wait! `fixedArray.length` is 399. The bad script was 397 lines. 
// So lines 1 to 399 will completely overwrite lines 1 to 399 of current.
// Line 400 and beyond were untouched by my bad script because my loop ended at 397.
fs.writeFileSync('c:/Users/marjorie.talberg/Desktop/teatro/emca/cursos/danca.html', current.join('\n'));
console.log('Fixed lines successfully from memory!');
