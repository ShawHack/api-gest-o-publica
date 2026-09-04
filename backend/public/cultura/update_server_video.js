const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. POST route body variables
const postReqAnchor = `    const { titulo, tipo, formato, descricao, datasHorarios, corTituloCapa, emCartazTeatro } = req.body;`;
const postReqInjection = `    const { titulo, tipo, formato, descricao, datasHorarios, corTituloCapa, emCartazTeatro, videoUrl } = req.body;`;
content = content.replace(postReqAnchor, postReqInjection);

// 2. POST route new Post
const postNewAnchor = `      corTituloCapa, 
      datasHorarios: parsedDatas,
      emCartazTeatro: emCartazTeatro === 'true'
    });`;
const postNewInjection = `      corTituloCapa, 
      videoUrl,
      datasHorarios: parsedDatas,
      emCartazTeatro: emCartazTeatro === 'true'
    });`;
content = content.replace(postNewAnchor, postNewInjection);

// 3. PUT route body variables
const putReqAnchor = `    const { titulo, tipo, formato, descricao, datasHorarios, corTituloCapa, emCartazTeatro } = req.body;`;
const putReqInjection = `    const { titulo, tipo, formato, descricao, datasHorarios, corTituloCapa, emCartazTeatro, videoUrl } = req.body;`;
content = content.replace(putReqAnchor, putReqInjection);

// 4. PUT route update fields
const putUpdateAnchor = `    if (corTituloCapa) post.corTituloCapa = corTituloCapa;`;
const putUpdateInjection = `    if (corTituloCapa) post.corTituloCapa = corTituloCapa;
    if (videoUrl !== undefined) post.videoUrl = videoUrl;`;
content = content.replace(putUpdateAnchor, putUpdateInjection);


fs.writeFileSync(filePath, content, 'utf8');
console.log('server.js updated with videoUrl fields!');
