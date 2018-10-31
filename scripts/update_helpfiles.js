const fs = require('fs');

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function div(text, styleClass, value) {
    if (value === undefined) {
        return;
    }
    text.push(`<div class='${styleClass}'>${escapeHtml(value)}</div>`);
}

function span(text, styleClass, value) {
    if (value === undefined) {
        return;
    }
    text.push(`<span class='${styleClass}'>${escapeHtml(value)}</span>`);
}

function writeFiles(record) {
    let filename = record.command.replace(/\[.*?\]/g, 'x').replace(/ /g, '_');
    if (!fs.existsSync(record.plugin)) {
        // create folder for at least the index file, and perhaps the content file
        fs.mkdirSync(record.plugin);
    }
    let indexPath = `${record.plugin}/${filename}.index`;
    let indexCommand = `!${record.plugin} ${record.command}`;
    if (record.common !== undefined) {
        record.plugin = record.common;
        if (!fs.existsSync(record.common)) {
            fs.mkdirSync(record.common);
        }
    }
    let id = `${record.plugin}/${filename}`;
    if (!fs.existsSync(indexPath)) {
        fs.writeFileSync(indexPath, `<li><a href='#${escapeHtml(id)}'>${indexCommand}</a></li>`, 'utf8');
    }   
    let path = `${id}.content`;        
    if (!fs.existsSync(path)) {
        let text = [];
        text.push(`<div class='title'>`);
        span(text, 'plugin', `!${record.plugin}`);
        text.push(`<span class='command' id='${escapeHtml(id)}'>${escapeHtml(record.command)}</span>`);
        if (record.format !== undefined) {
            span(text, 'format', `[${record.format}]`);
        }
        text.push(`</div>`);
        if (record.common === 'PLUGIN') {
            div(text, 'description', `This commmand is supported by multiple der20 plugins.  Use the name of the plugin instead of the word 'PLUGIN' when using this command.`)
        }
        div(text, 'description', '');
        div(text, 'validation', record.validation);
        fs.writeFileSync(path, text.join('\n'), 'utf8');
    }
}

let buffers = [];
process.stdin
    .on('data', data => {
        buffers.push(data);
    })
    .on('end', () => {
        let json = buffers.join('');
        let helpfiles = JSON.parse(json);
        if (helpfiles === undefined || helpfiles === null) {
            throw new Error('input is not valid JSON');
        }
        for (let record of helpfiles) {
            writeFiles(record);
        }
    });
