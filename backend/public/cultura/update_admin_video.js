const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'admin.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Change media query
content = content.replace('@media (max-width: 1024px) {\n      .dashboard-grid { grid-template-columns: 1fr; }', '@media (max-width: 800px) {\n      .dashboard-grid { grid-template-columns: 1fr; }');

// 2. Add video field HTML
const htmlAnchor = `                <!-- GALLERY UPLOAD -->`;
const htmlInjection = `                <!-- VIDEO URL -->
                <div class="form-group">
                  <label><i data-lucide="youtube" style="width:16px; height:16px; margin-right:5px; color:#ef4444;"></i>URL do Vídeo (YouTube / Vimeo)</label>
                  <input type="url" id="videoUrl" placeholder="Ex: https://www.youtube.com/watch?v=...">
                </div>

`;
if (!content.includes('id="videoUrl"')) {
    content = content.replace(htmlAnchor, htmlInjection + htmlAnchor);
}

// 3. Add videoUrl to editPost function
const editPostAnchor = `        document.getElementById('emCartazTeatro').checked = post.emCartazTeatro || false;`;
const editPostInjection = `        document.getElementById('videoUrl').value = post.videoUrl || '';\n`;
if (!content.includes("document.getElementById('videoUrl').value = post.videoUrl")) {
    content = content.replace(editPostAnchor, editPostAnchor + '\n' + editPostInjection);
}

// 4. Reset videoUrl in cancelEditPost
const cancelEditAnchor = `      document.getElementById('postForm').reset();`;
const cancelEditInjection = `      document.getElementById('videoUrl').value = '';\n`;
if (!content.includes("document.getElementById('videoUrl').value = ''")) {
    content = content.replace(cancelEditAnchor, cancelEditAnchor + '\n' + cancelEditInjection);
}

// 5. Add to form submit capturing
const submitCaptureAnchor = `      const descricao = document.getElementById('descricao').value;`;
const submitCaptureInjection = `      const videoUrl = document.getElementById('videoUrl').value;\n`;
if (!content.includes("const videoUrl = document.getElementById('videoUrl').value;")) {
    content = content.replace(submitCaptureAnchor, submitCaptureAnchor + '\n' + submitCaptureInjection);
}

// 6. Add to formData
const formDataAnchor = `      formData.append('descricao', descricao);`;
const formDataInjection = `      formData.append('videoUrl', videoUrl);\n`;
if (!content.includes("formData.append('videoUrl', videoUrl);")) {
    content = content.replace(formDataAnchor, formDataAnchor + '\n' + formDataInjection);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('admin.html updated for video support and side-by-side layout!');
